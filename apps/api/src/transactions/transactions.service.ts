import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  AuditAction,
  DepositTransaction,
  FraudDecision,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { ClientFraudHints, FraudTransactionClient } from "../fraud/fraud.types";
import { FraudService } from "../fraud/fraud.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { CustomerTransactionQueryDto } from "./dto/customer-transaction-query.dto";
import {
  createStatementCsv,
  createStatementPdf,
  StatementRow,
} from "./statement-export";
import {
  TransactionVerificationDelivery,
  TransactionVerificationMailer,
} from "./transaction-verification-mailer";

const VERIFICATION_CODE_VALIDITY_MS = 10 * 60 * 1000;
const VERIFICATION_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

const customerTransferInclude = {
  sourceAccount: {
    select: {
      accountNumber: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  destinationAccount: {
    select: {
      accountNumber: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  fraudAssessment: true,
} satisfies Prisma.TransactionInclude;

type CustomerTransferRecord = Prisma.TransactionGetPayload<{
  include: typeof customerTransferInclude;
}>;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudService: FraudService,
    private readonly config: ConfigService,
    private readonly verificationMailer: TransactionVerificationMailer,
  ) {}

  async transfer(
    senderId: string,
    idempotencyKey: string,
    dto: CreateTransferDto,
    hints: ClientFraudHints = { source: "CLIENT_HEADERS" },
  ) {
    const amount = this.toAmount(dto.amount);
    const requestHash = this.createRequestHash(dto);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const sender = await tx.account.findUnique({
          where: { userId: senderId },
          include: {
            user: { select: { email: true, firstName: true } },
          },
        });
        if (!sender || sender.status !== AccountStatus.ACTIVE)
          throw new BadRequestException("Sender account is unavailable");
        const existing = await tx.transaction.findUnique({
          where: {
            sourceAccountId_idempotencyKey: {
              sourceAccountId: sender.id,
              idempotencyKey,
            },
          },
        });
        if (existing)
          return this.validateIdempotentRequest(
            existing.requestHash,
            requestHash,
            existing,
          );
        const recipient = await tx.account.findUnique({
          where: { accountNumber: dto.destinationAccountNumber },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        });
        if (!recipient || recipient.status !== AccountStatus.ACTIVE)
          throw new NotFoundException("Destination account not found");
        if (
          sender.id === recipient.id ||
          sender.currency !== recipient.currency
        )
          throw new BadRequestException("Invalid destination account");
        const transaction = await tx.transaction.create({
          data: {
            sourceAccountId: sender.id,
            destinationAccountId: recipient.id,
            idempotencyKey,
            requestHash,
            amount,
            reference: randomUUID(),
            description: dto.description,
            status: TransactionStatus.PENDING,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: senderId,
            action: AuditAction.TRANSFER_CREATED,
            entityType: "Transaction",
            entityId: transaction.id,
          },
        });
        const fraud = await this.fraudService.assess(
          tx,
          senderId,
          sender.id,
          amount.toNumber(),
          hints,
        );
        await tx.fraudAssessment.create({
          data: { transactionId: transaction.id, ...fraud },
        });
        await tx.auditLog.create({
          data: {
            userId: senderId,
            action: AuditAction.FRAUD_ASSESSMENT_GENERATED,
            entityType: "FraudAssessment",
            entityId: transaction.id,
            metadata: {
              riskScore: fraud.riskScore,
              riskLevel: fraud.riskLevel,
              reasons: fraud.reasons,
            },
          },
        });
        await this.recordClientFraudHints(tx, senderId, hints);
        if (fraud.decision === FraudDecision.HOLD) {
          const held = await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.HELD },
          });
          await tx.notification.createMany({
            data: [
              {
                userId: senderId,
                type: "FRAUD_ALERT",
                title: "Fraud warning",
                message: "Unusual activity was detected on your transfer.",
              },
              {
                userId: senderId,
                type: "TRANSACTION_UPDATE",
                title: "Transfer held for review",
                message: "Your transfer is being reviewed for security.",
              },
            ],
          });
          await tx.auditLog.create({
            data: {
              userId: senderId,
              action: AuditAction.FRAUD_ALERT_GENERATED,
              entityType: "Notification",
              entityId: transaction.id,
            },
          });
          await tx.auditLog.create({
            data: {
              userId: senderId,
              action: AuditAction.TRANSFER_HELD,
              entityType: "Transaction",
              entityId: transaction.id,
            },
          });
          return held;
        }
        if (fraud.decision === FraudDecision.VERIFY) {
          const code = this.createVerificationCode();
          const codeHash = this.hashVerificationCode(transaction.id, code);
          await tx.transactionVerificationCode.create({
            data: {
              transactionId: transaction.id,
              codeHash,
              expiresAt: new Date(Date.now() + VERIFICATION_CODE_VALIDITY_MS),
            },
          });
          await tx.auditLog.create({
            data: {
              userId: senderId,
              action: AuditAction.TRANSFER_VERIFICATION_CODE_SENT,
              entityType: "Transaction",
              entityId: transaction.id,
            },
          });
          await this.verificationMailer.queue(tx, {
            transactionId: transaction.id,
            codeHash,
            email: sender.user.email,
            firstName: sender.user.firstName,
            code,
            amount: amount.toFixed(2),
            currency: sender.currency,
            recipientName: `${recipient.user.firstName} ${recipient.user.lastName}`,
          });
          return transaction;
        }
        return this.completeTransfer(
          tx,
          transaction.id,
          sender.id,
          recipient.id,
          amount,
          senderId,
          senderId,
        );
      });
      this.verificationMailer.scheduleDelivery();
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.prisma.transaction.findFirst({
          where: { sourceAccount: { userId: senderId }, idempotencyKey },
        });
        if (existing)
          return this.validateIdempotentRequest(
            existing.requestHash,
            requestHash,
            existing,
          );
      }
      await this.prisma.auditLog.create({
        data: {
          userId: senderId,
          action: AuditAction.TRANSFER_FAILED,
          entityType: "Transaction",
          metadata: { destinationAccountNumber: dto.destinationAccountNumber },
        },
      });
      throw error;
    }
  }

  async verify(senderId: string, transactionId: string, code: string) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          sourceAccount: { userId: senderId },
          status: TransactionStatus.PENDING,
        },
        include: { fraudAssessment: true, verificationCode: true },
      });
      if (
        !transaction ||
        transaction.fraudAssessment?.decision !== FraudDecision.VERIFY
      )
        throw new NotFoundException("Transfer awaiting verification not found");
      const verificationCode = transaction.verificationCode;
      if (!verificationCode) {
        return {
          error: "Request a new verification code to continue this transfer.",
        } as const;
      }
      if (verificationCode.expiresAt <= new Date()) {
        await tx.transactionVerificationCode.deleteMany({
          where: { id: verificationCode.id },
        });
        await this.recordVerificationFailure(tx, senderId, transaction.id, {
          reason: "EXPIRED",
        });
        return {
          error: "This verification code has expired. Request a new code.",
        } as const;
      }
      if (verificationCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        return {
          error: "Too many incorrect attempts. Request a new code.",
        } as const;
      }
      if (
        !this.matchesVerificationCode(
          transaction.id,
          code,
          verificationCode.codeHash,
        )
      ) {
        const nextAttempts = verificationCode.attempts + 1;
        await tx.transactionVerificationCode.updateMany({
          where: {
            id: verificationCode.id,
            codeHash: verificationCode.codeHash,
          },
          data: { attempts: { increment: 1 } },
        });
        await this.recordVerificationFailure(tx, senderId, transaction.id, {
          reason: "INCORRECT_CODE",
          attempts: nextAttempts,
        });
        const remaining = MAX_VERIFICATION_ATTEMPTS - nextAttempts;
        return {
          error:
            remaining > 0
              ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Too many incorrect attempts. Request a new code.",
        } as const;
      }

      const consumed = await tx.transactionVerificationCode.deleteMany({
        where: { id: verificationCode.id, codeHash: verificationCode.codeHash },
      });
      if (consumed.count !== 1) {
        return {
          error: "This verification code has already been used.",
        } as const;
      }
      await tx.auditLog.create({
        data: {
          userId: senderId,
          action: AuditAction.TRANSFER_VERIFICATION_SUCCEEDED,
          entityType: "Transaction",
          entityId: transaction.id,
        },
      });
      const completed = await this.completeTransfer(
        tx,
        transaction.id,
        transaction.sourceAccountId,
        transaction.destinationAccountId,
        transaction.amount,
        senderId,
        senderId,
      );
      return { transaction: completed } as const;
    });
    if ("error" in outcome) throw new BadRequestException(outcome.error);
    return outcome.transaction;
  }

  async resendVerificationCode(senderId: string, transactionId: string) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          sourceAccount: { userId: senderId },
          status: TransactionStatus.PENDING,
        },
        include: {
          fraudAssessment: true,
          verificationCode: true,
          sourceAccount: {
            include: { user: { select: { email: true, firstName: true } } },
          },
          destinationAccount: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (
        !transaction ||
        transaction.fraudAssessment?.decision !== FraudDecision.VERIFY
      ) {
        throw new NotFoundException("Transfer awaiting verification not found");
      }

      if (
        transaction.verificationCode &&
        transaction.verificationCode.attempts < MAX_VERIFICATION_ATTEMPTS &&
        transaction.verificationCode.sentAt.getTime() +
          VERIFICATION_CODE_RESEND_COOLDOWN_MS >
          Date.now()
      ) {
        return {
          message:
            "A verification code was sent recently. Please wait a minute before requesting another.",
        } as const;
      }

      const code = this.createVerificationCode();
      const codeHash = this.hashVerificationCode(transaction.id, code);
      await tx.transactionVerificationCode.upsert({
        where: { transactionId: transaction.id },
        create: {
          transactionId: transaction.id,
          codeHash,
          expiresAt: new Date(Date.now() + VERIFICATION_CODE_VALIDITY_MS),
        },
        update: {
          codeHash,
          attempts: 0,
          expiresAt: new Date(Date.now() + VERIFICATION_CODE_VALIDITY_MS),
          sentAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: senderId,
          action: AuditAction.TRANSFER_VERIFICATION_CODE_SENT,
          entityType: "Transaction",
          entityId: transaction.id,
          metadata: { resent: true },
        },
      });
      const delivery = {
        transactionId: transaction.id,
        codeHash,
        email: transaction.sourceAccount.user.email,
        firstName: transaction.sourceAccount.user.firstName,
        code,
        amount: transaction.amount.toFixed(2),
        currency: transaction.sourceAccount.currency,
        recipientName: `${transaction.destinationAccount.user.firstName} ${transaction.destinationAccount.user.lastName}`,
      } satisfies TransactionVerificationDelivery;
      await this.verificationMailer.queue(tx, delivery);
      return {
        message: "We sent a new verification code to your email address.",
      } as const;
    });
    this.verificationMailer.scheduleDelivery();

    return { message: outcome.message };
  }

  async approveHeld(adminId: string, transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reserved = await tx.transaction.updateMany({
        where: { id: transactionId, status: TransactionStatus.HELD },
        data: { status: TransactionStatus.PENDING },
      });
      if (reserved.count !== 1)
        throw new BadRequestException(
          "Held transaction has already been processed",
        );
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { sourceAccount: { select: { userId: true } } },
      });
      if (!transaction) throw new NotFoundException("Transaction not found");
      await this.completeTransfer(
        tx,
        transaction.id,
        transaction.sourceAccountId,
        transaction.destinationAccountId,
        transaction.amount,
        adminId,
        transaction.sourceAccount.userId,
      );
      const completed = await tx.transaction.update({
        where: { id: transaction.id },
        data: { reviewedAt: new Date(), reviewedById: adminId },
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: AuditAction.TRANSACTION_APPROVED,
          entityType: "Transaction",
          entityId: transactionId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: AuditAction.ADMIN_REVIEW_PERFORMED,
          entityType: "Transaction",
          entityId: transactionId,
          metadata: { decision: "APPROVED" },
        },
      });
      return completed;
    });
  }

  async rejectHeld(adminId: string, transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, status: TransactionStatus.HELD },
        include: { sourceAccount: { select: { userId: true } } },
      });
      if (!transaction)
        throw new BadRequestException(
          "Held transaction has already been processed",
        );
      const rejected = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: adminId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: AuditAction.TRANSACTION_REJECTED,
          entityType: "Transaction",
          entityId: transactionId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: AuditAction.ADMIN_REVIEW_PERFORMED,
          entityType: "Transaction",
          entityId: transactionId,
          metadata: { decision: "REJECTED" },
        },
      });
      await tx.notification.create({
        data: {
          userId: transaction.sourceAccount.userId,
          type: "TRANSACTION_UPDATE",
          title: "Transfer rejected",
          message: "Your held transfer was rejected after security review.",
        },
      });
      return rejected;
    });
  }

  async list(userId: string) {
    return this.customerActivity(userId, {});
  }

  async listPage(userId: string, query: CustomerTransactionQueryDto) {
    const items = await this.customerActivity(userId, query);
    const start = (query.page - 1) * query.limit;
    const moneyIn = items
      .filter(
        (item) =>
          item.direction === "CREDIT" &&
          item.status === TransactionStatus.COMPLETED,
      )
      .reduce((total, item) => total.plus(item.amount), new Prisma.Decimal(0));
    const moneyOut = items
      .filter(
        (item) =>
          item.direction === "DEBIT" &&
          item.status === TransactionStatus.COMPLETED,
      )
      .reduce((total, item) => total.plus(item.amount), new Prisma.Decimal(0));
    return {
      data: items.slice(start, start + query.limit),
      total: items.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(items.length / query.limit)),
      summary: {
        moneyIn: moneyIn.toFixed(2),
        moneyOut: moneyOut.toFixed(2),
      },
    };
  }

  async exportStatement(
    userId: string,
    format: string,
    query: CustomerTransactionQueryDto,
  ) {
    if (format !== "csv" && format !== "pdf") {
      throw new BadRequestException("Statement format must be csv or pdf");
    }
    const account = await this.prisma.account.findUnique({
      where: { userId },
      select: {
        accountNumber: true,
        currency: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!account) throw new NotFoundException("Bank account not found");
    const items = await this.customerActivity(userId, query);
    const rows: StatementRow[] = items.map((item) => ({
      date: item.createdAt,
      type: item.kind,
      direction: item.direction,
      description:
        item.description || item.counterparty.name || "Account activity",
      reference: item.reference,
      status: item.status,
      amount: item.amount.toFixed(2),
      balanceAfter: item.balanceAfter?.toFixed(2) ?? "",
    }));
    const generatedAt = new Date();
    const metadata = {
      customerName: `${account.user.firstName} ${account.user.lastName}`,
      accountNumber: account.accountNumber,
      currency: account.currency,
      generatedAt,
      periodLabel:
        query.from || query.to
          ? `${query.from ?? "Account opening"} to ${query.to ?? generatedAt.toISOString().slice(0, 10)}`
          : "All available activity",
    };
    const fileName = `nuel-statement-${generatedAt.toISOString().slice(0, 10)}.${format}`;
    return format === "csv"
      ? {
          data: createStatementCsv(metadata, rows),
          fileName,
          mimeType: "text/csv; charset=utf-8",
        }
      : {
          data: createStatementPdf(metadata, rows),
          fileName,
          mimeType: "application/pdf",
        };
  }

  private async customerActivity(
    userId: string,
    filters: Pick<
      CustomerTransactionQueryDto,
      "status" | "direction" | "query" | "from" | "to"
    >,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException("Bank account not found");

    const createdAt = this.activityDateFilter(filters.from, filters.to);
    const ownership: Prisma.TransactionWhereInput =
      filters.direction === "DEBIT"
        ? { sourceAccountId: account.id }
        : filters.direction === "CREDIT"
          ? {
              destinationAccountId: account.id,
              status: TransactionStatus.COMPLETED,
            }
          : {
              OR: [
                { sourceAccountId: account.id },
                {
                  destinationAccountId: account.id,
                  status: TransactionStatus.COMPLETED,
                },
              ],
            };
    const includeDeposits =
      filters.direction !== "DEBIT" &&
      (!filters.status || filters.status === TransactionStatus.COMPLETED);

    const [transfers, deposits] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          AND: [ownership],
          status: filters.status,
          createdAt,
        },
        include: customerTransferInclude,
      }),
      includeDeposits
        ? this.prisma.depositTransaction.findMany({
            where: {
              accountId: account.id,
              status: TransactionStatus.COMPLETED,
              createdAt,
            },
          })
        : Promise.resolve([]),
    ]);

    const items = [
      ...transfers.map((transaction) =>
        this.toCustomerTransfer(transaction, account.id),
      ),
      ...deposits.map((deposit) => this.toCustomerDeposit(deposit)),
    ].sort(
      (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
    );
    const search = filters.query?.trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) =>
      [
        item.reference,
        item.description,
        item.kind,
        item.direction,
        item.status,
        item.counterparty.name,
        item.counterparty.accountNumber,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(search)),
    );
  }

  private activityDateFilter(
    from?: string,
    to?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const filter: Prisma.DateTimeFilter = {};
    if (from) filter.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        end.setUTCDate(end.getUTCDate() + 1);
        filter.lt = end;
      } else {
        filter.lte = end;
      }
    }
    if (
      filter.gte instanceof Date &&
      ((filter.lt instanceof Date && filter.gte >= filter.lt) ||
        (filter.lte instanceof Date && filter.gte > filter.lte))
    ) {
      throw new BadRequestException(
        "Statement start date must be before end date",
      );
    }
    return filter;
  }

  async getDetail(userId: string, transactionId: string) {
    const account = await this.prisma.account.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException("Bank account not found");

    const transfer = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          { sourceAccountId: account.id },
          {
            destinationAccountId: account.id,
            status: TransactionStatus.COMPLETED,
          },
        ],
      },
      include: customerTransferInclude,
    });
    if (transfer) return this.toCustomerTransfer(transfer, account.id);

    const deposit = await this.prisma.depositTransaction.findFirst({
      where: {
        id: transactionId,
        accountId: account.id,
        status: TransactionStatus.COMPLETED,
      },
    });
    if (deposit) return this.toCustomerDeposit(deposit);
    throw new NotFoundException("Transaction not found");
  }

  private async completeTransfer(
    tx: FraudTransactionClient,
    transactionId: string,
    sourceAccountId: string,
    destinationAccountId: string,
    amount: Prisma.Decimal,
    auditUserId: string,
    senderUserId: string,
  ) {
    const debit = await tx.account.updateMany({
      where: {
        id: sourceAccountId,
        status: AccountStatus.ACTIVE,
        balance: { gte: amount },
      },
      data: { balance: { decrement: amount } },
    });
    if (debit.count !== 1)
      throw new BadRequestException("Insufficient account balance");
    const recipientAccount = await tx.account.update({
      where: { id: destinationAccountId, status: AccountStatus.ACTIVE },
      data: { balance: { increment: amount } },
      select: { userId: true, currency: true },
    });
    const transaction = await tx.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.COMPLETED, completedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: auditUserId,
        action: AuditAction.TRANSFER_COMPLETED,
        entityType: "Transaction",
        entityId: transactionId,
      },
    });
    await tx.notification.createMany({
      data: [
        {
          userId: senderUserId,
          type: "TRANSACTION_UPDATE",
          title: "Transfer completed",
          message: "Your transfer was completed successfully.",
        },
        {
          userId: recipientAccount.userId,
          type: "TRANSACTION_UPDATE",
          title: "Money received",
          message: `You received ${amount.toFixed(2)} ${recipientAccount.currency} in your account.`,
        },
      ],
    });
    return transaction;
  }

  private toCustomerTransfer(
    transaction: CustomerTransferRecord,
    accountId: string,
  ) {
    const direction =
      transaction.sourceAccountId === accountId
        ? ("DEBIT" as const)
        : ("CREDIT" as const);
    const counterpartyAccount =
      direction === "DEBIT"
        ? transaction.destinationAccount
        : transaction.sourceAccount;
    return {
      id: transaction.id,
      kind: "TRANSFER" as const,
      direction,
      amount: transaction.amount,
      reference: transaction.reference,
      description: transaction.description,
      status: transaction.status,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      balanceAfter: null,
      counterparty: {
        name: `${counterpartyAccount.user.firstName} ${counterpartyAccount.user.lastName}`,
        accountNumber: counterpartyAccount.accountNumber,
      },
      fraudAssessment:
        direction === "DEBIT" ? transaction.fraudAssessment : null,
    };
  }

  private toCustomerDeposit(deposit: DepositTransaction) {
    return {
      id: deposit.id,
      kind: "DEPOSIT" as const,
      direction: "CREDIT" as const,
      amount: deposit.amount,
      reference: deposit.reference,
      description: "Demo account funding",
      status: deposit.status,
      createdAt: deposit.createdAt,
      completedAt: deposit.completedAt,
      balanceAfter: deposit.balanceAfter,
      counterparty: {
        name: "Nuel Demo Funding",
        accountNumber: null,
      },
      fraudAssessment: null,
    };
  }

  private createVerificationCode(): string {
    return randomInt(100_000, 1_000_000).toString();
  }

  private hashVerificationCode(transactionId: string, code: string): string {
    const secret =
      this.config.get<string>("TRANSACTION_VERIFICATION_SECRET") ??
      this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
    return createHmac("sha256", secret)
      .update(`transaction-verification:${transactionId}:${code}`)
      .digest("hex");
  }

  private matchesVerificationCode(
    transactionId: string,
    code: string,
    storedHash: string,
  ): boolean {
    if (!/^[a-f\d]{64}$/.test(storedHash)) return false;
    const candidate = Buffer.from(
      this.hashVerificationCode(transactionId, code),
      "hex",
    );
    const stored = Buffer.from(storedHash, "hex");
    return (
      candidate.length === stored.length && timingSafeEqual(candidate, stored)
    );
  }

  private async recordVerificationFailure(
    tx: FraudTransactionClient,
    senderId: string,
    transactionId: string,
    metadata: { reason: string; attempts?: number },
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        userId: senderId,
        action: AuditAction.TRANSFER_VERIFICATION_FAILED,
        entityType: "Transaction",
        entityId: transactionId,
        metadata,
      },
    });
  }

  private async recordClientFraudHints(
    tx: FraudTransactionClient,
    userId: string,
    hints: ClientFraudHints,
  ) {
    if (hints.deviceFingerprintHint)
      await tx.device.upsert({
        where: {
          userId_fingerprint: {
            userId,
            fingerprint: hints.deviceFingerprintHint,
          },
        },
        create: {
          userId,
          fingerprint: hints.deviceFingerprintHint,
          lastLocation: hints.locationHint,
        },
        update: { lastLocation: hints.locationHint, lastSeenAt: new Date() },
      });
  }
  private toAmount(value: string): Prisma.Decimal {
    if (!/^\d+(\.\d{1,2})?$/.test(value))
      throw new BadRequestException(
        "Amount must be a positive value with up to two decimal places",
      );
    const amount = new Prisma.Decimal(value);
    if (amount.lte(0))
      throw new BadRequestException("Amount must be greater than zero");
    return amount;
  }
  private createRequestHash(dto: CreateTransferDto): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          amount: dto.amount,
          destinationAccountNumber: dto.destinationAccountNumber,
          description: dto.description ?? null,
        }),
      )
      .digest("hex");
  }
  private validateIdempotentRequest<T extends { requestHash: string | null }>(
    storedHash: string | null,
    requestHash: string,
    transaction: T,
  ): T {
    if (storedHash !== requestHash)
      throw new ConflictException(
        "Idempotency-Key has already been used with different transfer details",
      );
    return transaction;
  }
}

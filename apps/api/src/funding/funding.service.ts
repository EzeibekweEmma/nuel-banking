import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  AuditAction,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDemoDepositDto } from "./dto/create-demo-deposit.dto";

export const DEMO_FUNDING_LIMITS = {
  minimumAmount: 100,
  maximumAmount: 500_000,
  dailyAmount: 1_000_000,
  dailyDeposits: 5,
} as const;

@Injectable()
export class FundingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getDemoConfiguration() {
    return {
      enabled: this.isDemoFundingEnabled(),
      limits: DEMO_FUNDING_LIMITS,
    };
  }

  async createDemoDeposit(
    userId: string,
    idempotencyKey: string,
    dto: CreateDemoDepositDto,
  ) {
    if (!this.isDemoFundingEnabled()) {
      throw new ForbiddenException("Demo funding is not available");
    }

    const amount = this.toAmount(dto.amount);
    const requestHash = this.createRequestHash(amount);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const account = await tx.account.findUnique({
            where: { userId },
            select: {
              id: true,
              status: true,
              currency: true,
            },
          });
          if (!account) throw new NotFoundException("Bank account not found");
          if (account.status !== AccountStatus.ACTIVE) {
            throw new BadRequestException("Your account is not available for funding");
          }

          const existing = await tx.depositTransaction.findUnique({
            where: {
              accountId_idempotencyKey: {
                accountId: account.id,
                idempotencyKey,
              },
            },
          });
          if (existing) {
            return this.validateIdempotentRequest(
              existing.requestHash,
              requestHash,
              existing,
            );
          }

          const startOfToday = this.startOfCurrentUtcDay();
          const [dailySummary, dailyCount] = await Promise.all([
            tx.depositTransaction.aggregate({
              where: {
                accountId: account.id,
                status: TransactionStatus.COMPLETED,
                createdAt: { gte: startOfToday },
              },
              _sum: { amount: true },
            }),
            tx.depositTransaction.count({
              where: {
                accountId: account.id,
                status: TransactionStatus.COMPLETED,
                createdAt: { gte: startOfToday },
              },
            }),
          ]);
          const fundedToday = dailySummary._sum.amount ?? new Prisma.Decimal(0);
          if (dailyCount >= DEMO_FUNDING_LIMITS.dailyDeposits) {
            throw new BadRequestException(
              `You can make up to ${DEMO_FUNDING_LIMITS.dailyDeposits} demo deposits per day`,
            );
          }
          if (fundedToday.plus(amount).gt(DEMO_FUNDING_LIMITS.dailyAmount)) {
            throw new BadRequestException(
              `The daily demo funding limit is ${DEMO_FUNDING_LIMITS.dailyAmount} NGN`,
            );
          }

          const updatedAccount = await tx.account.update({
            where: { id: account.id },
            data: { balance: { increment: amount } },
            select: { balance: true },
          });
          const deposit = await tx.depositTransaction.create({
            data: {
              accountId: account.id,
              amount,
              balanceAfter: updatedAccount.balance,
              currency: account.currency,
              reference: this.createReference(),
              idempotencyKey,
              requestHash,
            },
          });
          await tx.notification.create({
            data: {
              userId,
              type: "TRANSACTION_UPDATE",
              title: "Account funded",
              message: `Your account was credited with ${amount.toFixed(2)} ${account.currency} through demo funding.`,
            },
          });
          await tx.auditLog.create({
            data: {
              userId,
              action: AuditAction.DEMO_DEPOSIT_COMPLETED,
              entityType: "DepositTransaction",
              entityId: deposit.id,
              metadata: { amount: amount.toFixed(2), currency: account.currency },
            },
          });
          return deposit;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const account = await this.prisma.account.findUnique({
          where: { userId },
          select: { id: true },
        });
        const existing = account
          ? await this.prisma.depositTransaction.findUnique({
              where: {
                accountId_idempotencyKey: {
                  accountId: account.id,
                  idempotencyKey,
                },
              },
            })
          : null;
        if (existing) {
          return this.validateIdempotentRequest(
            existing.requestHash,
            requestHash,
            existing,
          );
        }
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new ConflictException(
          "Another funding request was processed at the same time. Please retry.",
        );
      }
      throw error;
    }
  }

  async listDeposits(userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException("Bank account not found");
    return this.prisma.depositTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  private isDemoFundingEnabled(): boolean {
    const configured = this.config.get<string>("DEMO_FUNDING_ENABLED");
    if (configured !== undefined) return configured === "true";
    return this.config.get<string>("NODE_ENV") !== "production";
  }

  private toAmount(value: string): Prisma.Decimal {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException(
        "Amount must be a positive value with up to two decimal places",
      );
    }
    const amount = new Prisma.Decimal(value);
    if (amount.lt(DEMO_FUNDING_LIMITS.minimumAmount)) {
      throw new BadRequestException(
        `The minimum demo deposit is ${DEMO_FUNDING_LIMITS.minimumAmount} NGN`,
      );
    }
    if (amount.gt(DEMO_FUNDING_LIMITS.maximumAmount)) {
      throw new BadRequestException(
        `The maximum demo deposit is ${DEMO_FUNDING_LIMITS.maximumAmount} NGN`,
      );
    }
    return amount;
  }

  private createRequestHash(amount: Prisma.Decimal): string {
    return createHash("sha256")
      .update(JSON.stringify({ amount: amount.toFixed(2), source: "DEMO" }))
      .digest("hex");
  }

  private createReference(): string {
    return `NFD-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
  }

  private startOfCurrentUtcDay(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private validateIdempotentRequest<T>(
    storedHash: string,
    requestHash: string,
    deposit: T,
  ): T {
    if (storedHash !== requestHash) {
      throw new ConflictException(
        "Idempotency-Key has already been used with a different funding amount",
      );
    }
    return deposit;
  }
}

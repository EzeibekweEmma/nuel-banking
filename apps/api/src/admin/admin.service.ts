import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AccountStatus,
  AuditAction,
  FraudDecision,
  FraudRiskLevel,
  Prisma,
  TransactionStatus,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { CustomerQueryDto } from "./dto/customer-query.dto";
import { FraudAssessmentQueryDto } from "./dto/fraud-assessment-query.dto";
import { HeldTransactionQueryDto } from "./dto/held-transaction-query.dto";
import { PaginationDto } from "./dto/pagination.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      customers,
      transactions,
      held,
      assessments,
      riskGroups,
      decisionGroups,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: { status: TransactionStatus.HELD },
      }),
      this.prisma.fraudAssessment.count(),
      this.prisma.fraudAssessment.groupBy({
        by: ["riskLevel"],
        _count: { _all: true },
      }),
      this.prisma.fraudAssessment.groupBy({
        by: ["decision"],
        _count: { _all: true },
      }),
    ]);
    const riskCounts: Record<FraudRiskLevel, number> = {
      [FraudRiskLevel.LOW]: 0,
      [FraudRiskLevel.MEDIUM]: 0,
      [FraudRiskLevel.HIGH]: 0,
    };
    for (const group of riskGroups) {
      riskCounts[group.riskLevel] = group._count._all;
    }
    const decisionCounts: Record<FraudDecision, number> = {
      [FraudDecision.APPROVE]: 0,
      [FraudDecision.VERIFY]: 0,
      [FraudDecision.HOLD]: 0,
    };
    for (const group of decisionGroups) {
      decisionCounts[group.decision] = group._count._all;
    }
    return {
      customers,
      transactions,
      held,
      assessments,
      fraud: {
        risk: {
          low: riskCounts.LOW,
          medium: riskCounts.MEDIUM,
          high: riskCounts.HIGH,
        },
        decisions: {
          approve: decisionCounts.APPROVE,
          verify: decisionCounts.VERIFY,
          hold: decisionCounts.HOLD,
        },
      },
    };
  }

  async customers(query: CustomerQueryDto) {
    const search = query.query?.trim();
    const where: Prisma.UserWhereInput = {
      role: UserRole.CUSTOMER,
      ...(query.status ? { accounts: { some: { status: query.status } } } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              {
                accounts: {
                  some: { accountNumber: { contains: search } },
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
          accounts: {
            select: {
              id: true,
              accountNumber: true,
              type: true,
              balance: true,
              currency: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  }

  freezeAccount(adminId: string, accountId: string, reason: string) {
    return this.changeAccountStatus(
      adminId,
      accountId,
      AccountStatus.ACTIVE,
      AccountStatus.FROZEN,
      reason,
    );
  }

  unfreezeAccount(adminId: string, accountId: string, reason: string) {
    return this.changeAccountStatus(
      adminId,
      accountId,
      AccountStatus.FROZEN,
      AccountStatus.ACTIVE,
      reason,
    );
  }

  async transactions(query: TransactionQueryDto) {
    const where: Prisma.TransactionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.riskLevel
        ? { fraudAssessment: { is: { riskLevel: query.riskLevel } } }
        : {}),
      ...this.transactionSearchWhere(query.query),
    };
    return this.transactionPage(query, where);
  }

  heldTransactions(query: HeldTransactionQueryDto) {
    return this.transactionPage(query, {
      status: TransactionStatus.HELD,
      ...this.transactionSearchWhere(query.query),
    });
  }

  private async transactionPage(
    query: PaginationDto,
    where: Prisma.TransactionWhereInput,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: this.transactionInclude,
        orderBy: { createdAt: "desc" },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  }

  async fraudAssessments(query: FraudAssessmentQueryDto) {
    const search = query.query?.trim();
    const transactionWhere: Prisma.TransactionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...this.transactionSearchWhere(search),
    };
    const where: Prisma.FraudAssessmentWhereInput = {
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(query.decision ? { decision: query.decision } : {}),
      ...(query.status || search
        ? { transaction: { is: transactionWhere } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.fraudAssessment.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              reference: true,
              status: true,
              amount: true,
              createdAt: true,
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
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.fraudAssessment.count({ where }),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  }

  async auditLogs(query: AuditLogQueryDto) {
    const search = query.query?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType
        ? { entityType: { equals: query.entityType, mode: "insensitive" } }
        : {}),
      ...(search
        ? {
            OR: [
              { entityId: { contains: search, mode: "insensitive" } },
              { entityType: { contains: search, mode: "insensitive" } },
              {
                user: {
                  is: { email: { contains: search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  }

  private skip(query: PaginationDto): number {
    return (query.page - 1) * query.limit;
  }

  private transactionSearchWhere(query?: string): Prisma.TransactionWhereInput {
    const search = query?.trim();
    if (!search) return {};
    return {
      OR: [
        { reference: { contains: search, mode: "insensitive" } },
        {
          sourceAccount: {
            is: {
              OR: [
                { accountNumber: { contains: search } },
                {
                  user: {
                    is: {
                      OR: [
                        {
                          firstName: {
                            contains: search,
                            mode: "insensitive",
                          },
                        },
                        {
                          lastName: {
                            contains: search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        {
          destinationAccount: {
            is: {
              OR: [
                { accountNumber: { contains: search } },
                {
                  user: {
                    is: {
                      OR: [
                        {
                          firstName: {
                            contains: search,
                            mode: "insensitive",
                          },
                        },
                        {
                          lastName: {
                            contains: search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    };
  }

  private readonly transactionInclude = {
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
  };

  private async changeAccountStatus(
    adminId: string,
    accountId: string,
    expectedStatus: AccountStatus,
    nextStatus: AccountStatus,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          userId: true,
          accountNumber: true,
          status: true,
          user: { select: { role: true } },
        },
      });
      if (!account) throw new NotFoundException("Account not found");
      if (account.user.role !== UserRole.CUSTOMER) {
        throw new BadRequestException(
          "Only customer accounts can be controlled here",
        );
      }
      if (account.status === AccountStatus.CLOSED) {
        throw new BadRequestException(
          "Closed accounts cannot be frozen or unfrozen",
        );
      }
      if (account.status === nextStatus) {
        throw new BadRequestException(
          nextStatus === AccountStatus.FROZEN
            ? "Account is already frozen"
            : "Account is already active",
        );
      }
      if (account.status !== expectedStatus) {
        throw new ConflictException(
          "Account status changed before this action could be completed",
        );
      }

      const changed = await tx.account.updateMany({
        where: { id: account.id, status: expectedStatus },
        data: { status: nextStatus },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          "Account status changed before this action could be completed",
        );
      }

      const frozen = nextStatus === AccountStatus.FROZEN;
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: frozen
            ? AuditAction.ACCOUNT_FROZEN
            : AuditAction.ACCOUNT_UNFROZEN,
          entityType: "Account",
          entityId: account.id,
          metadata: {
            reason,
            affectedUserId: account.userId,
            accountNumber: account.accountNumber,
            previousStatus: expectedStatus,
            newStatus: nextStatus,
          },
        },
      });
      await tx.notification.create({
        data: {
          userId: account.userId,
          type: "SECURITY_ALERT",
          title: frozen
            ? "Account temporarily frozen"
            : "Account access restored",
          message: frozen
            ? `Your account has been frozen. Reason: ${reason}`
            : `Your account has been unfrozen. Reason: ${reason}`,
        },
      });

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        status: nextStatus,
      };
    });
  }
}

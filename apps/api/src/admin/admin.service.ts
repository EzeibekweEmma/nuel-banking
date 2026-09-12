import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AccountStatus,
  AuditAction,
  Prisma,
  TransactionStatus,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerQueryDto } from "./dto/customer-query.dto";
import { FraudAssessmentQueryDto } from "./dto/fraud-assessment-query.dto";
import { PaginationDto } from "./dto/pagination.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
    const where = query.status ? { status: query.status } : {};
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

  heldTransactions(query: PaginationDto) {
    return this.transactions({ ...query, status: TransactionStatus.HELD });
  }

  async fraudAssessments(query: FraudAssessmentQueryDto) {
    const search = query.query?.trim();
    const transactionWhere: Prisma.TransactionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
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
          }
        : {}),
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

  async auditLogs(query: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        skip: this.skip(query),
        take: query.limit,
      }),
      this.prisma.auditLog.count(),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  }

  private skip(query: PaginationDto): number {
    return (query.page - 1) * query.limit;
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

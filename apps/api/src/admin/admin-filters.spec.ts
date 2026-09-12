import {
  AccountStatus,
  AuditAction,
  FraudDecision,
  FraudRiskLevel,
  TransactionStatus,
} from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AdminService } from "./admin.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { CustomerQueryDto } from "./dto/customer-query.dto";
import { FraudAssessmentQueryDto } from "./dto/fraud-assessment-query.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";

describe("Admin filters", () => {
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    fraudAssessment: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const service = new AdminService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("filters customers by status and searchable identity fields", async () => {
    await service.customers({
      page: 1,
      limit: 20,
      query: "Ada",
      status: AccountStatus.FROZEN,
    });

    const findArguments = prisma.user.findMany.mock.calls[0][0];
    expect(findArguments.where).toEqual(
      expect.objectContaining({
        role: "CUSTOMER",
        accounts: { some: { status: AccountStatus.FROZEN } },
        OR: expect.arrayContaining([
          { email: { contains: "Ada", mode: "insensitive" } },
          { firstName: { contains: "Ada", mode: "insensitive" } },
          { lastName: { contains: "Ada", mode: "insensitive" } },
        ]),
      }),
    );
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: findArguments.where,
    });
  });

  it("filters fraud assessments and their related transaction", async () => {
    await service.fraudAssessments({
      page: 1,
      limit: 20,
      query: "Nuel-123",
      riskLevel: FraudRiskLevel.HIGH,
      decision: FraudDecision.HOLD,
      status: TransactionStatus.HELD,
    });

    const findArguments = prisma.fraudAssessment.findMany.mock.calls[0][0];
    expect(findArguments.where).toEqual(
      expect.objectContaining({
        riskLevel: FraudRiskLevel.HIGH,
        decision: FraudDecision.HOLD,
        transaction: {
          is: expect.objectContaining({
            status: TransactionStatus.HELD,
            OR: expect.arrayContaining([
              {
                reference: {
                  contains: "Nuel-123",
                  mode: "insensitive",
                },
              },
            ]),
          }),
        },
      }),
    );
    expect(prisma.fraudAssessment.count).toHaveBeenCalledWith({
      where: findArguments.where,
    });
  });

  it("filters transactions by status, risk, and customer details", async () => {
    await service.transactions({
      page: 2,
      limit: 10,
      query: "NUE-123",
      status: TransactionStatus.COMPLETED,
      riskLevel: FraudRiskLevel.LOW,
    });

    const findArguments = prisma.transaction.findMany.mock.calls[0][0];
    expect(findArguments).toEqual(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          status: TransactionStatus.COMPLETED,
          fraudAssessment: { is: { riskLevel: FraudRiskLevel.LOW } },
          OR: expect.arrayContaining([
            {
              reference: {
                contains: "NUE-123",
                mode: "insensitive",
              },
            },
          ]),
        }),
      }),
    );
    expect(prisma.transaction.count).toHaveBeenCalledWith({
      where: findArguments.where,
    });
  });

  it("keeps held-review searches restricted to held transactions", async () => {
    await service.heldTransactions({
      page: 1,
      limit: 20,
      query: "0123456789",
    });

    const findArguments = prisma.transaction.findMany.mock.calls[0][0];
    expect(findArguments.where).toEqual(
      expect.objectContaining({
        status: TransactionStatus.HELD,
        OR: expect.any(Array),
      }),
    );
  });

  it("filters audit logs by action, entity, and actor search", async () => {
    await service.auditLogs({
      page: 1,
      limit: 20,
      query: "admin@nuel.test",
      action: AuditAction.ACCOUNT_FROZEN,
      entityType: "Account",
    });

    const findArguments = prisma.auditLog.findMany.mock.calls[0][0];
    expect(findArguments.where).toEqual(
      expect.objectContaining({
        action: AuditAction.ACCOUNT_FROZEN,
        entityType: { equals: "Account", mode: "insensitive" },
        OR: expect.arrayContaining([
          {
            user: {
              is: {
                email: {
                  contains: "admin@nuel.test",
                  mode: "insensitive",
                },
              },
            },
          },
        ]),
      }),
    );
    expect(prisma.auditLog.count).toHaveBeenCalledWith({
      where: findArguments.where,
    });
  });

  it("validates customer and fraud filter enum values", async () => {
    const customer = plainToInstance(CustomerQueryDto, {
      page: "1",
      status: "BLOCKED",
    });
    const fraud = plainToInstance(FraudAssessmentQueryDto, {
      riskLevel: "CRITICAL",
      decision: "REVIEW",
    });

    expect(await validate(customer)).toHaveLength(1);
    expect(await validate(fraud)).toHaveLength(2);
  });

  it("validates transaction and audit filter enum values", async () => {
    const transaction = plainToInstance(TransactionQueryDto, {
      status: "UNKNOWN",
      riskLevel: "CRITICAL",
    });
    const audit = plainToInstance(AuditLogQueryDto, {
      action: "ACCOUNT_DELETED",
    });

    expect(await validate(transaction)).toHaveLength(2);
    expect(await validate(audit)).toHaveLength(1);
  });
});

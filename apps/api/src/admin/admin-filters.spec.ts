import {
  AccountStatus,
  FraudDecision,
  FraudRiskLevel,
  TransactionStatus,
} from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AdminService } from "./admin.service";
import { CustomerQueryDto } from "./dto/customer-query.dto";
import { FraudAssessmentQueryDto } from "./dto/fraud-assessment-query.dto";

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
});

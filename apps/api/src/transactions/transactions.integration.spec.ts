import {
  AccountStatus,
  FraudDecision,
  FraudRiskLevel,
  PrismaClient,
  TransactionStatus,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionsService } from "./transactions.service";

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "true" ? describe : describe.skip;

describeIntegration("TransactionsService PostgreSQL integration", () => {
  const prisma = new PrismaClient();
  const fraudService = {
    assess: jest.fn().mockResolvedValue({
      riskScore: 0,
      riskLevel: FraudRiskLevel.LOW,
      decision: FraudDecision.APPROVE,
      reasons: [],
    }),
  };
  const verificationMailer = { queue: jest.fn(), scheduleDelivery: jest.fn() };
  const service = new TransactionsService(
    prisma as unknown as PrismaService,
    fraudService as never,
    {
      get: jest.fn(),
      getOrThrow: jest.fn().mockReturnValue("test-secret"),
    } as never,
    verificationMailer as never,
  );
  const suffix = randomUUID();
  let sourceAccountId: string;
  let destinationAccountId: string;
  let sourceUserId: string;
  let destinationUserId: string;
  let adminId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const sourceUser = await prisma.user.create({
      data: {
        email: `integration-source-${suffix}@example.com`,
        passwordHash: "hash",
        firstName: "Source",
        lastName: "User",
        role: UserRole.CUSTOMER,
        accounts: {
          create: {
            accountNumber: `91${Date.now().toString().slice(-8)}`,
            balance: 1000,
          },
        },
      },
      include: { accounts: true },
    });
    const destinationUser = await prisma.user.create({
      data: {
        email: `integration-destination-${suffix}@example.com`,
        passwordHash: "hash",
        firstName: "Destination",
        lastName: "User",
        role: UserRole.CUSTOMER,
        accounts: {
          create: {
            accountNumber: `92${Date.now().toString().slice(-8)}`,
            balance: 100,
          },
        },
      },
      include: { accounts: true },
    });
    const admin = await prisma.user.create({
      data: {
        email: `integration-admin-${suffix}@example.com`,
        passwordHash: "hash",
        firstName: "Admin",
        lastName: "User",
        role: UserRole.ADMIN,
      },
    });
    sourceUserId = sourceUser.id;
    destinationUserId = destinationUser.id;
    sourceAccountId = sourceUser.accounts[0].id;
    destinationAccountId = destinationUser.accounts[0].id;
    adminId = admin.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: suffix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.fraudAssessment.deleteMany({
      where: { transaction: { sourceAccount: { userId: { in: userIds } } } },
    });
    await prisma.transaction.deleteMany({
      where: { sourceAccount: { userId: { in: userIds } } },
    });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("moves balances once for repeated idempotent requests", async () => {
    const destination = await prisma.account.findUniqueOrThrow({
      where: { id: destinationAccountId },
    });
    const dto = {
      destinationAccountNumber: destination.accountNumber,
      amount: "100.00",
    };
    const first = await service.transfer(
      sourceUserId,
      `idempotency-${suffix}`,
      dto,
    );
    const retry = await service.transfer(
      sourceUserId,
      `idempotency-${suffix}`,
      dto,
    );
    await expect(
      service.transfer(sourceUserId, `idempotency-${suffix}`, {
        ...dto,
        amount: "101.00",
      }),
    ).rejects.toThrow(
      "Idempotency-Key has already been used with different transfer details",
    );
    const [
      source,
      recipient,
      sourceActivity,
      recipientActivity,
      recipientDetail,
      recipientNotifications,
    ] = await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { id: sourceAccountId } }),
      prisma.account.findUniqueOrThrow({ where: { id: destinationAccountId } }),
      service.list(sourceUserId),
      service.list(destinationUserId),
      service.getDetail(destinationUserId, first.id),
      prisma.notification.findMany({ where: { userId: destinationUserId } }),
    ]);
    expect(retry.id).toBe(first.id);
    expect(source.balance.toString()).toBe("900");
    expect(recipient.balance.toString()).toBe("200");
    expect(sourceActivity.find((item) => item.id === first.id)?.direction).toBe(
      "DEBIT",
    );
    expect(
      recipientActivity.find((item) => item.id === first.id)?.direction,
    ).toBe("CREDIT");
    expect(recipientDetail.direction).toBe("CREDIT");
    expect(recipientNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Money received" }),
      ]),
    );
  });

  it("allows only one concurrent approval of a held transaction", async () => {
    const held = await prisma.transaction.create({
      data: {
        sourceAccountId,
        destinationAccountId,
        amount: 50,
        reference: randomUUID(),
        idempotencyKey: `held-${suffix}`,
        requestHash: "integration",
        status: TransactionStatus.HELD,
      },
    });
    await expect(service.getDetail(destinationUserId, held.id)).rejects.toThrow(
      "Transaction not found",
    );
    const results = await Promise.allSettled([
      service.approveHeld(adminId, held.id),
      service.approveHeld(adminId, held.id),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const [source, recipient] = await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { id: sourceAccountId } }),
      prisma.account.findUniqueOrThrow({ where: { id: destinationAccountId } }),
    ]);
    expect(source.status).toBe(AccountStatus.ACTIVE);
    expect(source.balance.toString()).toBe("850");
    expect(recipient.balance.toString()).toBe("250");
    await expect(
      service.getDetail(destinationUserId, held.id),
    ).resolves.toEqual(expect.objectContaining({ direction: "CREDIT" }));
  });

  it("requires the emailed one-time code for a medium-risk transfer", async () => {
    fraudService.assess.mockResolvedValueOnce({
      riskScore: 45,
      riskLevel: FraudRiskLevel.MEDIUM,
      decision: FraudDecision.VERIFY,
      reasons: ["UNUSUAL_AMOUNT"],
    });
    const destination = await prisma.account.findUniqueOrThrow({
      where: { id: destinationAccountId },
    });
    const pending = await service.transfer(sourceUserId, `verified-${suffix}`, {
      destinationAccountNumber: destination.accountNumber,
      amount: "25.00",
    });
    const delivery = verificationMailer.queue.mock.calls.at(-1)?.[1] as
      | { code: string; codeHash: string }
      | undefined;
    const storedCode = await prisma.transactionVerificationCode.findUnique({
      where: { transactionId: pending.id },
    });

    expect(pending.status).toBe(TransactionStatus.PENDING);
    expect(delivery?.code).toMatch(/^\d{6}$/);
    expect(storedCode?.codeHash).toHaveLength(64);
    expect(storedCode?.codeHash).not.toBe(delivery?.code);
    await expect(
      service.verify(sourceUserId, pending.id, "000000"),
    ).rejects.toThrow("Incorrect verification code");
    await expect(
      service.verify(sourceUserId, pending.id, delivery?.code ?? ""),
    ).resolves.toEqual(
      expect.objectContaining({ status: TransactionStatus.COMPLETED }),
    );
    await expect(
      service.verify(sourceUserId, pending.id, delivery?.code ?? ""),
    ).rejects.toThrow("Transfer awaiting verification not found");
    await expect(
      prisma.transactionVerificationCode.findUnique({
        where: { transactionId: pending.id },
      }),
    ).resolves.toBeNull();
  });
});

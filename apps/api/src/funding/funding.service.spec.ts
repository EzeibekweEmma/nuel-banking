import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, AuditAction, Prisma, TransactionStatus } from "@prisma/client";
import { createHash } from "crypto";
import { FundingService } from "./funding.service";

describe("FundingService", () => {
  const account = { id: "account-1", status: AccountStatus.ACTIVE, currency: "NGN" };
  const deposit = {
    id: "deposit-1",
    accountId: account.id,
    amount: new Prisma.Decimal(10_000),
    balanceAfter: new Prisma.Decimal(35_000),
    currency: account.currency,
    reference: "NFD-REFERENCE",
    idempotencyKey: "funding-key-1",
    requestHash: requestHash("10000.00"),
    source: "DEMO",
    status: TransactionStatus.COMPLETED,
    createdAt: new Date(),
    completedAt: new Date(),
  };
  const tx = {
    account: { findUnique: jest.fn(), update: jest.fn() },
    depositTransaction: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    account: { findUnique: jest.fn() },
    depositTransaction: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const config = { get: jest.fn((key: string): string | undefined => key === "DEMO_FUNDING_ENABLED" ? "true" : undefined) };
  const service = new FundingService(prisma as never, config as never as ConfigService);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => key === "DEMO_FUNDING_ENABLED" ? "true" : undefined);
    tx.account.findUnique.mockResolvedValue(account);
    tx.depositTransaction.findUnique.mockResolvedValue(null);
    tx.depositTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    tx.depositTransaction.count.mockResolvedValue(0);
    tx.account.update.mockResolvedValue({ balance: new Prisma.Decimal(35_000) });
    tx.depositTransaction.create.mockResolvedValue(deposit);
    tx.notification.create.mockResolvedValue({});
    tx.auditLog.create.mockResolvedValue({});
  });

  it("credits the account and records the deposit atomically", async () => {
    await expect(service.createDemoDeposit("user-1", "funding-key-1", { amount: "10000" })).resolves.toEqual(deposit);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.account.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: account.id },
      data: { balance: { increment: new Prisma.Decimal(10_000) } },
    }));
    expect(tx.depositTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountId: account.id,
        amount: new Prisma.Decimal(10_000),
        balanceAfter: new Prisma.Decimal(35_000),
      }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: AuditAction.DEMO_DEPOSIT_COMPLETED }),
    }));
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });

  it("returns the original transaction for a repeated idempotent request", async () => {
    tx.depositTransaction.findUnique.mockResolvedValue(deposit);

    await expect(service.createDemoDeposit("user-1", "funding-key-1", { amount: "10000.00" })).resolves.toEqual(deposit);

    expect(tx.account.update).not.toHaveBeenCalled();
    expect(tx.depositTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key reused for another amount", async () => {
    tx.depositTransaction.findUnique.mockResolvedValue(deposit);

    await expect(service.createDemoDeposit("user-1", "funding-key-1", { amount: "12000" })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.account.update).not.toHaveBeenCalled();
  });

  it("enforces per-deposit and daily funding limits", async () => {
    await expect(service.createDemoDeposit("user-1", "funding-key-1", { amount: "500001" })).rejects.toBeInstanceOf(BadRequestException);

    tx.depositTransaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(950_000) } });
    await expect(service.createDemoDeposit("user-1", "funding-key-2", { amount: "100000" })).rejects.toThrow("daily demo funding limit");
    expect(tx.account.update).not.toHaveBeenCalled();
  });

  it("can be disabled for production environments", async () => {
    config.get.mockImplementation((key: string) => key === "DEMO_FUNDING_ENABLED" ? "false" : "production");

    await expect(service.createDemoDeposit("user-1", "funding-key-1", { amount: "10000" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

function requestHash(amount: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ amount, source: "DEMO" }))
    .digest("hex");
}

import { Prisma, TransactionStatus } from "@prisma/client";
import { TransactionsService } from "./transactions.service";

describe("TransactionsService customer pagination", () => {
  const account = { findUnique: jest.fn() };
  const transaction = { findMany: jest.fn() };
  const depositTransaction = { findMany: jest.fn() };
  const prisma = { account, transaction, depositTransaction };
  const service = new TransactionsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it("filters and paginates the combined customer activity on the server", async () => {
    account.findUnique.mockResolvedValue({ id: "account-1" });
    transaction.findMany.mockResolvedValue([]);
    depositTransaction.findMany.mockResolvedValue(
      [1, 2, 3].map((value) => ({
        id: `deposit-${value}`,
        accountId: "account-1",
        amount: new Prisma.Decimal(value),
        balanceAfter: new Prisma.Decimal(value),
        currency: "NGN",
        reference: `reference-${value}`,
        idempotencyKey: `key-${value}`,
        requestHash: `hash-${value}`,
        source: "DEMO",
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(`2026-09-0${value}T12:00:00.000Z`),
        completedAt: new Date(`2026-09-0${value}T12:00:00.000Z`),
      })),
    );

    const result = await service.listPage("user-1", {
      page: 2,
      limit: 2,
      direction: "CREDIT",
    });

    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("deposit-1");
    expect(result.summary).toEqual({ moneyIn: "6.00", moneyOut: "0.00" });
    expect(depositTransaction.findMany).toHaveBeenCalledWith({
      where: {
        accountId: "account-1",
        status: TransactionStatus.COMPLETED,
        createdAt: undefined,
      },
    });
  });
});

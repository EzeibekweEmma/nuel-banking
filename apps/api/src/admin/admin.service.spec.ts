import { AccountStatus, AuditAction } from "@prisma/client";
import { AdminService } from "./admin.service";

describe("AdminService account controls", () => {
  const tx = {
    account: { findUnique: jest.fn(), updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const service = new AdminService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it.each([
    {
      operation: "freeze",
      currentStatus: AccountStatus.ACTIVE,
      nextStatus: AccountStatus.FROZEN,
      auditAction: AuditAction.ACCOUNT_FROZEN,
      title: "Account temporarily frozen",
    },
    {
      operation: "unfreeze",
      currentStatus: AccountStatus.FROZEN,
      nextStatus: AccountStatus.ACTIVE,
      auditAction: AuditAction.ACCOUNT_UNFROZEN,
      title: "Account access restored",
    },
  ])(
    "records and notifies when an administrator performs $operation",
    async ({ operation, currentStatus, nextStatus, auditAction, title }) => {
      tx.account.findUnique.mockResolvedValue({
        id: "account-1",
        userId: "customer-1",
        accountNumber: "1234567890",
        status: currentStatus,
        user: { role: "CUSTOMER" },
      });
      tx.account.updateMany.mockResolvedValue({ count: 1 });
      tx.auditLog.create.mockResolvedValue({});
      tx.notification.create.mockResolvedValue({});
      const reason = "Confirmed security review outcome";

      const result =
        operation === "freeze"
          ? await service.freezeAccount("admin-1", "account-1", reason)
          : await service.unfreezeAccount("admin-1", "account-1", reason);

      expect(result.status).toBe(nextStatus);
      expect(tx.account.updateMany).toHaveBeenCalledWith({
        where: { id: "account-1", status: currentStatus },
        data: { status: nextStatus },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "admin-1",
          action: auditAction,
          entityType: "Account",
          entityId: "account-1",
          metadata: expect.objectContaining({ reason }),
        }),
      });
      expect(tx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "customer-1",
          title,
          message: expect.stringContaining(reason),
        }),
      });
    },
  );

  it("rejects a repeated freeze without writing an audit event or notification", async () => {
    tx.account.findUnique.mockResolvedValue({
      id: "account-1",
      userId: "customer-1",
      accountNumber: "1234567890",
      status: AccountStatus.FROZEN,
      user: { role: "CUSTOMER" },
    });

    await expect(
      service.freezeAccount("admin-1", "account-1", "Repeated freeze attempt"),
    ).rejects.toThrow("Account is already frozen");
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
});

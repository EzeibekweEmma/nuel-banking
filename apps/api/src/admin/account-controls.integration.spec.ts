import {
  AccountStatus,
  AuditAction,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === "true" ? describe : describe.skip;

describeIntegration("Admin account controls integration", () => {
  const prisma = new PrismaClient();
  const service = new AdminService(prisma as unknown as PrismaService);
  const suffix = randomUUID();
  let adminId: string;
  let customerId: string;
  let accountId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const [admin, customer] = await Promise.all([
      prisma.user.create({
        data: {
          email: `control-admin-${suffix}@example.com`,
          passwordHash: "hash",
          firstName: "Control",
          lastName: "Admin",
          role: UserRole.ADMIN,
        },
      }),
      prisma.user.create({
        data: {
          email: `control-customer-${suffix}@example.com`,
          passwordHash: "hash",
          firstName: "Control",
          lastName: "Customer",
          accounts: {
            create: { accountNumber: `93${Date.now().toString().slice(-8)}` },
          },
        },
        include: { accounts: true },
      }),
    ]);
    adminId = admin.id;
    customerId = customer.id;
    accountId = customer.accounts[0].id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { OR: [{ userId: adminId }, { entityId: accountId }] },
    });
    await prisma.notification.deleteMany({ where: { userId: customerId } });
    await prisma.account.deleteMany({ where: { id: accountId } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, customerId] } },
    });
    await prisma.$disconnect();
  });

  it("freezes and unfreezes atomically with audit logs and customer notifications", async () => {
    await service.freezeAccount(
      adminId,
      accountId,
      "Suspicious activity requires a security review",
    );
    const frozen = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });
    expect(frozen.status).toBe(AccountStatus.FROZEN);

    await service.unfreezeAccount(
      adminId,
      accountId,
      "Security review completed and access approved",
    );
    const [active, auditLogs, notifications] = await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
      prisma.auditLog.findMany({
        where: { entityId: accountId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.notification.findMany({
        where: { userId: customerId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    expect(active.status).toBe(AccountStatus.ACTIVE);
    expect(auditLogs.map((log) => log.action)).toEqual([
      AuditAction.ACCOUNT_FROZEN,
      AuditAction.ACCOUNT_UNFROZEN,
    ]);
    expect(auditLogs.every((log) => log.userId === adminId)).toBe(true);
    expect(notifications.map((notification) => notification.title)).toEqual([
      "Account temporarily frozen",
      "Account access restored",
    ]);
  });
});

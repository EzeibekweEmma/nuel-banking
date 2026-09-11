import { ConfigService } from "@nestjs/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { FundingService } from "./funding.service";

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === "true" ? describe : describe.skip;

describeIntegration("FundingService integration", () => {
  const prisma = new PrismaClient();
  const suffix = Date.now().toString().slice(-8);
  const email = `funding-integration-${suffix}@example.com`;
  let userId: string;
  let accountId: string;
  let service: FundingService;

  beforeAll(async () => {
    await prisma.$connect();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "integration-test-hash",
        firstName: "Funding",
        lastName: "Tester",
        role: UserRole.CUSTOMER,
        accounts: {
          create: {
            accountNumber: `93${suffix}`,
          },
        },
      },
      include: { accounts: true },
    });
    userId = user.id;
    accountId = user.accounts[0].id;
    const config = {
      get: (key: string) => key === "DEMO_FUNDING_ENABLED" ? "true" : undefined,
    };
    service = new FundingService(prisma as never, config as never as ConfigService);
  });

  afterAll(async () => {
    if (userId) {
      await prisma.notification.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.depositTransaction.deleteMany({ where: { accountId } });
      await prisma.account.deleteMany({ where: { id: accountId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("credits the balance exactly once for an idempotent request", async () => {
    const first = await service.createDemoDeposit(userId, "integration-funding-key", { amount: "25000" });
    const repeated = await service.createDemoDeposit(userId, "integration-funding-key", { amount: "25000.00" });
    const [account, deposits] = await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
      prisma.depositTransaction.findMany({ where: { accountId } }),
    ]);

    expect(repeated.id).toBe(first.id);
    expect(account.balance.toString()).toBe("25000");
    expect(deposits).toHaveLength(1);
    expect(deposits[0].balanceAfter.toString()).toBe("25000");
  });
});

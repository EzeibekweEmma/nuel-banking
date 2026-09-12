import {
  AccountStatus,
  AccountType,
  AuditAction,
  FraudDecision,
  FraudRiskLevel,
  NotificationType,
  Prisma,
  PrismaClient,
  TransactionStatus,
  UserRole,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";

const DEFAULT_CUSTOMER_COUNT = 300;
const MIN_CUSTOMER_COUNT = 200;
const MAX_CUSTOMER_COUNT = 500;
const DEFAULT_PASSWORD = "NuelDemo@2026!";
const DEMO_ADMIN_EMAIL = "admin.demo@nuel.test";
const DEMO_ADMIN_ID = "demo-admin";
const MINIMUM_REMAINING_BALANCE = 100_000;
const LOCATIONS = [
  "Lagos, Nigeria",
  "Abuja, Nigeria",
  "Port Harcourt, Nigeria",
  "Ibadan, Nigeria",
  "Enugu, Nigeria",
  "Kano, Nigeria",
] as const;
const FIRST_NAMES = [
  "Ada",
  "Amina",
  "Amaka",
  "Bola",
  "Chiamaka",
  "Chidi",
  "David",
  "Damilola",
  "Emeka",
  "Fatima",
  "Femi",
  "Grace",
  "Halima",
  "Ibrahim",
  "Ifeanyi",
  "Kemi",
  "Mary",
  "Ngozi",
  "Obinna",
  "Samuel",
  "Tunde",
  "Uche",
  "Yemi",
  "Zainab",
] as const;
const LAST_NAMES = [
  "Abubakar",
  "Adeyemi",
  "Afolayan",
  "Balogun",
  "Chukwu",
  "Eze",
  "Ibrahim",
  "Lawal",
  "Nnamdi",
  "Nwosu",
  "Obi",
  "Okafor",
  "Okeke",
  "Olawale",
  "Onyekachi",
  "Suleiman",
  "Udo",
  "Usman",
] as const;
const DESCRIPTIONS = [
  "Food and groceries",
  "School supplies",
  "Family support",
  "Electricity bill",
  "Transport fare",
  "Rent contribution",
  "Weekend shopping",
  "Project materials",
] as const;

interface DemoCustomer {
  id: string;
  accountId: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
  status: AccountStatus;
}

class SeededRandom {
  private state = 0x6e75656c;

  next(): number {
    this.state = (Math.imul(this.state, 1_664_525) + 1_013_904_223) >>> 0;
    return this.state / 4_294_967_296;
  }

  integer(minimum: number, maximum: number): number {
    return Math.floor(this.next() * (maximum - minimum + 1)) + minimum;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(values: readonly T[]): T {
    return values[this.integer(0, values.length - 1)]!;
  }
}

function indexed(prefix: string, value: number, width = 4): string {
  return `${prefix}${value.toString().padStart(width, "0")}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function dateDaysAgo(random: SeededRandom, maximumDays: number): Date {
  const minutesAgo = random.integer(0, maximumDays * 24 * 60);
  return new Date(Date.now() - minutesAgo * 60_000);
}

function dateBetweenDaysAgo(
  random: SeededRandom,
  minimumDays: number,
  maximumDays: number,
): Date {
  const minutesAgo = random.integer(
    minimumDays * 24 * 60,
    maximumDays * 24 * 60,
  );
  return new Date(Date.now() - minutesAgo * 60_000);
}

function after(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function customerCount(): number {
  const value = Number(process.env.DEMO_SEED_COUNT ?? DEFAULT_CUSTOMER_COUNT);
  if (
    !Number.isInteger(value) ||
    value < MIN_CUSTOMER_COUNT ||
    value > MAX_CUSTOMER_COUNT
  ) {
    throw new Error(
      `DEMO_SEED_COUNT must be an integer between ${MIN_CUSTOMER_COUNT} and ${MAX_CUSTOMER_COUNT}.`,
    );
  }
  return value;
}

function demoPassword(): string {
  const password = process.env.DEMO_SEED_PASSWORD ?? DEFAULT_PASSWORD;
  if (password.length < 12) {
    throw new Error("DEMO_SEED_PASSWORD must be at least 12 characters.");
  }
  return password;
}

async function createManyInBatches<T>(
  data: readonly T[],
  createMany: (batch: T[]) => Promise<{ count: number }>,
): Promise<number> {
  const batchSize = 500;
  let created = 0;
  for (let start = 0; start < data.length; start += batchSize) {
    const result = await createMany(data.slice(start, start + batchSize));
    created += result.count;
  }
  return created;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo data cannot be seeded in production.");
  }

  const count = customerCount();
  const password = demoPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const prisma = new PrismaClient();
  const random = new SeededRandom();

  try {
    const admin = await prisma.user.upsert({
      where: { email: DEMO_ADMIN_EMAIL },
      update: {
        passwordHash,
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
      },
      create: {
        id: DEMO_ADMIN_ID,
        email: DEMO_ADMIN_EMAIL,
        passwordHash,
        firstName: "Demo",
        lastName: "Administrator",
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
      },
    });

    const users: Prisma.UserCreateManyInput[] = [];
    const customers: DemoCustomer[] = [];
    const accountBalances: number[] = [];
    const deposits: Prisma.DepositTransactionCreateManyInput[] = [];
    const beneficiaries: Prisma.BeneficiaryCreateManyInput[] = [];
    const devices: Prisma.DeviceCreateManyInput[] = [];
    const sessions: Prisma.RefreshTokenCreateManyInput[] = [];
    const conversations: Prisma.ChatConversationCreateManyInput[] = [];
    const messages: Prisma.ChatMessageCreateManyInput[] = [];
    const transactions: Prisma.TransactionCreateManyInput[] = [];
    const assessments: Prisma.FraudAssessmentCreateManyInput[] = [];
    const notifications: Prisma.NotificationCreateManyInput[] = [];
    const auditLogs: Prisma.AuditLogCreateManyInput[] = [];
    const beneficiaryByPair = new Map<string, string>();
    let notificationNumber = 0;
    let auditNumber = 0;
    let transactionNumber = 0;

    const addNotification = (
      userId: string,
      type: NotificationType,
      title: string,
      message: string,
      createdAt: Date,
      isRead = random.chance(0.72),
    ): void => {
      notificationNumber += 1;
      notifications.push({
        id: indexed("demo-notification-", notificationNumber, 7),
        userId,
        type,
        title,
        message,
        createdAt,
        isRead,
      });
    };

    const addAudit = (
      userId: string | null,
      action: AuditAction,
      entityType: string,
      entityId: string,
      createdAt: Date,
      metadata?: Prisma.InputJsonValue,
    ): void => {
      auditNumber += 1;
      auditLogs.push({
        id: indexed("demo-audit-", auditNumber, 7),
        userId,
        action,
        entityType,
        entityId,
        createdAt,
        ...(metadata ? { metadata } : {}),
      });
    };

    for (let index = 0; index < count; index += 1) {
      const number = index + 1;
      const id = indexed("demo-user-", number);
      const accountId = indexed("demo-account-", number);
      const firstName = random.pick(FIRST_NAMES);
      const lastName = random.pick(LAST_NAMES);
      const createdAt = dateBetweenDaysAgo(random, 180, 540);
      const status =
        number % 41 === 0
          ? AccountStatus.CLOSED
          : number % 17 === 0
            ? AccountStatus.FROZEN
            : AccountStatus.ACTIVE;
      const emailVerifiedAt = number % 19 === 0 ? null : after(createdAt, 15);
      const accountNumber = (9_200_000_000 + number).toString();

      users.push({
        id,
        email: `demo${number.toString().padStart(3, "0")}@nuel.test`,
        passwordHash,
        firstName,
        lastName,
        role: UserRole.CUSTOMER,
        emailVerifiedAt,
        createdAt,
        updatedAt: createdAt,
      });
      customers.push({
        id,
        accountId,
        accountNumber,
        firstName,
        lastName,
        status,
      });

      let fundedBalance = 0;
      let latestDepositDate = createdAt;
      for (let depositIndex = 1; depositIndex <= 2; depositIndex += 1) {
        const amount = random.integer(250, 500) * 1_000;
        fundedBalance += amount;
        const depositId = `demo-deposit-${number.toString().padStart(4, "0")}-${depositIndex}`;
        const depositDate =
          depositIndex === 1
            ? dateBetweenDaysAgo(random, 130, 150)
            : dateBetweenDaysAgo(random, 95, 125);
        latestDepositDate = depositDate;
        deposits.push({
          id: depositId,
          accountId,
          amount,
          balanceAfter: fundedBalance,
          currency: "NGN",
          reference: `NUEL-DEMO-DEP-${number.toString().padStart(4, "0")}-${depositIndex}`,
          idempotencyKey: `demo-deposit-${number}-${depositIndex}`,
          requestHash: sha256(`${accountId}:${amount}:${depositIndex}`),
          status: TransactionStatus.COMPLETED,
          createdAt: depositDate,
          completedAt: depositDate,
        });
        addAudit(
          id,
          AuditAction.DEMO_DEPOSIT_COMPLETED,
          "DepositTransaction",
          depositId,
          depositDate,
          { amount, currency: "NGN", source: "DEMO" },
        );
      }
      notifications.push({
        id: indexed("demo-funding-notification-", number),
        userId: id,
        type: NotificationType.TRANSACTION_UPDATE,
        title: "Account funded",
        message: `Your demo account received NGN ${fundedBalance.toLocaleString("en-NG")} in test deposits.`,
        isRead: true,
        createdAt: latestDepositDate,
      });
      accountBalances.push(fundedBalance);

      const location = random.pick(LOCATIONS);
      devices.push({
        id: indexed("demo-device-", number),
        userId: id,
        fingerprint: `demo-device-${number}`,
        lastLocation: location,
        createdAt,
        lastSeenAt: dateDaysAgo(random, 14),
      });
      if (random.chance(0.22)) {
        devices.push({
          id: indexed("demo-device-secondary-", number),
          userId: id,
          fingerprint: `demo-mobile-${number}`,
          lastLocation: random.pick(LOCATIONS),
          createdAt: dateDaysAgo(random, 120),
          lastSeenAt: dateDaysAgo(random, 30),
        });
      }

      if (random.chance(0.3)) {
        const sessionId = indexed("demo-session-", number);
        sessions.push({
          id: sessionId,
          userId: id,
          tokenHash: sha256(`nuel-demo-session:${number}`),
          expiresAt: new Date(Date.now() + random.integer(2, 25) * 86_400_000),
          userAgent: "Mozilla/5.0 (Demo mobile banking session)",
          ipAddress: `192.0.2.${(number % 250) + 1}`,
          createdAt: dateDaysAgo(random, 20),
        });
      }

      if (number % 4 === 0) {
        const conversationId = indexed("demo-conversation-", number);
        const conversationDate = dateDaysAgo(random, 45);
        conversations.push({
          id: conversationId,
          userId: id,
          createdAt: conversationDate,
          updatedAt: after(conversationDate, 1),
        });
        messages.push(
          {
            id: `${conversationId}-customer`,
            conversationId,
            content: "What is my available balance?",
            isFromCustomer: true,
            createdAt: conversationDate,
          },
          {
            id: `${conversationId}-assistant`,
            conversationId,
            content:
              "Your available balance is shown on your Nuel Bank dashboard.",
            isFromCustomer: false,
            createdAt: after(conversationDate, 1),
          },
        );
      }

      addNotification(
        id,
        NotificationType.TRANSACTION_UPDATE,
        "Welcome to Nuel Bank",
        "Your demo account is ready for secure everyday banking.",
        after(createdAt, 5),
        true,
      );
      if (status !== AccountStatus.ACTIVE) {
        const actionDate = dateDaysAgo(random, 30);
        addNotification(
          id,
          NotificationType.SECURITY_ALERT,
          status === AccountStatus.FROZEN ? "Account frozen" : "Account closed",
          `Your demo account status is now ${status.toLowerCase()}.`,
          actionDate,
          false,
        );
        if (status === AccountStatus.FROZEN) {
          addAudit(
            admin.id,
            AuditAction.ACCOUNT_FROZEN,
            "Account",
            accountId,
            actionDate,
            { reason: "Seeded account-control example", status },
          );
        }
      }
    }

    const activeIndexes = customers
      .map((customer, index) => ({ customer, index }))
      .filter(({ customer }) => customer.status === AccountStatus.ACTIVE)
      .map(({ index }) => index);

    for (
      let sourceIndex = 0;
      sourceIndex < customers.length;
      sourceIndex += 1
    ) {
      const source = customers[sourceIndex]!;
      const savedTargets: number[] = [];
      while (savedTargets.length < 2) {
        const targetIndex = random.pick(activeIndexes);
        if (
          targetIndex !== sourceIndex &&
          !savedTargets.includes(targetIndex)
        ) {
          savedTargets.push(targetIndex);
        }
      }
      savedTargets.forEach((targetIndex, slot) => {
        const destination = customers[targetIndex]!;
        const beneficiaryId = `demo-beneficiary-${(sourceIndex + 1)
          .toString()
          .padStart(4, "0")}-${slot + 1}`;
        beneficiaries.push({
          id: beneficiaryId,
          userId: source.id,
          accountId: destination.accountId,
          nickname: destination.firstName,
          createdAt: dateDaysAgo(random, 120),
        });
        beneficiaryByPair.set(`${sourceIndex}:${targetIndex}`, beneficiaryId);
      });

      const activityCount = random.integer(4, 8);
      for (let activity = 0; activity < activityCount; activity += 1) {
        transactionNumber += 1;
        const savedTarget = random.chance(0.35)
          ? savedTargets[random.integer(0, savedTargets.length - 1)]
          : undefined;
        let destinationIndex = savedTarget ?? random.pick(activeIndexes);
        while (destinationIndex === sourceIndex) {
          destinationIndex = random.pick(activeIndexes);
        }
        const destination = customers[destinationIndex]!;
        const roll = random.next();
        let status: TransactionStatus;
        if (source.status !== AccountStatus.ACTIVE) {
          status =
            roll < 0.76
              ? TransactionStatus.COMPLETED
              : TransactionStatus.REJECTED;
        } else if (roll < 0.67) {
          status = TransactionStatus.COMPLETED;
        } else if (roll < 0.79) {
          status = TransactionStatus.HELD;
        } else if (roll < 0.88) {
          status = TransactionStatus.REJECTED;
        } else if (roll < 0.95) {
          status = TransactionStatus.PENDING;
        } else {
          status = TransactionStatus.FAILED;
        }

        let amount = random.integer(5, 170) * 500;
        if (
          status === TransactionStatus.COMPLETED &&
          accountBalances[sourceIndex]! - amount < MINIMUM_REMAINING_BALANCE
        ) {
          amount = 2_500;
        }
        if (status === TransactionStatus.COMPLETED) {
          accountBalances[sourceIndex] = accountBalances[sourceIndex]! - amount;
          accountBalances[destinationIndex] =
            accountBalances[destinationIndex]! + amount;
        }

        const transactionId = indexed(
          "demo-transaction-",
          transactionNumber,
          7,
        );
        const createdAt =
          source.status === AccountStatus.ACTIVE
            ? dateBetweenDaysAgo(random, 1, 90)
            : dateBetweenDaysAgo(random, 31, 90);
        const beneficiaryId = beneficiaryByPair.get(
          `${sourceIndex}:${destinationIndex}`,
        );
        const reviewed = status === TransactionStatus.REJECTED;
        transactions.push({
          id: transactionId,
          sourceAccountId: source.accountId,
          destinationAccountId: destination.accountId,
          beneficiaryId,
          amount,
          reference: indexed("NUEL-DEMO-TX-", transactionNumber, 7),
          idempotencyKey: indexed("demo-transfer-", transactionNumber, 7),
          requestHash: sha256(
            `${source.accountId}:${destination.accountNumber}:${amount}`,
          ),
          description: random.pick(DESCRIPTIONS),
          status,
          createdAt,
          completedAt:
            status === TransactionStatus.COMPLETED
              ? after(createdAt, random.integer(1, 8))
              : null,
          reviewedAt: reviewed ? after(createdAt, random.integer(5, 60)) : null,
          reviewedById: reviewed ? admin.id : null,
        });

        let riskLevel: FraudRiskLevel;
        let decision: FraudDecision;
        let riskScore: number;
        let reasons: string[];
        if (status === TransactionStatus.COMPLETED) {
          riskLevel = FraudRiskLevel.LOW;
          decision = FraudDecision.APPROVE;
          riskScore = random.integer(0, 29);
          reasons = riskScore > 20 ? ["NEW_DEVICE"] : [];
        } else if (
          status === TransactionStatus.HELD ||
          status === TransactionStatus.REJECTED
        ) {
          riskLevel = FraudRiskLevel.HIGH;
          decision = FraudDecision.HOLD;
          riskScore = random.integer(72, 98);
          reasons = random.chance(0.5)
            ? ["UNUSUAL_AMOUNT", "NEW_DEVICE", "UNUSUAL_LOCATION"]
            : ["HIGH_TRANSACTION_FREQUENCY", "UNUSUAL_TRANSACTION_TIME"];
        } else {
          riskLevel = FraudRiskLevel.MEDIUM;
          decision = FraudDecision.VERIFY;
          riskScore = random.integer(40, 69);
          reasons = random.chance(0.5) ? ["NEW_DEVICE"] : ["UNUSUAL_AMOUNT"];
        }
        assessments.push({
          id: indexed("demo-fraud-", transactionNumber, 7),
          transactionId,
          riskScore,
          riskLevel,
          decision,
          reasons,
          createdAt,
        });

        addAudit(
          source.id,
          AuditAction.TRANSFER_CREATED,
          "Transaction",
          transactionId,
          createdAt,
          {
            amount,
            currency: "NGN",
            destinationAccountNumber: destination.accountNumber,
          },
        );
        addAudit(
          source.id,
          AuditAction.FRAUD_ASSESSMENT_GENERATED,
          "FraudAssessment",
          transactionId,
          after(createdAt, 1),
          { riskScore, riskLevel, decision, reasons },
        );

        if (status === TransactionStatus.COMPLETED) {
          addAudit(
            source.id,
            AuditAction.TRANSFER_COMPLETED,
            "Transaction",
            transactionId,
            after(createdAt, 2),
          );
          addNotification(
            source.id,
            NotificationType.TRANSACTION_UPDATE,
            "Transfer completed",
            `You sent NGN ${amount.toLocaleString("en-NG")} to ${destination.firstName} ${destination.lastName}.`,
            after(createdAt, 2),
          );
          addNotification(
            destination.id,
            NotificationType.TRANSACTION_UPDATE,
            "Money received",
            `You received NGN ${amount.toLocaleString("en-NG")} from ${source.firstName} ${source.lastName}.`,
            after(createdAt, 2),
          );
        } else if (status === TransactionStatus.HELD) {
          addAudit(
            source.id,
            AuditAction.TRANSFER_HELD,
            "Transaction",
            transactionId,
            after(createdAt, 2),
          );
          addNotification(
            source.id,
            NotificationType.FRAUD_ALERT,
            "Transfer held for review",
            "Unusual activity was detected and this transfer requires an administrator review.",
            after(createdAt, 2),
            false,
          );
        } else if (status === TransactionStatus.REJECTED) {
          addAudit(
            admin.id,
            AuditAction.TRANSACTION_REJECTED,
            "Transaction",
            transactionId,
            after(createdAt, 3),
            { reason: "Seeded high-risk transaction review" },
          );
          addAudit(
            admin.id,
            AuditAction.ADMIN_REVIEW_PERFORMED,
            "Transaction",
            transactionId,
            after(createdAt, 3),
            { decision: "REJECTED" },
          );
          addNotification(
            source.id,
            NotificationType.FRAUD_ALERT,
            "Transfer rejected",
            "This high-risk transfer was rejected after a security review.",
            after(createdAt, 3),
          );
        } else if (status === TransactionStatus.PENDING) {
          addAudit(
            source.id,
            AuditAction.TRANSFER_VERIFICATION_CODE_SENT,
            "Transaction",
            transactionId,
            after(createdAt, 1),
          );
          addNotification(
            source.id,
            NotificationType.SECURITY_ALERT,
            "Transfer verification required",
            "Confirm this transfer with a one-time code before it can be completed.",
            after(createdAt, 1),
            false,
          );
        } else {
          addAudit(
            source.id,
            AuditAction.TRANSFER_FAILED,
            "Transaction",
            transactionId,
            after(createdAt, 1),
          );
          addNotification(
            source.id,
            NotificationType.TRANSACTION_UPDATE,
            "Transfer failed",
            "Your transfer could not be completed. No money was deducted.",
            after(createdAt, 1),
          );
        }
      }
    }

    const accounts: Prisma.AccountCreateManyInput[] = customers.map(
      (customer, index) => ({
        id: customer.accountId,
        userId: customer.id,
        accountNumber: customer.accountNumber,
        type: (index + 1) % 4 === 0 ? AccountType.CURRENT : AccountType.SAVINGS,
        balance: accountBalances[index]!,
        currency: "NGN",
        status: customer.status,
        createdAt: users[index]!.createdAt,
        updatedAt: users[index]!.createdAt,
      }),
    );

    const created = await prisma.$transaction(
      async (tx) => {
        const createdUsers = await createManyInBatches(users, (data) =>
          tx.user.createMany({ data, skipDuplicates: true }),
        );
        await tx.user.updateMany({
          where: { id: { in: customers.map(({ id }) => id) } },
          data: { passwordHash },
        });
        const createdAccounts = await createManyInBatches(accounts, (data) =>
          tx.account.createMany({ data, skipDuplicates: true }),
        );
        const createdBeneficiaries = await createManyInBatches(
          beneficiaries,
          (data) => tx.beneficiary.createMany({ data, skipDuplicates: true }),
        );
        const createdDeposits = await createManyInBatches(deposits, (data) =>
          tx.depositTransaction.createMany({ data, skipDuplicates: true }),
        );
        const createdTransactions = await createManyInBatches(
          transactions,
          (data) => tx.transaction.createMany({ data, skipDuplicates: true }),
        );
        const createdAssessments = await createManyInBatches(
          assessments,
          (data) =>
            tx.fraudAssessment.createMany({ data, skipDuplicates: true }),
        );
        await tx.fraudAssessment.updateMany({
          where: {
            id: { startsWith: "demo-fraud-" },
            riskLevel: FraudRiskLevel.MEDIUM,
            riskScore: { lt: 40 },
          },
          data: { riskScore: 40 },
        });
        const createdNotifications = await createManyInBatches(
          notifications,
          (data) => tx.notification.createMany({ data, skipDuplicates: true }),
        );
        await createManyInBatches(devices, (data) =>
          tx.device.createMany({ data, skipDuplicates: true }),
        );
        await createManyInBatches(sessions, (data) =>
          tx.refreshToken.createMany({ data, skipDuplicates: true }),
        );
        await createManyInBatches(conversations, (data) =>
          tx.chatConversation.createMany({ data, skipDuplicates: true }),
        );
        await createManyInBatches(messages, (data) =>
          tx.chatMessage.createMany({ data, skipDuplicates: true }),
        );
        const createdAuditLogs = await createManyInBatches(auditLogs, (data) =>
          tx.auditLog.createMany({ data, skipDuplicates: true }),
        );
        return {
          users: createdUsers,
          accounts: createdAccounts,
          beneficiaries: createdBeneficiaries,
          deposits: createdDeposits,
          transactions: createdTransactions,
          fraudAssessments: createdAssessments,
          notifications: createdNotifications,
          auditLogs: createdAuditLogs,
        };
      },
      { maxWait: 20_000, timeout: 120_000 },
    );

    const statusCounts = transactions.reduce<Record<TransactionStatus, number>>(
      (totals, transaction) => {
        const status = transaction.status ?? TransactionStatus.PENDING;
        totals[status] += 1;
        return totals;
      },
      {
        [TransactionStatus.PENDING]: 0,
        [TransactionStatus.COMPLETED]: 0,
        [TransactionStatus.HELD]: 0,
        [TransactionStatus.REJECTED]: 0,
        [TransactionStatus.FAILED]: 0,
      },
    );

    console.info("Nuel Bank demo data is ready.");
    console.info({
      configuredCustomers: count,
      newlyCreated: created,
      generatedTransactionMix: statusCounts,
      customerLogin: "demo001@nuel.test",
      administratorLogin: DEMO_ADMIN_EMAIL,
      password,
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

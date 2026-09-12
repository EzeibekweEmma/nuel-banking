import { ConfigService } from "@nestjs/config";
import { EmailJobStatus, EmailJobType } from "@prisma/client";
import { createTransport } from "nodemailer";
import { EmailOutboxService } from "./email-outbox.service";

jest.mock("nodemailer", () => ({ createTransport: jest.fn() }));

describe("EmailOutboxService", () => {
  const emailJob = {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = {
    emailJob,
    passwordResetToken: { findUnique: jest.fn() },
    emailVerificationToken: { findUnique: jest.fn() },
    transactionVerificationCode: { findUnique: jest.fn() },
  };
  const config = {
    get: jest.fn((key: string) =>
      key === "EMAIL_JOB_ENCRYPTION_SECRET" ? "e".repeat(32) : undefined,
    ),
    getOrThrow: jest.fn(),
  };
  const service = new EmailOutboxService(
    prisma as never,
    config as never as ConfigService,
  );
  const passwordResetPayload = {
    kind: EmailJobType.PASSWORD_RESET,
    email: "customer@example.com",
    firstName: "Ada",
    resetUrl: "https://bank.example/reset-password?token=secret-token",
    tokenHash: "a".repeat(64),
  } as const;

  beforeEach(() => jest.clearAllMocks());

  it("encrypts sensitive email payloads before inserting the job", async () => {
    emailJob.create.mockResolvedValue({});

    await service.enqueue(prisma as never, passwordResetPayload);

    const encryptedPayload = emailJob.create.mock.calls[0][0].data
      .encryptedPayload as string;
    expect(encryptedPayload).toMatch(/^v1\./);
    expect(encryptedPayload).not.toContain("secret-token");
    expect(emailJob.create).toHaveBeenCalledWith({
      data: {
        type: EmailJobType.PASSWORD_RESET,
        encryptedPayload: expect.any(String),
      },
    });
  });

  it("permanently discards a queued job whose security token is inactive", async () => {
    emailJob.create.mockResolvedValue({});
    await service.enqueue(prisma as never, passwordResetPayload);
    const encryptedPayload = emailJob.create.mock.calls[0][0].data
      .encryptedPayload as string;
    const now = new Date();
    emailJob.findFirst
      .mockResolvedValueOnce({ id: "job-1" })
      .mockResolvedValueOnce(null);
    emailJob.updateMany.mockResolvedValue({ count: 1 });
    emailJob.findUnique.mockResolvedValue({
      id: "job-1",
      type: EmailJobType.PASSWORD_RESET,
      encryptedPayload,
      status: EmailJobStatus.PROCESSING,
      attempts: 1,
      maxAttempts: 4,
      availableAt: now,
      lockedAt: now,
      lastError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    });
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);

    await service.processPendingJobs();

    expect(emailJob.updateMany).toHaveBeenLastCalledWith({
      where: { id: "job-1", status: EmailJobStatus.PROCESSING },
      data: {
        status: EmailJobStatus.FAILED,
        lockedAt: null,
        lastError: "RELATED_TOKEN_INACTIVE",
      },
    });
  });

  it("marks an active job as sent after SMTP accepts it", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "message-1" });
    const close = jest.fn();
    jest.mocked(createTransport).mockReturnValue({ sendMail, close } as never);
    config.getOrThrow.mockImplementation((key: string) =>
      key === "SMTP_HOST" ? "smtp.example.com" : "Nuel <mail@example.com>",
    );
    emailJob.create.mockResolvedValue({});
    await service.enqueue(prisma as never, passwordResetPayload);
    const encryptedPayload = emailJob.create.mock.calls[0][0].data
      .encryptedPayload as string;
    const now = new Date();
    emailJob.findFirst
      .mockResolvedValueOnce({ id: "job-2" })
      .mockResolvedValueOnce(null);
    emailJob.updateMany.mockResolvedValue({ count: 1 });
    emailJob.findUnique.mockResolvedValue({
      id: "job-2",
      type: EmailJobType.PASSWORD_RESET,
      encryptedPayload,
      status: EmailJobStatus.PROCESSING,
      attempts: 1,
      maxAttempts: 4,
      availableAt: now,
      lockedAt: now,
      lastError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    });
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service.processPendingJobs();

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: passwordResetPayload.email }),
    );
    expect(emailJob.updateMany).toHaveBeenLastCalledWith({
      where: { id: "job-2", status: EmailJobStatus.PROCESSING },
      data: {
        status: EmailJobStatus.SENT,
        sentAt: expect.any(Date),
        lockedAt: null,
        lastError: null,
      },
    });
  });

  it("registers background processing with the Vercel request lifetime", async () => {
    const waitUntil = jest.fn();
    const requestContext = Symbol.for("@vercel/request-context");
    Object.defineProperty(globalThis, requestContext, {
      configurable: true,
      value: { get: () => ({ waitUntil }) },
    });
    emailJob.findFirst.mockResolvedValue(null);

    try {
      service.scheduleProcessing();

      expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise));
      await waitUntil.mock.calls[0][0];
    } finally {
      Reflect.deleteProperty(globalThis, requestContext);
    }
  });

  it("retries SMTP three times before permanently failing the job", async () => {
    jest.useFakeTimers();
    const sendMail = jest.fn().mockRejectedValue({ code: "ECONNREFUSED" });
    jest.mocked(createTransport).mockReturnValue({
      sendMail,
      close: jest.fn(),
    } as never);
    config.getOrThrow.mockImplementation((key: string) =>
      key === "SMTP_HOST" ? "smtp.example.com" : "Nuel <mail@example.com>",
    );
    emailJob.create.mockResolvedValue({});
    await service.enqueue(prisma as never, passwordResetPayload);
    const encryptedPayload = emailJob.create.mock.calls[0][0].data
      .encryptedPayload as string;
    const now = new Date();
    emailJob.findFirst
      .mockResolvedValueOnce({ id: "job-3" })
      .mockResolvedValueOnce(null);
    emailJob.updateMany.mockResolvedValue({ count: 1 });
    emailJob.findUnique.mockResolvedValue({
      id: "job-3",
      type: EmailJobType.PASSWORD_RESET,
      encryptedPayload,
      status: EmailJobStatus.PROCESSING,
      attempts: 1,
      maxAttempts: 4,
      availableAt: now,
      lockedAt: now,
      lastError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    });
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
    });

    try {
      const processing = service.processPendingJobs();
      await jest.runAllTimersAsync();
      await processing;

      expect(sendMail).toHaveBeenCalledTimes(4);
      expect(emailJob.updateMany).toHaveBeenLastCalledWith({
        where: { id: "job-3", status: EmailJobStatus.PROCESSING },
        data: {
          status: EmailJobStatus.FAILED,
          lockedAt: null,
          lastError: "ECONNREFUSED",
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});

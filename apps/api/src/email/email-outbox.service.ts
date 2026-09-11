import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailJob, EmailJobStatus, EmailJobType, Prisma } from "@prisma/client";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { createTransport } from "nodemailer";
import { createEmailVerificationEmail } from "../auth/email-verification-email";
import { createPasswordResetEmail } from "../auth/password-reset-email";
import { PrismaService } from "../prisma/prisma.service";
import { createTransactionVerificationEmail } from "../transactions/transaction-verification-email";
import { EmailJobPayload, isEmailJobPayload } from "./email-job.types";

type EmailJobClient = Pick<Prisma.TransactionClient, "emailJob">;

const POLL_INTERVAL_MS = 2_000;
const STALE_LOCK_MS = 5 * 60 * 1000;
const MAXIMUM_JOBS_PER_RUN = 10;
const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000];

@Injectable()
export class EmailOutboxService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(EmailOutboxService.name);
  private interval?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    void this.processPendingJobs();
    this.interval = setInterval(() => {
      void this.processPendingJobs();
    }, POLL_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async enqueue(
    client: EmailJobClient,
    payload: EmailJobPayload,
  ): Promise<void> {
    await client.emailJob.create({
      data: {
        type: payload.kind,
        encryptedPayload: this.encrypt(payload),
      },
    });
  }

  async processPendingJobs(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      for (let index = 0; index < MAXIMUM_JOBS_PER_RUN; index += 1) {
        const job = await this.claimNextJob();
        if (!job) break;
        await this.processJob(job);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Email outbox processing failed (${this.errorCode(error)}).`,
      );
    } finally {
      this.processing = false;
    }
  }

  private async claimNextJob(): Promise<EmailJob | null> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
    const claimable = {
      OR: [
        { status: EmailJobStatus.PENDING, availableAt: { lte: now } },
        { status: EmailJobStatus.PROCESSING, lockedAt: { lte: staleBefore } },
      ],
    } satisfies Prisma.EmailJobWhereInput;
    const candidate = await this.prisma.emailJob.findFirst({
      where: claimable,
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!candidate) return null;

    const claimed = await this.prisma.emailJob.updateMany({
      where: { id: candidate.id, ...claimable },
      data: {
        status: EmailJobStatus.PROCESSING,
        lockedAt: now,
        attempts: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return null;
    return this.prisma.emailJob.findUnique({ where: { id: candidate.id } });
  }

  private async processJob(job: EmailJob): Promise<void> {
    try {
      const payload = this.decrypt(job.encryptedPayload);
      if (payload.kind !== job.type) throw new Error("EMAIL_JOB_TYPE_MISMATCH");
      if (!(await this.isRelatedTokenActive(payload))) {
        await this.failPermanently(job.id, "RELATED_TOKEN_INACTIVE");
        return;
      }
      await this.send(payload);
      await this.prisma.emailJob.updateMany({
        where: { id: job.id, status: EmailJobStatus.PROCESSING },
        data: {
          status: EmailJobStatus.SENT,
          sentAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
    } catch (error: unknown) {
      await this.retryOrFail(job, this.errorCode(error));
    }
  }

  private async isRelatedTokenActive(
    payload: EmailJobPayload,
  ): Promise<boolean> {
    const now = new Date();
    if (payload.kind === EmailJobType.PASSWORD_RESET) {
      const token = await this.prisma.passwordResetToken.findUnique({
        where: { tokenHash: payload.tokenHash },
        select: { expiresAt: true },
      });
      return Boolean(token && token.expiresAt > now);
    }
    if (payload.kind === EmailJobType.EMAIL_VERIFICATION) {
      const token = await this.prisma.emailVerificationToken.findUnique({
        where: { tokenHash: payload.tokenHash },
        select: { expiresAt: true },
      });
      return Boolean(token && token.expiresAt > now);
    }
    const code = await this.prisma.transactionVerificationCode.findUnique({
      where: { transactionId: payload.transactionId },
      select: { codeHash: true, expiresAt: true },
    });
    return Boolean(
      code && code.codeHash === payload.codeHash && code.expiresAt > now,
    );
  }

  private async send(payload: EmailJobPayload): Promise<void> {
    const host = this.config.getOrThrow<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? "587");
    const secure =
      this.config.get<string>("SMTP_SECURE") === "true" || port === 465;
    const user = this.config.get<string>("SMTP_USER");
    const password = this.config.get<string>("SMTP_PASSWORD");
    const from = this.config.getOrThrow<string>("EMAIL_FROM");
    const message =
      payload.kind === EmailJobType.PASSWORD_RESET
        ? createPasswordResetEmail(payload.firstName, payload.resetUrl)
        : payload.kind === EmailJobType.EMAIL_VERIFICATION
          ? createEmailVerificationEmail(
              payload.firstName,
              payload.verificationUrl,
            )
          : createTransactionVerificationEmail(payload);
    const transport = createTransport({
      host,
      port,
      secure,
      auth: user && password ? { user, pass: password } : undefined,
      requireTLS: this.config.get<string>("SMTP_REQUIRE_TLS") === "true",
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 10_000,
    });
    try {
      await transport.sendMail({
        from,
        to: payload.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: { "X-Auto-Response-Suppress": "All" },
      });
    } finally {
      transport.close();
    }
  }

  private async retryOrFail(job: EmailJob, errorCode: string): Promise<void> {
    if (job.attempts >= job.maxAttempts) {
      await this.failPermanently(job.id, errorCode);
      this.logger.error(
        `Email job ${job.id} failed after ${job.attempts} attempts (${errorCode}).`,
      );
      return;
    }
    const delay = RETRY_DELAYS_MS[Math.min(job.attempts - 1, 2)];
    await this.prisma.emailJob.updateMany({
      where: { id: job.id, status: EmailJobStatus.PROCESSING },
      data: {
        status: EmailJobStatus.PENDING,
        availableAt: new Date(Date.now() + delay),
        lockedAt: null,
        lastError: errorCode,
      },
    });
  }

  private async failPermanently(id: string, reason: string): Promise<void> {
    await this.prisma.emailJob.updateMany({
      where: { id, status: EmailJobStatus.PROCESSING },
      data: {
        status: EmailJobStatus.FAILED,
        lockedAt: null,
        lastError: reason,
      },
    });
  }

  private encrypt(payload: EmailJobPayload): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.encryptionKey(),
      initializationVector,
    );
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      initializationVector.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  private decrypt(encryptedPayload: string): EmailJobPayload {
    const [version, initializationVector, authenticationTag, encrypted] =
      encryptedPayload.split(".");
    if (
      version !== "v1" ||
      !initializationVector ||
      !authenticationTag ||
      !encrypted
    ) {
      throw new Error("INVALID_EMAIL_JOB_PAYLOAD");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey(),
      Buffer.from(initializationVector, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload: unknown = JSON.parse(decrypted);
    if (!isEmailJobPayload(payload)) {
      throw new Error("INVALID_EMAIL_JOB_PAYLOAD");
    }
    return payload;
  }

  private encryptionKey(): Buffer {
    const secret =
      this.config.get<string>("EMAIL_JOB_ENCRYPTION_SECRET") ??
      this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
    return createHash("sha256").update(secret).digest();
  }

  private errorCode(error: unknown): string {
    if (error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)) {
      return error.message;
    }
    if (typeof error === "object" && error !== null && "code" in error) {
      return String(error.code).slice(0, 80);
    }
    return "EMAIL_DELIVERY_FAILED";
  }
}

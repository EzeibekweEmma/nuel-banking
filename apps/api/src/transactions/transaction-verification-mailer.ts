import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import {
  createTransactionVerificationEmail,
  TransactionVerificationEmailDetails,
} from "./transaction-verification-email";

export interface TransactionVerificationDelivery extends TransactionVerificationEmailDetails {
  transactionId: string;
  codeHash: string;
  email: string;
}

const DELIVERY_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [1_000, 3_000, 9_000];

@Injectable()
export class TransactionVerificationMailer {
  private readonly logger = new Logger(TransactionVerificationMailer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  queue(delivery: TransactionVerificationDelivery): void {
    if (!this.hasSmtpConfiguration()) {
      this.logger.warn(
        "Transfer verification email was not queued because SMTP is not configured.",
      );
      return;
    }
    void this.deliver(delivery).catch(() => {
      this.logger.error("Background transfer verification delivery failed.");
    });
  }

  private async deliver(
    delivery: TransactionVerificationDelivery,
  ): Promise<void> {
    for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt += 1) {
      if (attempt > 1 && !(await this.isCodeActive(delivery))) return;
      if (await this.send(delivery)) {
        if (attempt > 1) {
          this.logger.log(
            `Transfer verification email delivered on attempt ${attempt}.`,
          );
        }
        return;
      }
      if (attempt < DELIVERY_ATTEMPTS) {
        await this.wait(RETRY_DELAYS_MS[attempt - 1]);
      }
    }
    this.logger.error(
      `Transfer verification email delivery failed after ${DELIVERY_ATTEMPTS} attempts.`,
    );
  }

  private async isCodeActive(
    delivery: TransactionVerificationDelivery,
  ): Promise<boolean> {
    const code = await this.prisma.transactionVerificationCode.findUnique({
      where: { transactionId: delivery.transactionId },
      select: { codeHash: true, expiresAt: true },
    });
    return Boolean(
      code &&
      code.codeHash === delivery.codeHash &&
      code.expiresAt > new Date(),
    );
  }

  private hasSmtpConfiguration(): boolean {
    const host = this.config.get<string>("SMTP_HOST");
    const from = this.config.get<string>("EMAIL_FROM");
    const user = this.config.get<string>("SMTP_USER");
    const password = this.config.get<string>("SMTP_PASSWORD");
    return Boolean(
      host && from && ((!user && !password) || (user && password)),
    );
  }

  private async send(
    delivery: TransactionVerificationDelivery,
  ): Promise<boolean> {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? "587");
    const secure =
      this.config.get<string>("SMTP_SECURE") === "true" || port === 465;
    const user = this.config.get<string>("SMTP_USER");
    const password = this.config.get<string>("SMTP_PASSWORD");
    const from = this.config.get<string>("EMAIL_FROM");
    if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535)
      return false;
    if ((user && !password) || (!user && password)) return false;

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
    const message = createTransactionVerificationEmail(delivery);
    try {
      await transport.sendMail({
        from,
        to: delivery.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: { "X-Auto-Response-Suppress": "All" },
      });
      return true;
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "UNKNOWN";
      this.logger.warn(
        `Transfer verification email delivery attempt failed (${code}).`,
      );
      return false;
    } finally {
      transport.close();
    }
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

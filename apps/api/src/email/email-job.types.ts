import { EmailJobType } from "@prisma/client";

interface PasswordResetEmailJob {
  kind: typeof EmailJobType.PASSWORD_RESET;
  email: string;
  firstName: string;
  resetUrl: string;
  tokenHash: string;
}

interface EmailVerificationJob {
  kind: typeof EmailJobType.EMAIL_VERIFICATION;
  email: string;
  firstName: string;
  verificationUrl: string;
  tokenHash: string;
}

interface TransferVerificationEmailJob {
  kind: typeof EmailJobType.TRANSFER_VERIFICATION;
  transactionId: string;
  codeHash: string;
  email: string;
  firstName: string;
  code: string;
  amount: string;
  currency: string;
  recipientName: string;
}

export type EmailJobPayload =
  | PasswordResetEmailJob
  | EmailVerificationJob
  | TransferVerificationEmailJob;

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every(
    (key) => typeof value[key] === "string" && value[key].length > 0,
  );
}

export function isEmailJobPayload(value: unknown): value is EmailJobPayload {
  if (!isStringRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === EmailJobType.PASSWORD_RESET) {
    return hasStrings(value, ["email", "firstName", "resetUrl", "tokenHash"]);
  }
  if (value.kind === EmailJobType.EMAIL_VERIFICATION) {
    return hasStrings(value, [
      "email",
      "firstName",
      "verificationUrl",
      "tokenHash",
    ]);
  }
  if (value.kind === EmailJobType.TRANSFER_VERIFICATION) {
    return hasStrings(value, [
      "transactionId",
      "codeHash",
      "email",
      "firstName",
      "code",
      "amount",
      "currency",
      "recipientName",
    ]);
  }
  return false;
}

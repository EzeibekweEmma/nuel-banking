import { Injectable } from "@nestjs/common";
import { EmailJobType } from "@prisma/client";
import { EmailOutboxService } from "../email/email-outbox.service";
import { FraudTransactionClient } from "../fraud/fraud.types";
import { TransactionVerificationEmailDetails } from "./transaction-verification-email";

export interface TransactionVerificationDelivery extends TransactionVerificationEmailDetails {
  transactionId: string;
  codeHash: string;
  email: string;
}

@Injectable()
export class TransactionVerificationMailer {
  constructor(private readonly emailOutbox: EmailOutboxService) {}

  async queue(
    transaction: FraudTransactionClient,
    delivery: TransactionVerificationDelivery,
  ): Promise<void> {
    await this.emailOutbox.enqueue(transaction, {
      kind: EmailJobType.TRANSFER_VERIFICATION,
      ...delivery,
    });
  }

  scheduleDelivery(): void {
    this.emailOutbox.scheduleProcessing();
  }
}

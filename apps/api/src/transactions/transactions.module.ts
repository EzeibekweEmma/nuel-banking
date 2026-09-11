import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FraudModule } from "../fraud/fraud.module";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { TransactionVerificationMailer } from "./transaction-verification-mailer";

@Module({
  imports: [AuthModule, FraudModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionVerificationMailer],
  exports: [TransactionsService],
})
export class TransactionsModule {}

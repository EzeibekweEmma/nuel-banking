import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AdminModule } from "./admin/admin.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BeneficiariesModule } from "./beneficiaries/beneficiaries.module";
import { ChatbotModule } from "./chatbot/chatbot.module";
import { FraudModule } from "./fraud/fraud.module";
import { FundingModule } from "./funding/funding.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    PrismaModule,
    RateLimitModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    BeneficiariesModule,
    FraudModule,
    FundingModule,
    ChatbotModule,
    NotificationsModule,
    AdminModule,
    AuditModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { FraudModule } from '../fraud/fraud.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({ imports: [AccountsModule, TransactionsModule, FraudModule], controllers: [ChatbotController], providers: [ChatbotService] })
export class ChatbotModule {}

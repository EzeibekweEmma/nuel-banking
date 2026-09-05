import { Module } from '@nestjs/common';
import { FraudModule } from '../fraud/fraud.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({ imports: [FraudModule], controllers: [TransactionsController], providers: [TransactionsService] })
export class TransactionsModule {}

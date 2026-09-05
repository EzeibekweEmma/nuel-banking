import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({ imports: [TransactionsModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}

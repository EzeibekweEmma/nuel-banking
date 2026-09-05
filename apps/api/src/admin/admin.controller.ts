import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminOnly } from '../auth/admin-only.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { TransactionsService } from '../transactions/transactions.service';
import { AdminService } from './admin.service';
import { PaginationDto } from './dto/pagination.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly transactionsService: TransactionsService) {}
  @Get('customers') customers(@Query() query: PaginationDto) { return this.adminService.customers(query); }
  @Get('transactions') transactions(@Query() query: TransactionQueryDto) { return this.adminService.transactions(query); }
  @Get('transactions/held') held(@Query() query: PaginationDto) { return this.adminService.heldTransactions(query); }
  @Get('fraud-assessments') assessments(@Query() query: PaginationDto) { return this.adminService.fraudAssessments(query); }
  @Get('audit-logs') auditLogs(@Query() query: PaginationDto) { return this.adminService.auditLogs(query); }
  @Post('transactions/:id/approve') approve(@CurrentUser() admin: AuthUser, @Param('id') id: string) { return this.transactionsService.approveHeld(admin.id, id); }
  @Post('transactions/:id/reject') reject(@CurrentUser() admin: AuthUser, @Param('id') id: string) { return this.transactionsService.rejectHeld(admin.id, id); }
}

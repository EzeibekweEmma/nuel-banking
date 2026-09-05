import { Controller, Get, Param, Post } from '@nestjs/common';
import { AdminOnly } from '../auth/admin-only.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { TransactionsService } from '../transactions/transactions.service';
import { AdminService } from './admin.service';

@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly transactionsService: TransactionsService) {}
  @Get('customers') customers() { return this.adminService.customers(); }
  @Get('transactions') transactions() { return this.adminService.transactions(); }
  @Get('transactions/held') held() { return this.adminService.heldTransactions(); }
  @Get('fraud-assessments') assessments() { return this.adminService.fraudAssessments(); }
  @Get('audit-logs') auditLogs() { return this.adminService.auditLogs(); }
  @Post('transactions/:id/approve') approve(@CurrentUser() admin: AuthUser, @Param('id') id: string) { return this.transactionsService.approveHeld(admin.id, id); }
  @Post('transactions/:id/reject') reject(@CurrentUser() admin: AuthUser, @Param('id') id: string) { return this.transactionsService.rejectHeld(admin.id, id); }
}

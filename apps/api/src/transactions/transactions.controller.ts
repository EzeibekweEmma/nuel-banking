import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransactionsService } from './transactions.service';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}
  @Post('transfer') transfer(@CurrentUser() user: AuthUser, @Headers('idempotency-key') idempotencyKey: string | undefined, @Body() dto: CreateTransferDto) {
    if (!idempotencyKey || idempotencyKey.length > 128) throw new BadRequestException('A valid Idempotency-Key header is required');
    return this.transactionsService.transfer(user.id, idempotencyKey, dto);
  }
  @Get() list(@CurrentUser() user: AuthUser) { return this.transactionsService.list(user.id); }
  @Get(':id') detail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.transactionsService.getDetail(user.id, id); }
}

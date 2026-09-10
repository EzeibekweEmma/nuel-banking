import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountsService } from './accounts.service';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}
  @Get('me') getOwnAccount(@CurrentUser() user: AuthUser) { return this.accountsService.getOwnAccount(user.id); }
  @Get('me/balance') getOwnBalance(@CurrentUser() user: AuthUser) { return this.accountsService.getOwnBalance(user.id); }
  @Get('lookup/:accountNumber') lookup(@CurrentUser() user: AuthUser, @Param('accountNumber') accountNumber: string) { return this.accountsService.lookupRecipient(user.id, accountNumber); }
}

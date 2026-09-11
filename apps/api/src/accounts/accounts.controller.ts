import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { AccountsService } from "./accounts.service";

@ApiTags("Accounts")
@AuthenticatedApi()
@UseGuards(JwtAuthGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the signed-in customer's account" })
  getOwnAccount(@CurrentUser() user: AuthUser) {
    return this.accountsService.getOwnAccount(user.id);
  }

  @Get("me/balance")
  @ApiOperation({ summary: "Get the available account balance" })
  getOwnBalance(@CurrentUser() user: AuthUser) {
    return this.accountsService.getOwnBalance(user.id);
  }

  @RateLimit({
    bucket: "account-lookup",
    limit: 30,
    windowMs: 60 * 1000,
    identity: "user",
  })
  @ApiOperation({ summary: "Look up a transfer recipient by account number" })
  @ApiParam({
    name: "accountNumber",
    description: "10-digit Nuel account number",
    example: "0123456789",
  })
  @Get("lookup/:accountNumber")
  lookup(
    @CurrentUser() user: AuthUser,
    @Param("accountNumber") accountNumber: string,
  ) {
    return this.accountsService.lookupRecipient(user.id, accountNumber);
  }
}

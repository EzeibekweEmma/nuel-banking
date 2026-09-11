import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiForbiddenResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly } from "../auth/admin-only.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import {
  AdminTransactionApiQueries,
  PaginationApiQueries,
} from "../documentation/query-parameters.decorator";
import { TransactionsService } from "../transactions/transactions.service";
import { AdminService } from "./admin.service";
import { AccountControlDto } from "./dto/account-control.dto";
import { PaginationDto } from "./dto/pagination.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";

@ApiTags("Administration")
@AuthenticatedApi()
@ApiForbiddenResponse({ description: "Administrator access is required." })
@AdminOnly()
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly transactionsService: TransactionsService,
  ) {}
  @ApiOperation({ summary: "List customer accounts" })
  @PaginationApiQueries()
  @Get("customers")
  customers(@Query() query: PaginationDto) {
    return this.adminService.customers(query);
  }
  @ApiOperation({ summary: "List and filter transactions" })
  @AdminTransactionApiQueries()
  @Get("transactions")
  transactions(@Query() query: TransactionQueryDto) {
    return this.adminService.transactions(query);
  }
  @ApiOperation({ summary: "List transactions awaiting staff review" })
  @PaginationApiQueries()
  @Get("transactions/held")
  held(@Query() query: PaginationDto) {
    return this.adminService.heldTransactions(query);
  }
  @ApiOperation({ summary: "List fraud assessments" })
  @PaginationApiQueries()
  @Get("fraud-assessments")
  assessments(@Query() query: PaginationDto) {
    return this.adminService.fraudAssessments(query);
  }
  @ApiOperation({ summary: "List security and administration audit logs" })
  @PaginationApiQueries()
  @Get("audit-logs")
  auditLogs(@Query() query: PaginationDto) {
    return this.adminService.auditLogs(query);
  }
  @ApiOperation({ summary: "Freeze a customer account with a reason" })
  @Patch("accounts/:id/freeze")
  freezeAccount(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: AccountControlDto,
  ) {
    return this.adminService.freezeAccount(admin.id, id, dto.reason);
  }
  @ApiOperation({ summary: "Unfreeze a customer account with a reason" })
  @Patch("accounts/:id/unfreeze")
  unfreezeAccount(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: AccountControlDto,
  ) {
    return this.adminService.unfreezeAccount(admin.id, id, dto.reason);
  }
  @ApiOperation({ summary: "Approve and settle a held transaction" })
  @Post("transactions/:id/approve")
  approve(@CurrentUser() admin: AuthUser, @Param("id") id: string) {
    return this.transactionsService.approveHeld(admin.id, id);
  }
  @ApiOperation({ summary: "Reject a held transaction" })
  @Post("transactions/:id/reject")
  reject(@CurrentUser() admin: AuthUser, @Param("id") id: string) {
    return this.transactionsService.rejectHeld(admin.id, id);
  }
}

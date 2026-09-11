import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { EmailVerifiedGuard } from "../auth/email-verified.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import {
  CustomerTransactionFilterApiQueries,
  PaginationApiQueries,
} from "../documentation/query-parameters.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { createClientFraudHints } from "../fraud/client-fraud-hints";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { CustomerTransactionQueryDto } from "./dto/customer-transaction-query.dto";
import { VerifyTransferDto } from "./dto/verify-transfer.dto";
import { TransactionsService } from "./transactions.service";

@ApiTags("Transactions")
@AuthenticatedApi()
@UseGuards(JwtAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}
  @RateLimit({
    bucket: "transfers",
    limit: 10,
    windowMs: 60 * 1000,
    identity: "user",
  })
  @UseGuards(EmailVerifiedGuard)
  @ApiOperation({
    summary: "Create a bank transfer",
    description:
      "The fraud engine may complete, hold, reject, or require email-code verification for the transfer.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Unique request key, up to 128 characters.",
  })
  @ApiHeader({
    name: "X-Device-Fingerprint",
    required: false,
    description: "Untrusted device hint used only by the fraud risk engine.",
  })
  @ApiHeader({
    name: "X-Location",
    required: false,
    description: "Untrusted location hint used only by the fraud risk engine.",
  })
  @Post("transfer")
  transfer(
    @CurrentUser() user: AuthUser,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-device-fingerprint") deviceFingerprint: string | undefined,
    @Headers("x-location") location: string | undefined,
    @Body() dto: CreateTransferDto,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 128)
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    return this.transactionsService.transfer(
      user.id,
      idempotencyKey,
      dto,
      createClientFraudHints(deviceFingerprint, location),
    );
  }
  @RateLimit({
    bucket: "transfer-verification",
    limit: 10,
    windowMs: 60 * 1000,
    identity: "user",
  })
  @UseGuards(EmailVerifiedGuard)
  @ApiOperation({ summary: "Verify a pending transfer using its email code" })
  @Post(":id/verify")
  verify(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: VerifyTransferDto,
  ) {
    return this.transactionsService.verify(user.id, id, dto.code);
  }
  @RateLimit({
    bucket: "transfer-code-resend",
    limit: 5,
    windowMs: 10 * 60 * 1000,
    identity: "user",
  })
  @UseGuards(EmailVerifiedGuard)
  @ApiOperation({ summary: "Resend a pending transfer verification code" })
  @Post(":id/verification-code")
  resendCode(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.transactionsService.resendVerificationCode(user.id, id);
  }
  @RateLimit({
    bucket: "transaction-history",
    limit: 60,
    windowMs: 60 * 1000,
    identity: "user",
  })
  @ApiOperation({
    summary: "List customer transactions",
    description:
      "Returns paginated incoming transfers, outgoing transfers, and deposits with server-side filters.",
  })
  @CustomerTransactionFilterApiQueries()
  @PaginationApiQueries(50)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: CustomerTransactionQueryDto,
  ) {
    return this.transactionsService.listPage(user.id, query);
  }
  @RateLimit({
    bucket: "statement-export",
    limit: 5,
    windowMs: 10 * 60 * 1000,
    identity: "user",
  })
  @ApiOperation({ summary: "Export a filtered account statement" })
  @ApiParam({
    name: "format",
    enum: ["csv", "pdf"],
    description: "Statement file format",
  })
  @ApiResponse({
    status: 200,
    description: "A downloadable CSV or PDF statement.",
    content: {
      "text/csv": { schema: { type: "string", format: "binary" } },
      "application/pdf": { schema: { type: "string", format: "binary" } },
    },
  })
  @CustomerTransactionFilterApiQueries()
  @Get("statement/:format")
  async statement(
    @CurrentUser() user: AuthUser,
    @Param("format") format: string,
    @Query() query: CustomerTransactionQueryDto,
  ): Promise<StreamableFile> {
    const statement = await this.transactionsService.exportStatement(
      user.id,
      format.toLowerCase(),
      query,
    );
    return new StreamableFile(statement.data, {
      type: statement.mimeType,
      disposition: `attachment; filename="${statement.fileName}"`,
    });
  }
  @ApiOperation({ summary: "Get transaction details visible to the customer" })
  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.transactionsService.getDetail(user.id, id);
  }
}

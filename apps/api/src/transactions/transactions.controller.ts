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
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { EmailVerifiedGuard } from "../auth/email-verified.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { createClientFraudHints } from "../fraud/client-fraud-hints";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { CustomerTransactionQueryDto } from "./dto/customer-transaction-query.dto";
import { VerifyTransferDto } from "./dto/verify-transfer.dto";
import { TransactionsService } from "./transactions.service";

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
  @Get(":id") detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.transactionsService.getDetail(user.id, id);
  }
}

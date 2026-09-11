import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { EmailVerifiedGuard } from "../auth/email-verified.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { createClientFraudHints } from "../fraud/client-fraud-hints";
import { CreateTransferDto } from "./dto/create-transfer.dto";
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
  @Get() list(@CurrentUser() user: AuthUser) {
    return this.transactionsService.list(user.id);
  }
  @Get(":id") detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.transactionsService.getDetail(user.id, id);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateDemoDepositDto } from "./dto/create-demo-deposit.dto";
import { FundingService } from "./funding.service";

@UseGuards(JwtAuthGuard)
@Controller("funding")
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Get("demo/configuration")
  configuration() {
    return this.fundingService.getDemoConfiguration();
  }

  @Post("demo")
  createDemoDeposit(
    @CurrentUser() user: AuthUser,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() dto: CreateDemoDepositDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key || key.length < 8 || key.length > 128) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }
    return this.fundingService.createDemoDeposit(user.id, key, dto);
  }

  @Get("deposits")
  deposits(@CurrentUser() user: AuthUser) {
    return this.fundingService.listDeposits(user.id);
  }
}

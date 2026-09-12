import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { EmailVerifiedGuard } from "../auth/email-verified.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import {
  DepositResponseDto,
  FundingConfigurationResponseDto,
} from "../documentation/dto/funding-response.dto";
import { CreateDemoDepositDto } from "./dto/create-demo-deposit.dto";
import { FundingService } from "./funding.service";

@ApiTags("Funding")
@AuthenticatedApi()
@UseGuards(JwtAuthGuard)
@Controller("funding")
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @ApiOperation({ summary: "Get demo-funding availability and limits" })
  @ApiOkResponse({ type: FundingConfigurationResponseDto })
  @Get("demo/configuration")
  configuration() {
    return this.fundingService.getDemoConfiguration();
  }

  @UseGuards(EmailVerifiedGuard)
  @ApiOperation({ summary: "Add controlled demo funds to an account" })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Unique key, 8–128 characters, preventing duplicate deposits.",
  })
  @ApiCreatedResponse({ type: DepositResponseDto })
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

  @ApiOperation({ summary: "List demo-funding deposits" })
  @ApiOkResponse({ type: [DepositResponseDto] })
  @Get("deposits")
  deposits(@CurrentUser() user: AuthUser) {
    return this.fundingService.listDeposits(user.id);
  }
}

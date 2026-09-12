import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { EmailVerifiedGuard } from "../auth/email-verified.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import { BeneficiaryResponseDto } from "../documentation/dto/api-response.dto";
import { BeneficiariesService } from "./beneficiaries.service";
import { CreateBeneficiaryDto } from "./dto/create-beneficiary.dto";

@ApiTags("Beneficiaries")
@AuthenticatedApi()
@UseGuards(JwtAuthGuard)
@Controller("beneficiaries")
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}
  @ApiOperation({ summary: "Save a verified transfer recipient" })
  @ApiCreatedResponse({ type: BeneficiaryResponseDto })
  @UseGuards(EmailVerifiedGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBeneficiaryDto) {
    return this.beneficiariesService.create(user.id, dto);
  }
  @ApiOperation({ summary: "List saved beneficiaries" })
  @ApiOkResponse({ type: [BeneficiaryResponseDto] })
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.beneficiariesService.list(user.id);
  }
  @ApiOperation({ summary: "Remove a saved beneficiary" })
  @ApiNoContentResponse({ description: "The beneficiary was removed." })
  @UseGuards(EmailVerifiedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id")
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<void> {
    await this.beneficiariesService.remove(user.id, id);
  }
}

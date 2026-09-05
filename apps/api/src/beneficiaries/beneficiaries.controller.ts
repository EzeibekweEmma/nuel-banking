import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@UseGuards(JwtAuthGuard)
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}
  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateBeneficiaryDto) { return this.beneficiariesService.create(user.id, dto); }
  @Get() list(@CurrentUser() user: AuthUser) { return this.beneficiariesService.list(user.id); }
  @Delete(':id') async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> { await this.beneficiariesService.remove(user.id, id); }
}

import { Module } from '@nestjs/common';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';

@Module({ controllers: [BeneficiariesController], providers: [BeneficiariesService] })
export class BeneficiariesModule {}

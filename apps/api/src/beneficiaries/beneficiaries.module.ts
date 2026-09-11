import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BeneficiariesController } from "./beneficiaries.controller";
import { BeneficiariesService } from "./beneficiaries.service";

@Module({
  imports: [AuthModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService],
})
export class BeneficiariesModule {}

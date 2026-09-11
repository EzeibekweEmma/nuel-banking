import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FundingController } from "./funding.controller";
import { FundingService } from "./funding.service";

@Module({
  imports: [AuthModule],
  controllers: [FundingController],
  providers: [FundingService],
})
export class FundingModule {}

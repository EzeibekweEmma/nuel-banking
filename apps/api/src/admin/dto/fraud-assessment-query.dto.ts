import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import {
  FraudDecision,
  FraudRiskLevel,
  TransactionStatus,
} from "@prisma/client";
import { PaginationDto } from "./pagination.dto";

export class FraudAssessmentQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(FraudRiskLevel)
  riskLevel?: FraudRiskLevel;

  @IsOptional()
  @IsEnum(FraudDecision)
  decision?: FraudDecision;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  query?: string;
}

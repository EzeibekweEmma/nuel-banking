import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { AccountStatus } from "@prisma/client";
import { PaginationDto } from "./pagination.dto";

export class CustomerQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}

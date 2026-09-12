import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTransferDto {
  @ApiProperty({ example: "0123456789", pattern: "^\\d{10}$" })
  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/)
  destinationAccountNumber!: string;

  @ApiProperty({
    example: "25000.00",
    description: "Positive NGN amount represented as a decimal string.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(18)
  amount!: string;

  @ApiPropertyOptional({ example: "September rent", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

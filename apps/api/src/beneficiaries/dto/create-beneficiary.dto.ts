import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateBeneficiaryDto {
  @ApiProperty({ example: "0123456789", pattern: "^\\d{10}$" })
  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/)
  accountNumber!: string;

  @ApiProperty({ example: "Mum", minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nickname!: string;
}

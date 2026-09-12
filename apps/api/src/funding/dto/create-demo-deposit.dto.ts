import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDemoDepositDto {
  @ApiProperty({
    example: "50000.00",
    description: "Positive NGN amount represented as a decimal string.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(18)
  amount!: string;
}

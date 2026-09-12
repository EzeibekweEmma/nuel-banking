import { IsString, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyTransferDto {
  @ApiProperty({ example: "381204", pattern: "^\\d{6}$" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "Verification code must contain 6 digits" })
  code!: string;
}

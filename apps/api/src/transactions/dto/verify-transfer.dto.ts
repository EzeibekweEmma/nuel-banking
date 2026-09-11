import { IsString, Matches } from "class-validator";

export class VerifyTransferDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "Verification code must contain 6 digits" })
  code!: string;
}

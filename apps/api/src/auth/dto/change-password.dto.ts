import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({ example: "SecureBank123!", format: "password" })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: "NewSecureBank456!", format: "password" })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "New password must include uppercase, lowercase, and numeric characters.",
  })
  newPassword!: string;
}

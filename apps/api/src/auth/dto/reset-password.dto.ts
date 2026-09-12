import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
  @ApiProperty({
    example: "cba01d3fd09a4bd6838e120d11318f7deaf71eb5c028c526fb453b95bc11edb2",
    description: "Token from the password-reset email link.",
  })
  @IsString()
  @MinLength(40)
  @MaxLength(128)
  token!: string;

  @ApiProperty({
    example: "NewSecureBank123!",
    minLength: 12,
    maxLength: 128,
    format: "password",
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must include uppercase, lowercase, and numeric characters.",
  })
  password!: string;
}

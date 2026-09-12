import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "ada@example.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "SecureBank123!", format: "password" })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

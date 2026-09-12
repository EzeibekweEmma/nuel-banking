import { IsEmail, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({ example: "ada@example.com", format: "email" })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

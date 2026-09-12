import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "ada@example.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Ada", minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "Okafor", minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    example: "SecureBank123!",
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

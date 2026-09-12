import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailDto {
  @ApiProperty({
    example: "cba01d3fd09a4bd6838e120d11318f7deaf71eb5c028c526fb453b95bc11edb2",
    description: "64-character token from the email-verification link.",
  })
  @IsString()
  @Length(64, 64)
  token!: string;
}

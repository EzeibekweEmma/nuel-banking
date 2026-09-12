import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LogoutDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token",
    description: "Refresh token for the session being signed out.",
  })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

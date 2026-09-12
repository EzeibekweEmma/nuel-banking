import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token",
  })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

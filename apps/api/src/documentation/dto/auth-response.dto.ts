import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthTokensResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token" })
  accessToken!: string;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token",
  })
  refreshToken!: string;

  @ApiProperty({
    example: "c22326d4-7a3b-4ee9-938a-bb30d3948dab",
    format: "uuid",
  })
  sessionId!: string;

  @ApiProperty({ example: true })
  emailVerificationRequired!: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ example: "The operation completed successfully." })
  message!: string;
}

export class DevelopmentLinkResponseDto extends MessageResponseDto {
  @ApiPropertyOptional({
    example:
      "http://localhost:3000/reset-password?token=cba01d3fd09a4bd6838e120d11318f7d",
    description: "Development-only link. Omitted in production.",
  })
  resetUrl?: string;

  @ApiPropertyOptional({
    example:
      "http://localhost:3000/verify-email?token=cba01d3fd09a4bd6838e120d11318f7d",
    description: "Development-only link. Omitted in production.",
  })
  verificationUrl?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: "cmf8customer01q2w3e4r5t6y7" })
  id!: string;

  @ApiProperty({ example: "ada@example.com", format: "email" })
  email!: string;

  @ApiProperty({ example: "Ada" })
  firstName!: string;

  @ApiProperty({ example: "Okafor" })
  lastName!: string;

  @ApiProperty({ enum: ["CUSTOMER", "ADMIN"], example: "CUSTOMER" })
  role!: string;

  @ApiProperty({
    example: "2026-09-11T12:00:00.000Z",
    format: "date-time",
    nullable: true,
  })
  emailVerifiedAt!: string | null;
}

export class ProfileResponseDto extends UserResponseDto {
  @ApiProperty({ example: "2026-09-01T09:30:00.000Z", format: "date-time" })
  createdAt!: string;
}

export class ActiveSessionResponseDto {
  @ApiProperty({
    example: "c22326d4-7a3b-4ee9-938a-bb30d3948dab",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({ example: "Mozilla/5.0 Chrome/140.0", nullable: true })
  userAgent!: string | null;

  @ApiProperty({ example: "127.0.0.1", nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ example: "2026-09-18T12:00:00.000Z", format: "date-time" })
  expiresAt!: string;
}

import { ApiProperty } from "@nestjs/swagger";

export class FundingLimitsResponseDto {
  @ApiProperty({ example: 100 })
  minimumAmount!: number;

  @ApiProperty({ example: 500000 })
  maximumAmount!: number;

  @ApiProperty({ example: 1000000 })
  dailyAmount!: number;

  @ApiProperty({ example: 5 })
  dailyDeposits!: number;
}

export class FundingConfigurationResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ type: () => FundingLimitsResponseDto })
  limits!: FundingLimitsResponseDto;
}

export class DepositResponseDto {
  @ApiProperty({ example: "cmf8deposit01q2w3e4r5t6y7" })
  id!: string;

  @ApiProperty({ example: "cmf8account01q2w3e4r5t6y7u" })
  accountId!: string;

  @ApiProperty({ example: "50000.00" })
  amount!: string;

  @ApiProperty({ example: "175000.00" })
  balanceAfter!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ example: "DEP-20260911-A1B2C3" })
  reference!: string;

  @ApiProperty({ example: "funding-20260911-a1b2c3d4" })
  idempotencyKey!: string;

  @ApiProperty({
    example: "fb6cb621ba7a2fb9895027f68e1a7f3d4fc0a30c59d1c804d556815e95c2f672",
  })
  requestHash!: string;

  @ApiProperty({ enum: ["DEMO"], example: "DEMO" })
  source!: string;

  @ApiProperty({ enum: ["COMPLETED"], example: "COMPLETED" })
  status!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  completedAt!: string;
}

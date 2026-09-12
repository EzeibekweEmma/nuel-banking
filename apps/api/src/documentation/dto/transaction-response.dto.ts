import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FraudAssessmentResponseDto {
  @ApiProperty({ example: 25, minimum: 0, maximum: 100 })
  riskScore!: number;

  @ApiProperty({ enum: ["LOW", "MEDIUM", "HIGH"], example: "LOW" })
  riskLevel!: string;

  @ApiProperty({ enum: ["APPROVE", "VERIFY", "HOLD"], example: "APPROVE" })
  decision!: string;

  @ApiProperty({ example: ["New device"], type: [String] })
  reasons!: string[];
}

export class CounterpartyResponseDto {
  @ApiProperty({ example: "Chidi Eze" })
  name!: string;

  @ApiProperty({ example: "0123456789", nullable: true })
  accountNumber!: string | null;
}

export class TransactionResponseDto {
  @ApiProperty({ example: "cmf8transaction01q2w3e4r5t" })
  id!: string;

  @ApiProperty({ enum: ["TRANSFER", "DEPOSIT"], example: "TRANSFER" })
  kind!: string;

  @ApiProperty({ enum: ["DEBIT", "CREDIT"], example: "DEBIT" })
  direction!: string;

  @ApiProperty({ example: "25000.00", description: "Decimal string." })
  amount!: string;

  @ApiProperty({ example: "NUE-20260911-A1B2C3" })
  reference!: string;

  @ApiProperty({ example: "September rent", nullable: true })
  description!: string | null;

  @ApiProperty({
    enum: ["PENDING", "COMPLETED", "HELD", "REJECTED", "FAILED"],
    example: "COMPLETED",
  })
  status!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({
    example: "2026-09-11T12:00:01.000Z",
    format: "date-time",
    nullable: true,
  })
  completedAt!: string | null;

  @ApiPropertyOptional({ example: "100000.00", nullable: true })
  balanceAfter?: string | null;

  @ApiProperty({ type: () => CounterpartyResponseDto })
  counterparty!: CounterpartyResponseDto;

  @ApiPropertyOptional({
    type: () => FraudAssessmentResponseDto,
    nullable: true,
  })
  fraudAssessment?: FraudAssessmentResponseDto | null;
}

export class TransactionSummaryResponseDto {
  @ApiProperty({ example: "50000.00" })
  moneyIn!: string;

  @ApiProperty({ example: "25000.00" })
  moneyOut!: string;
}

export class PaginatedTransactionsResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data!: TransactionResponseDto[];

  @ApiProperty({ example: 24 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;

  @ApiProperty({ type: () => TransactionSummaryResponseDto })
  summary!: TransactionSummaryResponseDto;
}

export class TransferRecordResponseDto {
  @ApiProperty({ example: "cmf8transaction01q2w3e4r5t" })
  id!: string;

  @ApiProperty({ example: "cmf8account01q2w3e4r5t6y7u" })
  sourceAccountId!: string;

  @ApiProperty({ example: "cmf8account02q2w3e4r5t6y7u" })
  destinationAccountId!: string;

  @ApiProperty({ example: null, nullable: true })
  beneficiaryId!: string | null;

  @ApiProperty({ example: "25000.00", description: "Decimal string." })
  amount!: string;

  @ApiProperty({ example: "9b937808-7ea1-4e68-a465-92d231e38b27" })
  reference!: string;

  @ApiProperty({ example: "transfer-20260911-a1b2c3d4" })
  idempotencyKey!: string;

  @ApiProperty({
    example: "7eced041fcda4cf2f130b0a554d101b12c7b9bff67e3d68c524c7d87416e8b50",
    nullable: true,
  })
  requestHash!: string | null;

  @ApiProperty({ example: "September rent", nullable: true })
  description!: string | null;

  @ApiProperty({
    enum: ["PENDING", "COMPLETED", "HELD", "REJECTED", "FAILED"],
    example: "COMPLETED",
  })
  status!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({
    example: "2026-09-11T12:00:01.000Z",
    format: "date-time",
    nullable: true,
  })
  completedAt!: string | null;

  @ApiProperty({ example: null, format: "date-time", nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  reviewedById!: string | null;
}

import { ApiProperty } from "@nestjs/swagger";
import { AccountOwnerResponseDto } from "./account-response.dto";
import { ProfileResponseDto } from "./auth-response.dto";
import {
  FraudAssessmentResponseDto,
  TransferRecordResponseDto,
} from "./transaction-response.dto";

export class AdminFraudRiskSummaryResponseDto {
  @ApiProperty({ example: 1148 })
  low!: number;

  @ApiProperty({ example: 210 })
  medium!: number;

  @ApiProperty({ example: 393 })
  high!: number;
}

export class AdminFraudDecisionSummaryResponseDto {
  @ApiProperty({ example: 1148 })
  approve!: number;

  @ApiProperty({ example: 210 })
  verify!: number;

  @ApiProperty({ example: 393 })
  hold!: number;
}

export class AdminFraudSummaryResponseDto {
  @ApiProperty({ type: () => AdminFraudRiskSummaryResponseDto })
  risk!: AdminFraudRiskSummaryResponseDto;

  @ApiProperty({ type: () => AdminFraudDecisionSummaryResponseDto })
  decisions!: AdminFraudDecisionSummaryResponseDto;
}

export class AdminOverviewResponseDto {
  @ApiProperty({ example: 302 })
  customers!: number;

  @ApiProperty({ example: 1753 })
  transactions!: number;

  @ApiProperty({ example: 194 })
  held!: number;

  @ApiProperty({ example: 1753 })
  assessments!: number;

  @ApiProperty({ type: () => AdminFraudSummaryResponseDto })
  fraud!: AdminFraudSummaryResponseDto;
}

export class AdminAccountSummaryResponseDto {
  @ApiProperty({ example: "cmf8account01q2w3e4r5t6y7u" })
  id!: string;

  @ApiProperty({ example: "0123456789", pattern: "^\\d{10}$" })
  accountNumber!: string;

  @ApiProperty({ enum: ["SAVINGS", "CURRENT"], example: "SAVINGS" })
  type!: string;

  @ApiProperty({ example: "125000.00", description: "Decimal string." })
  balance!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ enum: ["ACTIVE", "FROZEN", "CLOSED"], example: "ACTIVE" })
  status!: string;

  @ApiProperty({ example: "2026-09-01T09:30:00.000Z", format: "date-time" })
  createdAt!: string;
}

export class AdminCustomerResponseDto extends ProfileResponseDto {
  @ApiProperty({ type: [AdminAccountSummaryResponseDto] })
  accounts!: AdminAccountSummaryResponseDto[];
}

export class PaginatedCustomersResponseDto {
  @ApiProperty({ type: [AdminCustomerResponseDto] })
  data!: AdminCustomerResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class AdminTransactionAccountResponseDto {
  @ApiProperty({ example: "0123456789" })
  accountNumber!: string;

  @ApiProperty({ type: () => AccountOwnerResponseDto })
  user!: AccountOwnerResponseDto;
}

export class FraudAssessmentRecordResponseDto extends FraudAssessmentResponseDto {
  @ApiProperty({ example: "cmf8fraud01q2w3e4r5t6y7" })
  id!: string;

  @ApiProperty({ example: "cmf8transaction01q2w3e4r5t" })
  transactionId!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;
}

export class AdminTransactionResponseDto extends TransferRecordResponseDto {
  @ApiProperty({ type: () => AdminTransactionAccountResponseDto })
  sourceAccount!: AdminTransactionAccountResponseDto;

  @ApiProperty({ type: () => AdminTransactionAccountResponseDto })
  destinationAccount!: AdminTransactionAccountResponseDto;

  @ApiProperty({
    type: () => FraudAssessmentRecordResponseDto,
    nullable: true,
  })
  fraudAssessment!: FraudAssessmentRecordResponseDto | null;
}

export class PaginatedAdminTransactionsResponseDto {
  @ApiProperty({ type: [AdminTransactionResponseDto] })
  data!: AdminTransactionResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class AdminFraudTransactionResponseDto {
  @ApiProperty({ example: "cmf8transaction01q2w3e4r5t" })
  id!: string;

  @ApiProperty({ example: "9b937808-7ea1-4e68-a465-92d231e38b27" })
  reference!: string;

  @ApiProperty({
    enum: ["PENDING", "COMPLETED", "HELD", "REJECTED", "FAILED"],
    example: "HELD",
  })
  status!: string;

  @ApiProperty({ example: "25000.00", description: "Decimal string." })
  amount!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: () => AdminTransactionAccountResponseDto })
  sourceAccount!: AdminTransactionAccountResponseDto;

  @ApiProperty({ type: () => AdminTransactionAccountResponseDto })
  destinationAccount!: AdminTransactionAccountResponseDto;
}

export class AdminFraudAssessmentResponseDto extends FraudAssessmentRecordResponseDto {
  @ApiProperty({ type: () => AdminFraudTransactionResponseDto })
  transaction!: AdminFraudTransactionResponseDto;
}

export class PaginatedFraudAssessmentsResponseDto {
  @ApiProperty({ type: [AdminFraudAssessmentResponseDto] })
  data!: AdminFraudAssessmentResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class AuditUserResponseDto {
  @ApiProperty({ example: "admin@nuel.test", format: "email" })
  email!: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ example: "cmf8audit01q2w3e4r5t6y7u" })
  id!: string;

  @ApiProperty({ example: "cmf8admin01q2w3e4r5t6y7", nullable: true })
  userId!: string | null;

  @ApiProperty({ example: "ACCOUNT_FROZEN" })
  action!: string;

  @ApiProperty({ example: "Account" })
  entityType!: string;

  @ApiProperty({ example: "cmf8account01q2w3e4r5t6y7u", nullable: true })
  entityId!: string | null;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { reason: "Customer reported an unrecognized device login." },
    nullable: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: () => AuditUserResponseDto, nullable: true })
  user!: AuditUserResponseDto | null;
}

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data!: AuditLogResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class AccountControlResponseDto {
  @ApiProperty({ example: "cmf8account01q2w3e4r5t6y7u" })
  id!: string;

  @ApiProperty({ example: "0123456789" })
  accountNumber!: string;

  @ApiProperty({ enum: ["ACTIVE", "FROZEN"], example: "FROZEN" })
  status!: string;
}

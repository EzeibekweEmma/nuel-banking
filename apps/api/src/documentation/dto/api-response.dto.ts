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

export class AccountOwnerResponseDto {
  @ApiProperty({ example: "Ada" })
  firstName!: string;

  @ApiProperty({ example: "Okafor" })
  lastName!: string;
}

export class AccountResponseDto {
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

  @ApiProperty({ type: () => AccountOwnerResponseDto })
  user!: AccountOwnerResponseDto;
}

export class BalanceResponseDto {
  @ApiProperty({ example: "125000.00", description: "Decimal string." })
  balance!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;
}

export class RecipientResponseDto {
  @ApiProperty({ example: "0123456789" })
  accountNumber!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ example: "Chidi" })
  firstName!: string;

  @ApiProperty({ example: "Eze" })
  lastName!: string;
}

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

export class BeneficiaryAccountResponseDto {
  @ApiProperty({ example: "0123456789" })
  accountNumber!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ type: () => AccountOwnerResponseDto })
  user!: AccountOwnerResponseDto;
}

export class BeneficiaryResponseDto {
  @ApiProperty({ example: "cmf8beneficiary01q2w3e4r5" })
  id!: string;

  @ApiProperty({ example: "Mum" })
  nickname!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: () => BeneficiaryAccountResponseDto })
  account!: BeneficiaryAccountResponseDto;
}

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

export class NotificationResponseDto {
  @ApiProperty({ example: "cmf8notification01q2w3e4r5" })
  id!: string;

  @ApiProperty({
    enum: ["FRAUD_ALERT", "TRANSACTION_UPDATE", "SECURITY_ALERT"],
    example: "TRANSACTION_UPDATE",
  })
  type!: string;

  @ApiProperty({ example: "Money received" })
  title!: string;

  @ApiProperty({ example: "You received ₦25,000.00 from Chidi Eze." })
  message!: string;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;
}

export class UpdatedCountResponseDto {
  @ApiProperty({ example: 3 })
  updated!: number;
}

export class ChatResponseDto {
  @ApiProperty({ example: "cmf8chat01q2w3e4r5t6y7u8" })
  conversationId!: string;

  @ApiProperty({
    example: "Your available balance is ₦125,000.00 in your savings account.",
  })
  response!: string;
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

  @ApiProperty({ example: "cmf8admin01q2w3e4r5t6y7u", nullable: true })
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
    example: { reason: "Customer reported a stolen phone" },
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

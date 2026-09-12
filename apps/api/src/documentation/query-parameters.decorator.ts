import { applyDecorators } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";

const transactionStatuses = [
  "PENDING",
  "COMPLETED",
  "HELD",
  "REJECTED",
  "FAILED",
];

const auditActions = [
  "REGISTRATION_SUCCEEDED",
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "TRANSFER_CREATED",
  "TRANSFER_COMPLETED",
  "TRANSFER_HELD",
  "TRANSFER_FAILED",
  "TRANSACTION_APPROVED",
  "TRANSACTION_REJECTED",
  "FRAUD_ASSESSMENT_GENERATED",
  "FRAUD_ALERT_GENERATED",
  "ADMIN_REVIEW_PERFORMED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "EMAIL_VERIFICATION_REQUESTED",
  "EMAIL_VERIFIED",
  "TRANSFER_VERIFICATION_CODE_SENT",
  "TRANSFER_VERIFICATION_SUCCEEDED",
  "TRANSFER_VERIFICATION_FAILED",
  "ACCOUNT_FROZEN",
  "ACCOUNT_UNFROZEN",
  "DEMO_DEPOSIT_COMPLETED",
  "PASSWORD_CHANGED",
  "PROFILE_UPDATED",
  "SESSION_REVOKED",
];

export function PaginationApiQueries(maximumLimit = 100): MethodDecorator {
  return applyDecorators(
    ApiQuery({
      name: "page",
      required: false,
      type: Number,
      minimum: 1,
      example: 1,
    }),
    ApiQuery({
      name: "limit",
      required: false,
      type: Number,
      minimum: 1,
      maximum: maximumLimit,
      example: 20,
    }),
  );
}

export function NotificationFilterApiQueries(): MethodDecorator {
  return applyDecorators(
    PaginationApiQueries(50),
    ApiQuery({
      name: "unreadOnly",
      required: false,
      type: Boolean,
      example: true,
      description: "Return only notifications that have not been read.",
    }),
  );
}

export function CustomerTransactionFilterApiQueries(): MethodDecorator {
  return applyDecorators(
    ApiQuery({
      name: "status",
      required: false,
      enum: transactionStatuses,
    }),
    ApiQuery({
      name: "direction",
      required: false,
      enum: ["CREDIT", "DEBIT"],
    }),
    ApiQuery({
      name: "query",
      required: false,
      type: String,
      maxLength: 100,
      description: "Search by name, account number, description, or reference.",
    }),
    ApiQuery({
      name: "from",
      required: false,
      type: String,
      format: "date",
      description: "Inclusive start date in ISO 8601 format.",
    }),
    ApiQuery({
      name: "to",
      required: false,
      type: String,
      format: "date",
      description: "Inclusive end date in ISO 8601 format.",
    }),
  );
}

export function AdminTransactionApiQueries(): MethodDecorator {
  return applyDecorators(
    PaginationApiQueries(),
    ApiQuery({
      name: "status",
      required: false,
      enum: transactionStatuses,
    }),
    ApiQuery({
      name: "riskLevel",
      required: false,
      enum: ["LOW", "MEDIUM", "HIGH"],
    }),
    ApiQuery({
      name: "query",
      required: false,
      type: String,
      maxLength: 100,
      description:
        "Search by reference, customer name, or source/destination account number.",
      example: "0123456789",
    }),
  );
}

export function HeldTransactionFilterApiQueries(): MethodDecorator {
  return applyDecorators(
    PaginationApiQueries(),
    ApiQuery({
      name: "query",
      required: false,
      type: String,
      maxLength: 100,
      description:
        "Search held transfers by reference, customer name, or account number.",
      example: "0123456789",
    }),
  );
}

export function AuditLogFilterApiQueries(): MethodDecorator {
  return applyDecorators(
    PaginationApiQueries(),
    ApiQuery({ name: "action", required: false, enum: auditActions }),
    ApiQuery({
      name: "entityType",
      required: false,
      enum: [
        "User",
        "Account",
        "Transaction",
        "FraudAssessment",
        "Notification",
        "DepositTransaction",
        "RefreshToken",
      ],
    }),
    ApiQuery({
      name: "query",
      required: false,
      type: String,
      maxLength: 100,
      description: "Search by administrator email, entity ID, or entity type.",
      example: "admin@nuel.test",
    }),
  );
}

export function CustomerAccountFilterApiQueries(): MethodDecorator {
  return applyDecorators(
    PaginationApiQueries(),
    ApiQuery({
      name: "query",
      required: false,
      type: String,
      maxLength: 100,
      description: "Search by customer name, email, or account number.",
      example: "Ada",
    }),
    ApiQuery({
      name: "status",
      required: false,
      enum: ["ACTIVE", "FROZEN", "CLOSED"],
    }),
  );
}

export function FraudAssessmentFilterApiQueries(): MethodDecorator {
  return applyDecorators(
    PaginationApiQueries(),
    ApiQuery({
      name: "riskLevel",
      required: false,
      enum: ["LOW", "MEDIUM", "HIGH"],
    }),
    ApiQuery({
      name: "decision",
      required: false,
      enum: ["APPROVE", "VERIFY", "HOLD"],
    }),
    ApiQuery({
      name: "status",
      required: false,
      enum: transactionStatuses,
    }),
    ApiQuery({
      name: "query",
      required: false,
      type: String,
      maxLength: 100,
      description:
        "Search by transaction reference, customer name, or account number.",
      example: "0123456789",
    }),
  );
}

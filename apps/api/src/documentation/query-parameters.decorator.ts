import { applyDecorators } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";

const transactionStatuses = [
  "PENDING",
  "COMPLETED",
  "HELD",
  "REJECTED",
  "FAILED",
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
  );
}

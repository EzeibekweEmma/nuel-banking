CREATE TYPE "FundingSource" AS ENUM ('DEMO');

ALTER TYPE "AuditAction" ADD VALUE 'DEMO_DEPOSIT_COMPLETED';

CREATE TABLE "DepositTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "source" "FundingSource" NOT NULL DEFAULT 'DEMO',
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepositTransaction_reference_key" ON "DepositTransaction"("reference");
CREATE UNIQUE INDEX "DepositTransaction_accountId_idempotencyKey_key" ON "DepositTransaction"("accountId", "idempotencyKey");
CREATE INDEX "DepositTransaction_accountId_createdAt_idx" ON "DepositTransaction"("accountId", "createdAt");
CREATE INDEX "DepositTransaction_status_createdAt_idx" ON "DepositTransaction"("status", "createdAt");

ALTER TABLE "DepositTransaction" ADD CONSTRAINT "DepositTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

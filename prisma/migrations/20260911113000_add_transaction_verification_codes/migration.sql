-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'TRANSFER_VERIFICATION_CODE_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSFER_VERIFICATION_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSFER_VERIFICATION_FAILED';

-- CreateTable
CREATE TABLE "TransactionVerificationCode" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionVerificationCode_transactionId_key" ON "TransactionVerificationCode"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionVerificationCode_expiresAt_idx" ON "TransactionVerificationCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "TransactionVerificationCode" ADD CONSTRAINT "TransactionVerificationCode_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

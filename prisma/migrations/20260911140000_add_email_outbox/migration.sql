CREATE TYPE "EmailJobType" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION', 'TRANSFER_VERIFICATION');

CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "type" "EmailJobType" NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailJob_status_availableAt_idx" ON "EmailJob"("status", "availableAt");
CREATE INDEX "EmailJob_status_lockedAt_idx" ON "EmailJob"("status", "lockedAt");

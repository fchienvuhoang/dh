CREATE TABLE "StatementShareBatch" (
  "id" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "transactionCount" INTEGER NOT NULL,
  "totalCredit" DECIMAL(18,2) NOT NULL,
  "totalDebit" DECIMAL(18,2) NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "StatementShareBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StatementShareBatch_bankName_sentAt_idx" ON "StatementShareBatch"("bankName", "sentAt");
ALTER TABLE "BankTransaction" ADD COLUMN "shareBatchId" TEXT;
CREATE INDEX "BankTransaction_shareBatchId_idx" ON "BankTransaction"("shareBatchId");
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_shareBatchId_fkey" FOREIGN KEY ("shareBatchId") REFERENCES "StatementShareBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

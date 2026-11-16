CREATE TABLE "BankLedger" (
  "bankName" TEXT NOT NULL,
  "trackingFrom" TIMESTAMP(3) NOT NULL,
  "openingBalance" DECIMAL(18,2) NOT NULL,
  "openingCampaignId" TEXT,
  "confirmedBalance" DECIMAL(18,2) NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankLedger_pkey" PRIMARY KEY ("bankName"),
  CONSTRAINT "BankLedger_openingCampaignId_fkey" FOREIGN KEY ("openingCampaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "ImportBatch" ADD COLUMN "ignoredRows" INTEGER NOT NULL DEFAULT 0;

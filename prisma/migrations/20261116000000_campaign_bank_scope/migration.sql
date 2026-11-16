ALTER TABLE "Campaign" ADD COLUMN "bankName" TEXT NOT NULL DEFAULT 'TECHCOMBANK';
CREATE INDEX "Campaign_bankName_status_createdAt_idx" ON "Campaign"("bankName", "status", "createdAt");

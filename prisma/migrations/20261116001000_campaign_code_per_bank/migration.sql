CREATE UNIQUE INDEX "Campaign_bankName_code_key" ON "Campaign"("bankName", "code");
DROP INDEX "Campaign_code_key";

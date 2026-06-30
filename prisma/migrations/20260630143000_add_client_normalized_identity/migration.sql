ALTER TABLE "Client" ADD COLUMN "normalizedEmail" TEXT;
ALTER TABLE "Client" ADD COLUMN "normalizedPhone" TEXT;

CREATE UNIQUE INDEX "Client_tenantId_normalizedEmail_key" ON "Client"("tenantId", "normalizedEmail");
CREATE UNIQUE INDEX "Client_tenantId_normalizedPhone_key" ON "Client"("tenantId", "normalizedPhone");

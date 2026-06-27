DO $$ BEGIN
  CREATE TYPE "ClientRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClientFlagType" AS ENUM ('NO_SHOW', 'LATE_CANCEL', 'UNPAID', 'BEHAVIOR', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "riskLevel" "ClientRiskLevel" NOT NULL DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS "noShowCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ClientFlag" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "type" "ClientFlagType" NOT NULL,
  "severity" "ClientRiskLevel" NOT NULL DEFAULT 'LOW',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Client_tenantId_riskLevel_idx" ON "Client"("tenantId", "riskLevel");
CREATE INDEX IF NOT EXISTS "ClientFlag_clientId_idx" ON "ClientFlag"("clientId");
CREATE INDEX IF NOT EXISTS "ClientFlag_tenantId_idx" ON "ClientFlag"("tenantId");
CREATE INDEX IF NOT EXISTS "ClientFlag_tenantId_clientId_idx" ON "ClientFlag"("tenantId", "clientId");
CREATE INDEX IF NOT EXISTS "ClientFlag_tenantId_severity_idx" ON "ClientFlag"("tenantId", "severity");
CREATE INDEX IF NOT EXISTS "ClientFlag_tenantId_type_idx" ON "ClientFlag"("tenantId", "type");

DO $$ BEGIN
  ALTER TABLE "ClientFlag"
    ADD CONSTRAINT "ClientFlag_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClientFlag"
    ADD CONSTRAINT "ClientFlag_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

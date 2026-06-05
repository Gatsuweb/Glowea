CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Review_tenantId_idx" ON "Review"("tenantId");
CREATE INDEX IF NOT EXISTS "Review_tenantId_isVisible_idx" ON "Review"("tenantId", "isVisible");
CREATE INDEX IF NOT EXISTS "Review_tenantId_createdAt_idx" ON "Review"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_tenantId_fkey'
  ) THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

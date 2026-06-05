ALTER TABLE "Service"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "PublicProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "businessName" TEXT,
  "ownerName" TEXT,
  "description" TEXT,
  "address" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "instagramUrl" TEXT,
  "websiteUrl" TEXT,
  "openingHours" TEXT,
  "coverImageUrl" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PublicProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GalleryImage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicProfile_tenantId_key" ON "PublicProfile"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "PublicProfile_slug_key" ON "PublicProfile"("slug");
CREATE INDEX IF NOT EXISTS "PublicProfile_slug_idx" ON "PublicProfile"("slug");
CREATE INDEX IF NOT EXISTS "PublicProfile_tenantId_isPublished_idx" ON "PublicProfile"("tenantId", "isPublished");

CREATE INDEX IF NOT EXISTS "GalleryImage_tenantId_idx" ON "GalleryImage"("tenantId");
CREATE INDEX IF NOT EXISTS "GalleryImage_tenantId_isPublic_idx" ON "GalleryImage"("tenantId", "isPublic");
CREATE INDEX IF NOT EXISTS "GalleryImage_tenantId_sortOrder_idx" ON "GalleryImage"("tenantId", "sortOrder");

CREATE INDEX IF NOT EXISTS "Service_tenantId_isPublic_idx" ON "Service"("tenantId", "isPublic");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PublicProfile_tenantId_fkey'
  ) THEN
    ALTER TABLE "PublicProfile"
      ADD CONSTRAINT "PublicProfile_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GalleryImage_tenantId_fkey'
  ) THEN
    ALTER TABLE "GalleryImage"
      ADD CONSTRAINT "GalleryImage_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

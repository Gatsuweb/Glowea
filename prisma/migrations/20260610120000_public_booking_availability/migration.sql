ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

DO $$ BEGIN
    CREATE TYPE "AvailabilityExceptionType" AS ENUM (
      'VACATION',
      'ABSENCE',
      'PERSONAL_APPOINTMENT',
      'TRAINING',
      'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "AgendaSettings"
  ADD COLUMN IF NOT EXISTS "minBookingNoticeMin" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS "slotIntervalMin" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "depositsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "depositsRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "depositAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositType" "DepositType" NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS "pendingBookingTtlMin" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AvailabilityException" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "AvailabilityExceptionType" NOT NULL DEFAULT 'OTHER',
  "title" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "AvailabilityException"
      ADD CONSTRAINT "AvailabilityException_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Appointment_tenantId_expiresAt_idx" ON "Appointment"("tenantId", "expiresAt");
CREATE INDEX IF NOT EXISTS "AvailabilityException_tenantId_idx" ON "AvailabilityException"("tenantId");
CREATE INDEX IF NOT EXISTS "AvailabilityException_tenantId_startAt_endAt_idx" ON "AvailabilityException"("tenantId", "startAt", "endAt");

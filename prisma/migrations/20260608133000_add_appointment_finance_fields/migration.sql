-- CreateAppointmentPaymentMethod enum
DO $$ BEGIN
    CREATE TYPE "AppointmentPaymentMethod" AS ENUM ('stripe', 'cash', 'paypal', 'bank_transfer', 'check', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "depositPaidAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paidAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "remainingAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentMethod" "AppointmentPaymentMethod";

ALTER TABLE "FinancialTransaction"
  ADD COLUMN IF NOT EXISTS "externalPaymentId" TEXT;

DO $$ BEGIN
    ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_externalPaymentId_key" UNIQUE ("externalPaymentId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

UPDATE "Appointment"
SET
  "depositPaidAmount" = CASE
    WHEN "paymentStatus"::text IN ('deposit_paid', 'partial_paid', 'PARTIAL') THEN COALESCE("depositAmount", 0)
    ELSE 0
  END,
  "paidAmount" = CASE
    WHEN "paymentStatus"::text IN ('paid', 'paid_offline', 'PAID') THEN COALESCE("price", 0)
    WHEN "paymentStatus"::text IN ('deposit_paid', 'partial_paid', 'PARTIAL') THEN COALESCE("depositAmount", 0)
    ELSE 0
  END
WHERE "paidAmount" = 0 AND "depositPaidAmount" = 0 AND "remainingAmount" = 0;

UPDATE "Appointment"
SET "remainingAmount" = GREATEST(COALESCE("price", 0) - COALESCE("paidAmount", 0), 0);

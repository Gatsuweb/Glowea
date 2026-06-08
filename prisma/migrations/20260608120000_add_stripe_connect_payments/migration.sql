ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'none';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'deposit_pending';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'deposit_paid';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'partial_paid';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'paid_offline';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'refunded';

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "price" INTEGER,
  ADD COLUMN IF NOT EXISTS "depositAmount" INTEGER,
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

ALTER TABLE "Appointment" ALTER COLUMN "paymentStatus" DROP DEFAULT;

UPDATE "Appointment"
SET "paymentStatus" = CASE "paymentStatus"::text
  WHEN 'PAID' THEN 'paid'::"PaymentStatus"
  WHEN 'PARTIAL' THEN 'deposit_paid'::"PaymentStatus"
  WHEN 'REFUNDED' THEN 'refunded'::"PaymentStatus"
  ELSE 'none'::"PaymentStatus"
END;

ALTER TABLE "Appointment" ALTER COLUMN "paymentStatus" SET DEFAULT 'none';

CREATE TYPE "DepositType" AS ENUM ('fixed', 'percent');

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "defaultDepositAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "defaultDepositType" "DepositType" NOT NULL DEFAULT 'fixed';

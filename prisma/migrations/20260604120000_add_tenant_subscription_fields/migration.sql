ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'ESSENTIAL';

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");

UPDATE "Tenant"
SET
  "subscriptionPlan" = 'PRO',
  "subscriptionStatus" = 'TRIALING',
  "trialEndsAt" = NOW() + INTERVAL '14 days',
  "updatedAt" = NOW()
WHERE "trialEndsAt" IS NULL
  AND "stripeSubscriptionId" IS NULL;

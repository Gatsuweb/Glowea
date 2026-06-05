ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "onboardingDismissedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

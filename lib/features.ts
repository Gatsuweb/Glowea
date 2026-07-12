import { planHasPermission, type SubscriptionPlanValue } from "./planPermissions";

export type { SubscriptionPlanValue };

export function canUseAutomaticSmsReminders(plan: SubscriptionPlanValue | string | null | undefined) {
  return planHasPermission(plan, "canUseSms");
}

export function canUseCampaigns(plan: SubscriptionPlanValue | string | null | undefined) {
  return planHasPermission(plan, "canUseCampaigns");
}

export function isEssentialOrHigher(plan: SubscriptionPlanValue | string | null | undefined) {
  return plan === "ESSENTIAL" || plan === "PRO" || plan === "PREMIUM";
}

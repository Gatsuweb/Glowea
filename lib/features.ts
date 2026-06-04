export type SubscriptionPlanValue = "FREE" | "ESSENTIAL" | "PRO" | "PREMIUM";

export function canUseAutomaticSmsReminders(plan: SubscriptionPlanValue | string | null | undefined) {
  return plan === "PRO" || plan === "PREMIUM";
}

export function canUseCampaigns(plan: SubscriptionPlanValue | string | null | undefined) {
  return plan === "PRO" || plan === "PREMIUM";
}

export function isEssentialOrHigher(plan: SubscriptionPlanValue | string | null | undefined) {
  return plan === "ESSENTIAL" || plan === "PRO" || plan === "PREMIUM";
}

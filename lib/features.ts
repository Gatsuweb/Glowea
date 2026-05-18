export type SubscriptionPlanValue = "FREE" | "PRO" | "PREMIUM";

export function canUseAutomaticSmsReminders(plan: SubscriptionPlanValue | string | null | undefined) {
  return plan === "PRO" || plan === "PREMIUM";
}

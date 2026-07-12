import type { SubscriptionPlan } from "@prisma/client";

export type SubscriptionPlanValue = "FREE" | "PRESENCE" | "ESSENTIAL" | "PRO" | "PREMIUM";

export type PlanPermissions = {
  canUseMainDashboard: boolean;
  canUsePresenceDashboard: boolean;
  canUsePublicPage: boolean;
  canEditPublicPage: boolean;
  canUsePublicReviews: boolean;
  canUseBooking: boolean;
  canManageBookingSettings: boolean;
  canUseAgenda: boolean;
  canUseAppointments: boolean;
  canUseClients: boolean;
  canUseCrm: boolean;
  canUseStats: boolean;
  canUseStripePayments: boolean;
  canUsePaymentLinks: boolean;
  canUseDeposits: boolean;
  canUseSms: boolean;
  canUseCampaigns: boolean;
  canUseStock: boolean;
  canUseAccounting: boolean;
  canUseTechnicalSessions: boolean;
};

const noPermissions: PlanPermissions = {
  canUseMainDashboard: false,
  canUsePresenceDashboard: false,
  canUsePublicPage: false,
  canEditPublicPage: false,
  canUsePublicReviews: false,
  canUseBooking: false,
  canManageBookingSettings: false,
  canUseAgenda: false,
  canUseAppointments: false,
  canUseClients: false,
  canUseCrm: false,
  canUseStats: false,
  canUseStripePayments: false,
  canUsePaymentLinks: false,
  canUseDeposits: false,
  canUseSms: false,
  canUseCampaigns: false,
  canUseStock: false,
  canUseAccounting: false,
  canUseTechnicalSessions: false,
};

const mainDashboardPermissions: PlanPermissions = {
  ...noPermissions,
  canUseMainDashboard: true,
  canUseAgenda: true,
  canUseAppointments: true,
  canUseClients: true,
  canUseCrm: true,
  canUseStats: true,
  canUseStock: true,
  canUseAccounting: true,
  canUseTechnicalSessions: true,
};

const proPermissions: PlanPermissions = {
  ...mainDashboardPermissions,
  canUsePublicPage: true,
  canEditPublicPage: true,
  canUsePublicReviews: true,
  canUseBooking: true,
  canManageBookingSettings: true,
  canUseStripePayments: true,
  canUsePaymentLinks: true,
  canUseDeposits: true,
  canUseSms: true,
  canUseCampaigns: true,
};

export const PLAN_PERMISSIONS: Record<SubscriptionPlanValue, PlanPermissions> = {
  FREE: noPermissions,
  PRESENCE: {
    ...noPermissions,
    canUsePresenceDashboard: true,
    canUsePublicPage: true,
    canEditPublicPage: true,
  },
  ESSENTIAL: mainDashboardPermissions,
  PRO: proPermissions,
  PREMIUM: proPermissions,
};

export function normalizeSubscriptionPlan(
  plan: SubscriptionPlan | SubscriptionPlanValue | string | null | undefined
): SubscriptionPlanValue {
  if (plan === "PRESENCE") return "PRESENCE";
  if (plan === "ESSENTIAL") return "ESSENTIAL";
  if (plan === "PRO") return "PRO";
  if (plan === "PREMIUM") return "PREMIUM";
  return "FREE";
}

export function getPlanPermissions(
  plan: SubscriptionPlan | SubscriptionPlanValue | string | null | undefined
): PlanPermissions {
  return PLAN_PERMISSIONS[normalizeSubscriptionPlan(plan)];
}

export function planHasPermission(
  plan: SubscriptionPlan | SubscriptionPlanValue | string | null | undefined,
  permission: keyof PlanPermissions
) {
  return getPlanPermissions(plan)[permission];
}

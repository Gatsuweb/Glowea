import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import {
  getPlanPermissions,
  normalizeSubscriptionPlan,
  type PlanPermissions,
  type SubscriptionPlanValue,
} from "./planPermissions.ts";

export type { SubscriptionPlanValue };

export type SubscriptionAccess = {
  isTrialing: boolean;
  isTrialExpired: boolean;
  isActive: boolean;
  isReadOnly: boolean;
  currentPlan: SubscriptionPlanValue;
  canUseApp: boolean;
  canUseProFeatures: boolean;
  canUsePublicPage: boolean;
  canEditPublicPage: boolean;
  canUsePublicReviews: boolean;
  canUseSms: boolean;
  canUseBooking: boolean;
  canManageBookingSettings: boolean;
  canUseMainDashboard: boolean;
  canUsePresenceDashboard: boolean;
  canUseAgenda: boolean;
  canUseAppointments: boolean;
  canUseClients: boolean;
  canUseCrm: boolean;
  canUseStats: boolean;
  canUseStripePayments: boolean;
  canUsePaymentLinks: boolean;
  canUseDeposits: boolean;
  canUseCampaigns: boolean;
  canUseStock: boolean;
  canUseAccounting: boolean;
  canUseTechnicalSessions: boolean;
  daysLeft: number;
  status: SubscriptionStatus;
  message: string | null;
};

export const SUBSCRIPTION_REQUIRED_ERROR =
  "Votre abonnement n'est plus actif. Vous pouvez consulter vos donnees, mais les actions sont desactivees.";
export const PLAN_FEATURE_REQUIRED_ERROR =
  "Cette fonctionnalite n'est pas incluse dans votre abonnement actuel.";

function blockedPermissions(): PlanPermissions {
  return getPlanPermissions("FREE");
}

function getDaysLeft(trialEndsAt: Date | null | undefined, now: Date) {
  if (!trialEndsAt) return 0;
  const diffMs = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function buildAccess(params: {
  isTrialing: boolean;
  isTrialExpired: boolean;
  isActive: boolean;
  currentPlan: SubscriptionPlanValue;
  permissions: PlanPermissions;
  daysLeft: number;
  status: SubscriptionStatus;
  message: string | null;
}): SubscriptionAccess {
  const canUseApp = params.permissions.canUseMainDashboard;

  return {
    isTrialing: params.isTrialing,
    isTrialExpired: params.isTrialExpired,
    isActive: params.isActive,
    isReadOnly: !canUseApp,
    currentPlan: params.currentPlan,
    canUseApp,
    canUseProFeatures: params.permissions.canUseSms || params.permissions.canUseBooking,
    canUsePublicPage: params.permissions.canUsePublicPage,
    canEditPublicPage: params.permissions.canEditPublicPage,
    canUsePublicReviews: params.permissions.canUsePublicReviews,
    canUseSms: params.permissions.canUseSms,
    canUseBooking: params.permissions.canUseBooking,
    canManageBookingSettings: params.permissions.canManageBookingSettings,
    canUseMainDashboard: params.permissions.canUseMainDashboard,
    canUsePresenceDashboard: params.permissions.canUsePresenceDashboard,
    canUseAgenda: params.permissions.canUseAgenda,
    canUseAppointments: params.permissions.canUseAppointments,
    canUseClients: params.permissions.canUseClients,
    canUseCrm: params.permissions.canUseCrm,
    canUseStats: params.permissions.canUseStats,
    canUseStripePayments: params.permissions.canUseStripePayments,
    canUsePaymentLinks: params.permissions.canUsePaymentLinks,
    canUseDeposits: params.permissions.canUseDeposits,
    canUseCampaigns: params.permissions.canUseCampaigns,
    canUseStock: params.permissions.canUseStock,
    canUseAccounting: params.permissions.canUseAccounting,
    canUseTechnicalSessions: params.permissions.canUseTechnicalSessions,
    daysLeft: params.daysLeft,
    status: params.status,
    message: params.message,
  };
}

export function getSubscriptionAccessFromTenant(
  tenant: {
    subscriptionPlan: SubscriptionPlan | SubscriptionPlanValue;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt: Date | null;
    Subscription?: {
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    } | null;
  } | null | undefined,
  now = new Date()
): SubscriptionAccess {
  if (!tenant) {
    return buildAccess({
      isTrialing: false,
      isTrialExpired: true,
      isActive: false,
      currentPlan: "FREE",
      permissions: blockedPermissions(),
      daysLeft: 0,
      status: "CANCELED",
      message: SUBSCRIPTION_REQUIRED_ERROR,
    });
  }

  const daysLeft = getDaysLeft(tenant.trialEndsAt, now);
  const currentPlan = normalizeSubscriptionPlan(tenant.subscriptionPlan);
  const isTrialing = tenant.subscriptionStatus === "TRIALING" && daysLeft > 0;
  const isTrialExpired = tenant.subscriptionStatus === "TRIALING" && !isTrialing;
  const isInCancelGracePeriod =
    Boolean(tenant.Subscription?.cancelAtPeriodEnd) &&
    Boolean(tenant.Subscription?.currentPeriodEnd) &&
    tenant.Subscription!.currentPeriodEnd!.getTime() > now.getTime();
  const isActive = tenant.subscriptionStatus === "ACTIVE" || isTrialing || isInCancelGracePeriod;
  const permissionPlan = isTrialing && currentPlan === "FREE" ? "PRO" : currentPlan;
  const permissions = isActive ? getPlanPermissions(permissionPlan) : blockedPermissions();
  const canUseMainDashboard = permissions.canUseMainDashboard;
  const message = isActive
    ? canUseMainDashboard
      ? null
      : PLAN_FEATURE_REQUIRED_ERROR
    : SUBSCRIPTION_REQUIRED_ERROR;

  return buildAccess({
    isTrialing,
    isTrialExpired,
    isActive,
    currentPlan,
    permissions,
    daysLeft,
    status: tenant.subscriptionStatus,
    message,
  });
}

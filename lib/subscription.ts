import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import prisma from "./prisma";

export type SubscriptionAccess = {
  isTrialing: boolean;
  isTrialExpired: boolean;
  isActive: boolean;
  currentPlan: SubscriptionPlan;
  canUseApp: boolean;
  canUseProFeatures: boolean;
  canUsePublicPage: boolean;
  canUseSms: boolean;
  canUseBooking: boolean;
  daysLeft: number;
  status: SubscriptionStatus;
};

export const SUBSCRIPTION_REQUIRED_ERROR =
  "Votre essai est termine. Choisissez une formule pour continuer.";

function getDaysLeft(trialEndsAt: Date | null | undefined, now: Date) {
  if (!trialEndsAt) return 0;
  const diffMs = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function getSubscriptionAccessFromTenant(
  tenant: {
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt: Date | null;
  } | null | undefined,
  now = new Date()
): SubscriptionAccess {
  if (!tenant) {
    return {
      isTrialing: false,
      isTrialExpired: true,
      isActive: false,
      currentPlan: "FREE",
      canUseApp: false,
      canUseProFeatures: false,
      canUsePublicPage: false,
      canUseSms: false,
      canUseBooking: false,
      daysLeft: 0,
      status: "CANCELED",
    };
  }

  const daysLeft = getDaysLeft(tenant.trialEndsAt, now);
  const isTrialing = tenant.subscriptionStatus === "TRIALING" && daysLeft > 0;
  const isTrialExpired = tenant.subscriptionStatus === "TRIALING" && !isTrialing;
  const isActive = tenant.subscriptionStatus === "ACTIVE";
  const canUseApp = isTrialing || isActive;
  const canUseProFeatures =
    isTrialing || (isActive && (tenant.subscriptionPlan === "PRO" || tenant.subscriptionPlan === "PREMIUM"));

  return {
    isTrialing,
    isTrialExpired,
    isActive,
    currentPlan: tenant.subscriptionPlan,
    canUseApp,
    canUseProFeatures,
    canUsePublicPage: canUseProFeatures,
    canUseSms: canUseProFeatures,
    canUseBooking: canUseProFeatures,
    daysLeft,
    status: tenant.subscriptionStatus,
  };
}

export async function getTenantSubscriptionAccess(tenantId: string): Promise<SubscriptionAccess> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  return getSubscriptionAccessFromTenant(tenant);
}

export async function canMutateTenantData(tenantId: string) {
  const access = await getTenantSubscriptionAccess(tenantId);
  return access.canUseApp;
}

export async function requireTenantMutationAccess(tenantId: string) {
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUseApp) {
    return {
      allowed: false as const,
      access,
      error: SUBSCRIPTION_REQUIRED_ERROR,
    };
  }

  return {
    allowed: true as const,
    access,
  };
}

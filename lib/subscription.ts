import prisma from "./prisma";
import type { PlanPermissions } from "./planPermissions";
import {
  getSubscriptionAccessFromTenant,
  PLAN_FEATURE_REQUIRED_ERROR,
  SUBSCRIPTION_REQUIRED_ERROR,
  type SubscriptionAccess,
} from "./subscriptionAccess";
export {
  getSubscriptionAccessFromTenant,
  PLAN_FEATURE_REQUIRED_ERROR,
  SUBSCRIPTION_REQUIRED_ERROR,
} from "./subscriptionAccess";
export type { SubscriptionAccess } from "./subscriptionAccess";

export async function getTenantSubscriptionAccess(tenantId: string): Promise<SubscriptionAccess> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      Subscription: {
        select: {
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
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

export async function requireTenantPermission(
  tenantId: string,
  permission: keyof PlanPermissions,
  error = PLAN_FEATURE_REQUIRED_ERROR
) {
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access[permission]) {
    return {
      allowed: false as const,
      access,
      error: access.isActive ? error : SUBSCRIPTION_REQUIRED_ERROR,
    };
  }

  return {
    allowed: true as const,
    access,
  };
}

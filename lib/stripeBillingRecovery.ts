import prisma from "./prisma";

export function isMissingStripeCustomerError(error: unknown) {
  const stripeError = error as {
    code?: string;
    param?: string;
    raw?: {
      code?: string;
      param?: string;
    };
  };

  const code = stripeError.code || stripeError.raw?.code;
  const param = stripeError.param || stripeError.raw?.param;

  return code === "resource_missing" && param === "customer";
}

export async function clearTenantStripeBillingReferences(tenantId: string) {
  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: "FREE",
        subscriptionStatus: "CANCELED",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        updatedAt: new Date(),
      },
    }),
    prisma.subscription.updateMany({
      where: { tenantId },
      data: {
        providerCustomerId: null,
        providerSubscriptionId: null,
        status: "CANCELED",
        planName: "FREE",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      },
    }),
  ]);
}

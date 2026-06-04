import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

import prisma from "./prisma";
import { stripe } from "./stripe";

function getPlanFromMetadata(plan?: string | null): SubscriptionPlan | null {
  if (plan === "essential" || plan === "ESSENTIAL") return "ESSENTIAL";
  if (plan === "pro" || plan === "PRO") return "PRO";
  return null;
}

function getPlanFromPriceId(priceId?: string | null, metadataPlan?: string | null): SubscriptionPlan {
  if (!priceId) return getPlanFromMetadata(metadataPlan) ?? "FREE";

  const prices: Record<string, SubscriptionPlan> = {};
  if (process.env.STRIPE_PRICE_ESSENTIAL) prices[process.env.STRIPE_PRICE_ESSENTIAL] = "ESSENTIAL";
  if (process.env.STRIPE_PRICE_STARTER) prices[process.env.STRIPE_PRICE_STARTER] = "ESSENTIAL";
  if (process.env.STRIPE_PRICE_PRO) prices[process.env.STRIPE_PRICE_PRO] = "PRO";

  return prices[priceId] ?? getPlanFromMetadata(metadataPlan) ?? "FREE";
}

function mapStripeStatus(status?: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "CANCELED";
  }
}

async function findTenantId(params: {
  tenantId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  if (params.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { id: true },
    });
    if (tenant) return tenant.id;
  }

  const filters = [
    params.subscriptionId ? { stripeSubscriptionId: params.subscriptionId } : undefined,
    params.customerId ? { stripeCustomerId: params.customerId } : undefined,
  ].filter(Boolean) as Array<{ stripeSubscriptionId: string } | { stripeCustomerId: string }>;

  if (filters.length === 0) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { OR: filters },
    select: { id: true },
  });

  return tenant?.id || null;
}

export async function syncTenantSubscription(
  subscription: Stripe.Subscription,
  metadataTenantId?: string | null
) {
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id || null;
  const plan = getPlanFromPriceId(priceId, subscription.metadata?.plan);
  const status = mapStripeStatus(subscription.status);
  const tenantId = await findTenantId({
    tenantId: metadataTenantId || subscription.metadata?.tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenantId) return { synced: false as const, status, plan };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      updatedAt: new Date(),
    },
  });

  return { synced: true as const, tenantId, status, plan };
}

export async function syncTenantFromCheckoutSession(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId || null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const plan = getPlanFromMetadata(session.metadata?.plan) ?? "FREE";
  const status: SubscriptionStatus = session.payment_status === "paid" ? "ACTIVE" : "CANCELED";

  if (!tenantId || !subscriptionId || !customerId) {
    return { synced: false as const, status, plan };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date(),
    },
  });

  return { synced: true as const, tenantId, status, plan };
}

export async function syncCheckoutSessionById(sessionId: string, expectedTenantId?: string | null) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "subscription") {
    return { synced: false as const, reason: "not_subscription" as const };
  }

  if (expectedTenantId && session.metadata?.tenantId && session.metadata.tenantId !== expectedTenantId) {
    return { synced: false as const, reason: "tenant_mismatch" as const };
  }

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const result = await syncTenantSubscription(subscription, session.metadata?.tenantId);
      return { ...result, reason: "subscription" as const };
    } catch {
      const result = await syncTenantFromCheckoutSession(session);
      return { ...result, reason: "checkout_fallback" as const };
    }
  }

  const result = await syncTenantFromCheckoutSession(session);
  return { ...result, reason: "checkout_only" as const };
}

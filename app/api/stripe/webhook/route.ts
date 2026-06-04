import { NextRequest, NextResponse } from "next/server";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

function getPlanFromPriceId(priceId?: string | null): SubscriptionPlan {
  if (!priceId) return "FREE";

  const prices: Record<string, SubscriptionPlan> = {};
  if (process.env.STRIPE_PRICE_ESSENTIAL) prices[process.env.STRIPE_PRICE_ESSENTIAL] = "ESSENTIAL";
  if (process.env.STRIPE_PRICE_STARTER) prices[process.env.STRIPE_PRICE_STARTER] = "ESSENTIAL";
  if (process.env.STRIPE_PRICE_PRO) prices[process.env.STRIPE_PRICE_PRO] = "PRO";

  return prices[priceId] ?? "FREE";
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
    where: {
      OR: filters,
    },
    select: { id: true },
  });

  return tenant?.id || null;
}

async function syncTenantSubscription(subscription: Stripe.Subscription, metadataTenantId?: string | null) {
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id || null;
  const tenantId = await findTenantId({
    tenantId: metadataTenantId || subscription.metadata?.tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenantId) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionPlan: getPlanFromPriceId(priceId),
      subscriptionStatus: mapStripeStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      updatedAt: new Date(),
    },
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature error:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncTenantSubscription(subscription, session.metadata?.tenantId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncTenantSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const tenantId = await findTenantId({
          tenantId: subscription.metadata?.tenantId,
          subscriptionId: subscription.id,
          customerId,
        });

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              subscriptionStatus: "CANCELED",
              subscriptionPlan: "FREE",
              stripeSubscriptionId: subscription.id,
              updatedAt: new Date(),
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

        if (customerId) {
          await prisma.tenant.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              subscriptionStatus: "PAST_DUE",
              updatedAt: new Date(),
            },
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

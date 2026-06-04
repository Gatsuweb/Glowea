import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import {
  syncTenantFromCheckoutSession,
  syncTenantSubscription as syncStripeTenantSubscription,
} from "@/lib/stripeSubscriptionSync";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function logAndSyncTenantSubscription(subscription: Stripe.Subscription, metadataTenantId?: string | null) {
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id || null;
  const tenantId = await findTenantId({
    tenantId: metadataTenantId || subscription.metadata?.tenantId,
    subscriptionId,
    customerId,
  });

  console.log("[stripe:webhook] tenantId", tenantId);
  console.log("[stripe:webhook] subscriptionId", subscriptionId);
  console.log("[stripe:webhook] customerId", customerId);
  console.log("[stripe:webhook] priceId", priceId);

  await syncStripeTenantSubscription(subscription, metadataTenantId);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("[stripe:webhook] request received");
  console.log("[stripe:webhook] hasWebhookSecret", Boolean(webhookSecret));

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  console.log("[stripe:webhook] hasSignature", Boolean(signature));

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log("[stripe:webhook] event", event.type);
  } catch (error) {
    console.error("Stripe webhook signature error:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const tenantId = session.metadata?.tenantId || null;

        console.log("[stripe:webhook] tenantId", tenantId);
        console.log("[stripe:webhook] subscriptionId", subscriptionId);
        console.log("[stripe:webhook] customerId", customerId);

        if (!subscriptionId) break;

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await logAndSyncTenantSubscription(subscription, session.metadata?.tenantId);
        } catch (error) {
          console.error("[stripe:webhook] subscription retrieve failed, using checkout session fallback", error);
          await syncTenantFromCheckoutSession(session);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await logAndSyncTenantSubscription(event.data.object as Stripe.Subscription);
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

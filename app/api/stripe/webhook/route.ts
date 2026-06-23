import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendPushToTenant } from "@/lib/push";
import { syncAppointmentPaymentFromCheckoutSession } from "@/lib/stripeAppointmentSync";
import {
  syncTenantFromCheckoutSession,
  syncTenantSubscription as syncStripeTenantSubscription,
} from "@/lib/stripeSubscriptionSync";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppointmentPaymentPushType = "deposit" | "full" | "remaining";

function getAppointmentPaymentNotification(paymentType: AppointmentPaymentPushType, appointmentId: string) {
  if (paymentType === "deposit") {
    return {
      title: "Arrhes encaissées",
      body: "Un paiement d'arrhes vient d'être reçu.",
      tag: `payment-deposit-${appointmentId}`,
    };
  }

  if (paymentType === "full") {
    return {
      title: "Paiement reçu",
      body: "Un paiement complet vient d'être reçu.",
      tag: `payment-full-${appointmentId}`,
    };
  }

  return {
    title: "Paiement reçu",
    body: "Un paiement restant vient d'être reçu.",
    tag: `payment-remaining-${appointmentId}`,
  };
}

function getPaymentNotificationId(sessionId: string, paymentType: string) {
  const hash = createHash("sha256").update(`${sessionId}:${paymentType}`).digest("hex").slice(0, 16);
  return `not_pay_${hash}`;
}

async function sendAppointmentPaymentPushOnce(params: {
  tenantId: string;
  appointmentId: string;
  paymentType: AppointmentPaymentPushType;
  checkoutSessionId: string;
}) {
  const notification = getAppointmentPaymentNotification(params.paymentType, params.appointmentId);
  const notificationId = getPaymentNotificationId(params.checkoutSessionId, params.paymentType);

  const created = await prisma.notification.createMany({
    data: [{
      id: notificationId,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      type: "OTHER",
      title: notification.title,
      body: notification.body,
    }],
    skipDuplicates: true,
  });

  if (created.count === 0) {
    console.log("[push] payment notification already sent", {
      appointmentId: params.appointmentId,
      paymentType: params.paymentType,
      tenantId: params.tenantId,
    });
    return;
  }

  await sendPushToTenant(params.tenantId, {
    ...notification,
    url: "/dashboard/agenda",
    data: {
      appointmentId: params.appointmentId,
      paymentType: params.paymentType,
    },
  });
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
    console.log("[stripe webhook] event", event.type);
  } catch (error) {
    console.error("Stripe webhook signature error:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Stripe event:", event.type);
        console.log("Session metadata:", session.metadata);
        console.log("Amount total:", session.amount_total);
        console.log("Payment intent:", session.payment_intent);

        if (session.metadata?.appointmentId) {
          const paymentType = session.metadata.paymentType || null;
          const appointmentId = session.metadata.appointmentId || null;

          if (paymentType === "deposit") {
            console.log("Push deposit payment start");
            console.log("[stripe webhook] deposit payment push start");
          }
          console.log("paymentType", paymentType);
          console.log("appointmentId", appointmentId);

          const paymentSyncResult = await syncAppointmentPaymentFromCheckoutSession(session);
          if (!paymentSyncResult.success && paymentSyncResult.reason !== "zero_amount") {
            throw new Error(paymentSyncResult.reason + ("error" in paymentSyncResult && paymentSyncResult.error ? `: ${paymentSyncResult.error}` : ""));
          }

          if (paymentSyncResult.success) {
            console.log("tenantId", paymentSyncResult.tenantId);
            console.log("[push] payment sync skipped", paymentSyncResult.skipped);

            try {
              await sendAppointmentPaymentPushOnce({
                tenantId: paymentSyncResult.tenantId,
                appointmentId: paymentSyncResult.appointmentId,
                paymentType: paymentSyncResult.paymentType,
                checkoutSessionId: session.id,
              });
            } catch (pushError) {
              console.error("[push] stripe payment notification failed:", pushError);
            }
          }
          break;
        }

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
        await logAndSyncTenantSubscription(subscription);
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

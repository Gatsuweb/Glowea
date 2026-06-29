import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserRecord } from "@/lib/tenant";
import prisma from "@/lib/prisma";
import {
  clearTenantStripeBillingReferences,
  isMissingStripeCustomerError,
} from "@/lib/stripeBillingRecovery";
import {
  createCustomerPortalSession,
  findCurrentCustomerSubscriptions,
  getAppUrl,
} from "@/lib/stripeCustomerPortal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const priceMap = {
  essential: {
    monthly: process.env.STRIPE_PRICE_ESSENTIAL || process.env.STRIPE_PRICE_STARTER,
    yearly: process.env.STRIPE_PRICE_ESSENTIAL_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

type CheckoutPlan = keyof typeof priceMap;
type CheckoutBilling = "monthly" | "yearly";

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "essential" || value === "pro";
}

function isCheckoutBilling(value: unknown): value is CheckoutBilling {
  return value === "monthly" || value === "yearly";
}

async function createStripeCustomer(params: {
  userId: string;
  tenantId: string;
  email?: string | null;
  name?: string | null;
}) {
  const customer = await stripe.customers.create({
    email: params.email || undefined,
    name: params.name || undefined,
    metadata: {
      userId: params.userId,
      tenantId: params.tenantId,
    },
  });

  await prisma.tenant.update({
    where: { id: params.tenantId },
    data: { stripeCustomerId: customer.id, updatedAt: new Date() },
  });

  return customer.id;
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserRecord = await getCurrentUserRecord();
  const tenantId = currentUserRecord.tenantId;
  const appUrl = getAppUrl(req.url);

  const { plan, billing } = await req.json();

  if (!isCheckoutPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (!isCheckoutBilling(billing)) {
    return NextResponse.json({ error: "Invalid billing" }, { status: 400 });
  }

  const priceId = priceMap[plan][billing];
  if (!priceId) {
    return NextResponse.json({ error: `Missing Stripe ${billing} price configuration` }, { status: 500 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { User: { where: { id: currentUserRecord.id }, take: 1 } },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const owner = tenant.User[0];
    customerId = await createStripeCustomer({
      userId,
      tenantId,
      email: owner?.email,
      name: owner?.fullName || tenant.name,
    });
  }

  let currentSubscriptions = [];
  try {
    currentSubscriptions = await findCurrentCustomerSubscriptions(customerId);
  } catch (error) {
    if (!isMissingStripeCustomerError(error)) {
      throw error;
    }

    await clearTenantStripeBillingReferences(tenantId);

    const owner = tenant.User[0];
    customerId = await createStripeCustomer({
      userId,
      tenantId,
      email: owner?.email,
      name: owner?.fullName || tenant.name,
    });
    currentSubscriptions = [];
  }

  if (currentSubscriptions.length > 0) {
    const portalSession = await createCustomerPortalSession({
      customerId,
      returnUrl: `${appUrl}/dashboard/profil?tab=abonnements&stripe_portal=return`,
    });

    return NextResponse.json({
      url: portalSession.url,
      existingSubscription: true,
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      tenantId,
      plan,
      billing,
    },
    subscription_data: {
      metadata: {
        userId,
        tenantId,
        plan,
        billing,
      },
    },
    success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

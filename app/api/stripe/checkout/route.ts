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
type CheckoutOffer = "founder";

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "essential" || value === "pro";
}

function isCheckoutBilling(value: unknown): value is CheckoutBilling {
  return value === "monthly" || value === "yearly";
}

function isCheckoutOffer(value: unknown): value is CheckoutOffer {
  return value === "founder";
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

  const { plan, billing, offer } = await req.json();

  if (!isCheckoutPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (!isCheckoutBilling(billing)) {
    return NextResponse.json({ error: "Invalid billing" }, { status: 400 });
  }

  const checkoutOffer = isCheckoutOffer(offer) ? offer : null;
  const resolvedBilling: CheckoutBilling = checkoutOffer === "founder" ? "monthly" : billing;
  const priceId =
    checkoutOffer === "founder" && plan === "pro"
      ? process.env.STRIPE_PRICE_PRO_BETA_MONTHLY
      : priceMap[plan][resolvedBilling];

  if (checkoutOffer === "founder" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid private offer" }, { status: 400 });
  }

  if (!priceId) {
    const priceName = checkoutOffer === "founder" ? "STRIPE_PRICE_PRO_BETA_MONTHLY" : `Stripe ${resolvedBilling} price`;
    return NextResponse.json({ error: `Missing ${priceName} configuration` }, { status: 500 });
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

  const metadata = {
    userId,
    tenantId,
    plan,
    billing: resolvedBilling,
    ...(checkoutOffer ? { offer: checkoutOffer } : {}),
  };

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?${checkoutOffer === "founder" ? "offer=founder&" : ""}canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

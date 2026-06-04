import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getTenantId } from "@/lib/tenant";
import prisma from "@/lib/prisma";

const priceMap = {
  essential: process.env.STRIPE_PRICE_ESSENTIAL || process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
};

type CheckoutPlan = keyof typeof priceMap;

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "essential" || value === "pro";
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  const { plan, billing } = await req.json();

  if (!isCheckoutPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (billing !== "monthly") {
    return NextResponse.json({ error: "Invalid billing" }, { status: 400 });
  }

  const priceId = priceMap[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Missing Stripe price configuration" }, { status: 500 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { User: { where: { id: userId }, take: 1 } },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const owner = tenant.User[0];
    const customer = await stripe.customers.create({
      email: owner?.email,
      name: owner?.fullName || tenant.name,
      metadata: {
        userId,
        tenantId,
      },
    });

    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId, updatedAt: new Date() },
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
    success_url: `${appUrl}/dashboard?success=true`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

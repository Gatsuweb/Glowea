import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const clerkUser = await currentUser();

  const user = await prisma.user.findFirst({
    where: { id: userId, clerkUserId: userId, tenantId },
    select: {
      id: true,
      email: true,
      fullName: true,
      stripeAccountId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let stripeAccountId = user.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: user.email || clerkUser?.emailAddresses[0]?.emailAddress,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId,
        tenantId,
        platform: "glowea",
      },
    });

    stripeAccountId = account.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeAccountId,
        stripeOnboardingComplete: false,
        paymentsEnabled: false,
        updatedAt: new Date(),
      },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/settings/payments?stripe=refresh`,
    return_url: `${appUrl}/settings/payments?stripe=return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

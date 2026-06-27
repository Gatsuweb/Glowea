import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentUserRecord } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserRecord = await getCurrentUserRecord();
  const tenantId = currentUserRecord.tenantId;
  const user = await prisma.user.findFirst({
    where: { id: currentUserRecord.id, tenantId },
    select: { id: true, stripeAccountId: true },
  });

  if (!user?.stripeAccountId) {
    return NextResponse.json({ error: "Stripe account not configured" }, { status: 400 });
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  const paymentsEnabled = Boolean(account.charges_enabled);
  const stripeOnboardingComplete = Boolean(account.details_submitted);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      paymentsEnabled,
      stripeOnboardingComplete,
      updatedAt: new Date(),
    },
    select: {
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      paymentsEnabled: true,
      defaultDepositAmount: true,
      defaultDepositType: true,
    },
  });

  return NextResponse.json({ success: true, user: updatedUser });
}

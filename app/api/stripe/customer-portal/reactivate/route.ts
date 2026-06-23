import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getTenantId } from "@/lib/tenant";
import { syncTenantSubscription } from "@/lib/stripeSubscriptionSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      Subscription: {
        select: {
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  if (!tenant?.stripeSubscriptionId) {
    return NextResponse.json(
      { success: false, error: "Aucun abonnement Stripe a reactiver." },
      { status: 404 }
    );
  }

  if (tenant.subscriptionStatus === "CANCELED") {
    return NextResponse.json(
      { success: false, error: "Cet abonnement est deja termine. Choisissez une formule pour vous reabonner." },
      { status: 409 }
    );
  }

  if (!tenant.Subscription?.cancelAtPeriodEnd) {
    return NextResponse.json({ success: true, alreadyActive: true });
  }

  try {
    const subscription = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await syncTenantSubscription(subscription, tenantId);

    return NextResponse.json({ success: true, alreadyActive: false });
  } catch (error) {
    console.error("Error reactivating Stripe subscription:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de reactiver l'abonnement." },
      { status: 500 }
    );
  }
}

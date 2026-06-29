import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  clearTenantStripeBillingReferences,
  isMissingStripeCustomerError,
} from "@/lib/stripeBillingRecovery";
import { createCustomerPortalSession, getAppUrl } from "@/lib/stripeCustomerPortal";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalRequestBody = {
  returnTab?: string;
  flow?: string;
};

type SupportedPortalFlow = "payment_method_update" | "subscription_update";

async function readPortalRequestBody(request: Request): Promise<PortalRequestBody> {
  const text = await request.text();
  if (!text) return {};

  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!tenant?.stripeCustomerId) {
    return NextResponse.json(
      { success: false, error: "Aucun client Stripe associe a cet espace." },
      { status: 404 }
    );
  }

  try {
    const body = await readPortalRequestBody(request);
    const returnTab = body.returnTab === "paiements" ? "paiements" : "abonnements";
    const flow = body.flow === "payment_method_update" || body.flow === "subscription_update"
      ? body.flow as SupportedPortalFlow
      : null;
    let subscriptionId = tenant.stripeSubscriptionId;

    if (flow === "subscription_update" && !subscriptionId) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          tenantId,
          providerCustomerId: tenant.stripeCustomerId,
          providerSubscriptionId: { not: null },
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "INCOMPLETE", "PAUSED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { providerSubscriptionId: true },
      });

      subscriptionId = subscriptions[0]?.providerSubscriptionId || null;
    }

    if (flow === "subscription_update" && !subscriptionId) {
      return NextResponse.json(
        { success: false, error: "Aucun abonnement Stripe actif a modifier." },
        { status: 404 }
      );
    }

    const flowData =
      flow === "payment_method_update"
        ? { type: "payment_method_update" as const }
        : flow === "subscription_update"
          ? {
              type: "subscription_update" as const,
              subscription_update: {
                subscription: subscriptionId!,
              },
            }
          : undefined;
    const session = await createCustomerPortalSession({
      customerId: tenant.stripeCustomerId,
      returnUrl: `${getAppUrl(request.url)}/dashboard/profil?tab=${returnTab}&stripe_portal=return`,
      flowData,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    if (isMissingStripeCustomerError(error)) {
      await clearTenantStripeBillingReferences(tenantId);

      return NextResponse.json(
        {
          success: false,
          error: "Votre ancien client Stripe n'existe pas dans cet environnement. Les references Stripe ont ete reinitialisees, choisissez une formule pour demarrer l'abonnement en production.",
          code: "STRIPE_CUSTOMER_ENVIRONMENT_MISMATCH",
        },
        { status: 409 }
      );
    }

    console.error("Error creating Stripe customer portal session:", error);
    return NextResponse.json(
      { success: false, error: "Impossible d'ouvrir le portail Stripe." },
      { status: 500 }
    );
  }
}

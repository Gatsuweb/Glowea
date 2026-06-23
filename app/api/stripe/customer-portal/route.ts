import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { createCustomerPortalSession, getAppUrl } from "@/lib/stripeCustomerPortal";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalRequestBody = {
  returnTab?: string;
  flow?: string;
};

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
    const flowData = body.flow === "payment_method_update"
      ? { type: "payment_method_update" as const }
      : undefined;
    const session = await createCustomerPortalSession({
      customerId: tenant.stripeCustomerId,
      returnUrl: `${getAppUrl(request.url)}/dashboard/profil?tab=${returnTab}&stripe_portal=return`,
      flowData,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Error creating Stripe customer portal session:", error);
    return NextResponse.json(
      { success: false, error: "Impossible d'ouvrir le portail Stripe." },
      { status: 500 }
    );
  }
}

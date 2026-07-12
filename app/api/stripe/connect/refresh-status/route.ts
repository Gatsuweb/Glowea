import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireTenantPermission } from "@/lib/subscription";
import { getCurrentUserRecord } from "@/lib/tenant";
import {
  clearStripeConnectState,
  isStripeReconnectRequiredError,
  jsonError,
  jsonSuccess,
  logStripeConnectError,
  logStripeConnectInfo,
  STRIPE_RECONNECT_REQUIRED_MESSAGE,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  let tenantId: string | null = null;
  let stripeAccountId: string | null = null;

  try {
    const { userId } = await auth();

    if (!userId) {
      return jsonError(401, "Non autorise");
    }

    const currentUserRecord = await getCurrentUserRecord();
    tenantId = currentUserRecord.tenantId;
    const access = await requireTenantPermission(
      tenantId,
      "canUseStripePayments",
      "Les paiements Stripe sont disponibles avec l'abonnement Pro."
    );
    if (!access.allowed) {
      return jsonError(403, access.error);
    }

    const user = await prisma.user.findFirst({
      where: { id: currentUserRecord.id, tenantId },
      select: { id: true, stripeAccountId: true },
    });

    stripeAccountId = user?.stripeAccountId || null;
    logStripeConnectInfo("refresh-status", { tenantId, stripeAccountId });

    if (!user?.stripeAccountId) {
      return jsonError(400, "Aucun compte Stripe Connect n'est configure.");
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

    return jsonSuccess({
      user: updatedUser,
      message: paymentsEnabled
        ? "Votre compte Stripe est déjà configuré."
        : "Configuration Stripe encore incomplete.",
      alreadyConfigured: paymentsEnabled && stripeOnboardingComplete,
    });
  } catch (error) {
    logStripeConnectError("refresh-status", { tenantId, stripeAccountId }, error);

    if (isStripeReconnectRequiredError(error)) {
      const currentUserRecord = await getCurrentUserRecord().catch(() => null);
      const resetUser = currentUserRecord
        ? await clearStripeConnectState(currentUserRecord.id).catch(() => null)
        : null;

      return jsonError(409, STRIPE_RECONNECT_REQUIRED_MESSAGE, {
        code: "STRIPE_RECONNECT_REQUIRED",
        stripeReconnectRequired: true,
        ...(resetUser ? { user: resetUser } : {}),
      });
    }

    return jsonError(500, "Impossible de rafraichir le statut Stripe.");
  }
}

import { auth, currentUser } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireTenantMutationAccess } from "@/lib/subscription";
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

export async function POST(req: Request) {
  let tenantId: string | null = null;
  let stripeAccountId: string | null = null;

  try {
    const { userId } = await auth();

    if (!userId) {
      return jsonError(401, "Non autorise");
    }

    const currentUserRecord = await getCurrentUserRecord();
    tenantId = currentUserRecord.tenantId;
    const access = await requireTenantMutationAccess(tenantId);
    if (!access.allowed) {
      return jsonError(403, access.error);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const clerkUser = await currentUser();

    const user = await prisma.user.findFirst({
      where: { id: currentUserRecord.id, tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        stripeAccountId: true,
      },
    });

    if (!user) {
      return jsonError(404, "Utilisateur introuvable");
    }

    stripeAccountId = user.stripeAccountId;
    logStripeConnectInfo("create-account", { tenantId, stripeAccountId });

    if (stripeAccountId) {
      const existingAccount = await stripe.accounts.retrieve(stripeAccountId);
      if (existingAccount.charges_enabled && existingAccount.details_submitted) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeOnboardingComplete: true,
            paymentsEnabled: true,
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
          alreadyConfigured: true,
          message: "Votre compte Stripe est déjà configuré.",
        });
      }
    }

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
        where: { id: user.id },
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

    return jsonSuccess({ url: accountLink.url });
  } catch (error) {
    logStripeConnectError("create-account", { tenantId, stripeAccountId }, error);

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

    return jsonError(500, "Impossible d'ouvrir la configuration Stripe.");
  }
}

import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { requireTenantMutationAccess } from "@/lib/subscription";
import { getCurrentUserRecord } from "@/lib/tenant";
import {
  jsonError,
  jsonSuccess,
  logStripeConnectError,
  logStripeConnectInfo,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeDepositAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(1000000, Math.round(amount));
}

function normalizeDepositType(value: unknown) {
  return value === "percent" ? "percent" : "fixed";
}

export async function PATCH(req: Request) {
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError(400, "Requete invalide");
    }

    const defaultDepositType = normalizeDepositType((body as { defaultDepositType?: unknown }).defaultDepositType);
    const defaultDepositAmount = normalizeDepositAmount((body as { defaultDepositAmount?: unknown }).defaultDepositAmount);

    if (defaultDepositType === "percent" && defaultDepositAmount > 100) {
      return jsonError(400, "Le pourcentage d'arrhes doit etre compris entre 0 et 100.");
    }

    const user = await prisma.user.findFirst({
      where: { id: currentUserRecord.id, tenantId },
      select: { id: true, stripeAccountId: true },
    });

    if (!user) {
      return jsonError(404, "Utilisateur introuvable");
    }

    stripeAccountId = user.stripeAccountId;
    logStripeConnectInfo("update-settings", { tenantId, stripeAccountId });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        defaultDepositAmount,
        defaultDepositType,
        updatedAt: new Date(),
      },
      select: {
        defaultDepositAmount: true,
        defaultDepositType: true,
      },
    });

    return jsonSuccess({
      user: updatedUser,
      message: "Arrhes par defaut enregistrees.",
    });
  } catch (error) {
    logStripeConnectError("update-settings", { tenantId, stripeAccountId }, error);
    return jsonError(500, "Impossible d'enregistrer les arrhes.");
  }
}

import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type StripeConnectAction = "create-account" | "refresh-status" | "update-settings";

type StripeConnectUserState = {
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  paymentsEnabled: boolean;
  defaultDepositAmount: number;
  defaultDepositType: "fixed" | "percent";
};

export const STRIPE_RECONNECT_REQUIRED_MESSAGE =
  "Votre compte Stripe doit être reconnecté en mode production.";

export function logStripeConnectInfo(action: StripeConnectAction, details: Record<string, unknown>) {
  console.info("[stripe-connect]", { action, ...details });
}

export function logStripeConnectError(
  action: StripeConnectAction,
  details: Record<string, unknown>,
  error: unknown
) {
  console.error("[stripe-connect]", {
    action,
    ...details,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            ...(typeof error === "object" && error && "code" in error
              ? { code: String((error as { code?: unknown }).code) }
              : {}),
          }
        : error,
  });
}

export function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...extra,
    },
    { status }
  );
}

export function jsonSuccess(data?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    ...data,
  });
}

export function isStripeReconnectRequiredError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";

  return code === "resource_missing" || /No such account/i.test(message);
}

export async function clearStripeConnectState(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      paymentsEnabled: false,
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
}

export type { StripeConnectUserState };

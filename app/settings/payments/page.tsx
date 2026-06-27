import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import prisma from "@/lib/prisma";
import { getCurrentUserRecord } from "@/lib/tenant";

import PaymentsSettingsClient from "./PaymentsSettingsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsSettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const currentUserRecord = await getCurrentUserRecord();
  const user = await prisma.user.findFirst({
    where: { id: currentUserRecord.id, tenantId: currentUserRecord.tenantId },
    select: {
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      paymentsEnabled: true,
      defaultDepositAmount: true,
      defaultDepositType: true,
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  const initialSettings = {
    stripeAccountId: user.stripeAccountId,
    stripeOnboardingComplete: user.stripeOnboardingComplete,
    paymentsEnabled: user.paymentsEnabled,
    defaultDepositAmount: user.defaultDepositAmount,
    defaultDepositType: user.defaultDepositType,
  };

  return (
    <Suspense fallback={null}>
      <PaymentsSettingsClient initialSettings={initialSettings} />
    </Suspense>
  );
}

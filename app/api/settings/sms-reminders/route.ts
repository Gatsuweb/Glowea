import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { canUseAutomaticSmsReminders } from "../../../../lib/features";
import { getTenantId } from "../../../../lib/tenant";

export async function PATCH(request: Request) {
  let tenantId: string;

  try {
    tenantId = await getTenantId();
  } catch {
    return NextResponse.json(
      { success: false, error: "Non autorise" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Requete invalide" },
      { status: 400 }
    );
  }

  const enabled = typeof body === "object" && body !== null && "enabled" in body
    ? (body as { enabled: unknown }).enabled
    : undefined;

  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { success: false, error: "Le champ enabled doit etre un booleen" },
      { status: 400 }
    );
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, subscriptionPlan: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Espace introuvable" },
        { status: 404 }
      );
    }

    const isAllowed = canUseAutomaticSmsReminders(tenant.subscriptionPlan);
    if (enabled && !isAllowed) {
      return NextResponse.json(
        {
          success: false,
          code: "PLAN_REQUIRED",
          error: "Les rappels SMS automatiques sont disponibles avec l'abonnement Pro.",
          subscriptionPlan: tenant.subscriptionPlan,
          smsRemindersEnabled: false,
          canUseAutomaticSmsReminders: false,
        },
        { status: 403 }
      );
    }

    const settings = await prisma.businessSettings.upsert({
      where: { tenantId },
      update: {
        smsRemindersEnabled: enabled,
        smsReminderDelayHours: 24,
        updatedAt: new Date(),
      },
      create: {
        id: `biz_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        smsRemindersEnabled: enabled,
        smsReminderDelayHours: 24,
        updatedAt: new Date(),
      },
      select: {
        smsRemindersEnabled: true,
        smsReminderDelayHours: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionPlan: tenant.subscriptionPlan,
      canUseAutomaticSmsReminders: isAllowed,
      smsRemindersEnabled: settings.smsRemindersEnabled,
      smsReminderDelayHours: settings.smsReminderDelayHours,
    });
  } catch (error) {
    console.error("Error updating SMS reminder settings:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de mettre a jour les rappels SMS" },
      { status: 500 }
    );
  }
}

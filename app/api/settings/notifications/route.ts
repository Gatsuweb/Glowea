import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "../../../../lib/prisma";
import { getTenantId } from "../../../../lib/tenant";
import { getTenantSubscriptionAccess } from "../../../../lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETTING_KEYS = [
  "pushEnabled",
  "stockLowEnabled",
  "loyalClientThanksEnabled",
  "onlineBookingEnabled",
  "paymentReceivedEnabled",
  "publicBookingChangeEnabled",
  "automaticFollowUpEnabled",
] as const;

type NotificationSettingKey = (typeof SETTING_KEYS)[number];

const PRO_SETTING_KEYS = new Set<NotificationSettingKey>([
  "onlineBookingEnabled",
  "paymentReceivedEnabled",
  "publicBookingChangeEnabled",
  "automaticFollowUpEnabled",
]);

type PreferenceShape = Record<NotificationSettingKey, boolean>;

function isNotificationSettingKey(value: unknown): value is NotificationSettingKey {
  return typeof value === "string" && (SETTING_KEYS as readonly string[]).includes(value);
}

function toPreferences(preferences: Partial<PreferenceShape> | null | undefined): PreferenceShape {
  return {
    pushEnabled: preferences?.pushEnabled ?? true,
    stockLowEnabled: preferences?.stockLowEnabled ?? true,
    loyalClientThanksEnabled: preferences?.loyalClientThanksEnabled ?? true,
    onlineBookingEnabled: preferences?.onlineBookingEnabled ?? true,
    paymentReceivedEnabled: preferences?.paymentReceivedEnabled ?? true,
    publicBookingChangeEnabled: preferences?.publicBookingChangeEnabled ?? true,
    automaticFollowUpEnabled: preferences?.automaticFollowUpEnabled ?? true,
  };
}

async function upsertDefaultPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: { updatedAt: new Date() },
    create: {
      id: `npr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      userId,
      updatedAt: new Date(),
    },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  try {
    const tenantId = await getTenantId();
    const [preferences, subscriptionAccess] = await Promise.all([
      upsertDefaultPreferences(userId),
      getTenantSubscriptionAccess(tenantId),
    ]);

    return NextResponse.json({
      success: true,
      notificationPreferences: toPreferences(preferences),
      subscriptionPlan: subscriptionAccess.currentPlan,
      subscriptionStatus: subscriptionAccess.status,
      canUseProFeatures: subscriptionAccess.canUseProFeatures,
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les preferences de notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const key = body?.key;
  const enabled = body?.enabled;

  if (!isNotificationSettingKey(key) || typeof enabled !== "boolean") {
    return NextResponse.json(
      { success: false, error: "Preference de notification invalide" },
      { status: 400 }
    );
  }

  try {
    const tenantId = await getTenantId();
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);

    if (enabled && PRO_SETTING_KEYS.has(key) && !subscriptionAccess.canUseProFeatures) {
      return NextResponse.json(
        {
          success: false,
          code: "PLAN_REQUIRED",
          error: "Cette notification est disponible avec l'abonnement Pro.",
          subscriptionPlan: subscriptionAccess.currentPlan,
          subscriptionStatus: subscriptionAccess.status,
          canUseProFeatures: false,
        },
        { status: 403 }
      );
    }

    const compatibilityUpdate =
      key === "stockLowEnabled"
        ? { stockAlertEnabled: enabled }
        : key === "automaticFollowUpEnabled"
          ? { appointmentReminderEnabled: enabled }
          : {};

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        [key]: enabled,
        ...compatibilityUpdate,
        updatedAt: new Date(),
      },
      create: {
        id: `npr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        userId,
        [key]: enabled,
        ...compatibilityUpdate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      notificationPreferences: toPreferences(preferences),
      subscriptionPlan: subscriptionAccess.currentPlan,
      subscriptionStatus: subscriptionAccess.status,
      canUseProFeatures: subscriptionAccess.canUseProFeatures,
    });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de mettre a jour la preference de notification" },
      { status: 500 }
    );
  }
}

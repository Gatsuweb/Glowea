"use server";

import { revalidatePath } from "next/cache";
import type { BillingProvider, SubscriptionStatus } from "@prisma/client";
import prisma from "../../lib/prisma";
import { type SubscriptionPlanValue } from "../../lib/features";
import { getSubscriptionAccessFromTenant } from "../../lib/subscription";
import { getTenantId } from "../../lib/tenant";

export type ProfileSubscriptionData = {
  plan: SubscriptionPlanValue;
  status: SubscriptionStatus;
  provider: BillingProvider | null;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  canUseApp: boolean;
  canUseProFeatures: boolean;
};

export type ProfileNotificationPreferences = {
  pushEnabled: boolean;
  stockLowEnabled: boolean;
  loyalClientThanksEnabled: boolean;
  onlineBookingEnabled: boolean;
  paymentReceivedEnabled: boolean;
  publicBookingChangeEnabled: boolean;
  automaticFollowUpEnabled: boolean;
};

export type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  salonName: string;
  siret: string;
  address: string;
  subscriptionPlan: SubscriptionPlanValue;
  canUseAutomaticSmsReminders: boolean;
  smsRemindersEnabled: boolean;
  smsReminderDelayHours: number;
  notificationPreferences: ProfileNotificationPreferences;
  subscription: ProfileSubscriptionData;
};

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getDefaultNotificationPreferences(): ProfileNotificationPreferences {
  return {
    pushEnabled: true,
    stockLowEnabled: true,
    loyalClientThanksEnabled: true,
    onlineBookingEnabled: true,
    paymentReceivedEnabled: true,
    publicBookingChangeEnabled: true,
    automaticFollowUpEnabled: true,
  };
}

function mapNotificationPreferences(
  preferences: Partial<ProfileNotificationPreferences> | null | undefined
): ProfileNotificationPreferences {
  return {
    ...getDefaultNotificationPreferences(),
    ...preferences,
  };
}

export async function getProfileData() {
  const tenantId = await getTenantId();

  try {
    const [user, tenant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: tenantId },
        include: { NotificationPreference: true },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { BillingProfile: true, BusinessSettings: true, Subscription: true },
      }),
    ]);

    const firstName = safeString(user?.firstName) || safeString(user?.fullName).split(" ")[0] || "";
    const lastName = safeString(user?.lastName) || safeString(user?.fullName).split(" ").slice(1).join(" ") || "";

    const email = safeString(user?.email);
    const phone = safeString(user?.phone);

    const salonName =
      safeString(tenant?.BusinessSettings?.displayName) || safeString(tenant?.name) || "";
    const siret = safeString(tenant?.BillingProfile?.siret);
    const address = safeString(tenant?.BillingProfile?.addressLine1);
    const subscriptionPlan = (tenant?.subscriptionPlan || "FREE") as SubscriptionPlanValue;
    const subscriptionAccess = getSubscriptionAccessFromTenant(tenant);
    const canUseSmsReminders = subscriptionAccess.canUseSms;

    const data: ProfileData = {
      firstName,
      lastName,
      email,
      phone,
      salonName,
      siret,
      address,
      subscriptionPlan,
      canUseAutomaticSmsReminders: canUseSmsReminders,
      smsRemindersEnabled: canUseSmsReminders && Boolean(tenant?.BusinessSettings?.smsRemindersEnabled),
      smsReminderDelayHours: tenant?.BusinessSettings?.smsReminderDelayHours || 24,
      notificationPreferences: mapNotificationPreferences(user?.NotificationPreference),
      subscription: {
        plan: subscriptionPlan,
        status: subscriptionAccess.status,
        provider: tenant?.Subscription?.provider || (tenant?.stripeCustomerId ? "STRIPE" : null),
        trialEndsAt: tenant?.trialEndsAt?.toISOString() || null,
        trialDaysLeft: subscriptionAccess.daysLeft,
        currentPeriodStart: tenant?.Subscription?.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: tenant?.Subscription?.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: Boolean(tenant?.Subscription?.cancelAtPeriodEnd),
        stripeCustomerId: tenant?.stripeCustomerId || null,
        stripeSubscriptionId: tenant?.stripeSubscriptionId || null,
        stripePriceId: tenant?.stripePriceId || null,
        canUseApp: subscriptionAccess.canUseApp,
        canUseProFeatures: subscriptionAccess.canUseProFeatures,
      },
    };

    return { success: true as const, data };
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return { success: false as const, error: "Erreur lors de la récupération du profil" };
  }
}

export async function updateProfileData(input: Partial<ProfileData>) {
  const tenantId = await getTenantId();

  const firstName = safeString(input.firstName);
  const lastName = safeString(input.lastName);
  const email = safeString(input.email);
  const phone = safeString(input.phone);
  const salonName = safeString(input.salonName);
  const siret = safeString(input.siret);
  const address = safeString(input.address);

  if (!firstName) return { success: false as const, error: "Le prénom est obligatoire" };
  if (!email || !email.includes("@")) return { success: false as const, error: "Email invalide" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: tenantId },
        update: {
          firstName,
          lastName: lastName || null,
          fullName: `${firstName} ${lastName}`.trim(),
          email,
          phone: phone || null,
          updatedAt: new Date(),
        },
        create: {
          id: tenantId,
          clerkUserId: tenantId,
          email,
          firstName,
          lastName: lastName || null,
          fullName: `${firstName} ${lastName}`.trim(),
          phone: phone || null,
          role: "OWNER",
          tenantId,
          updatedAt: new Date(),
        },
      });

      if (salonName) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { name: salonName, updatedAt: new Date() },
        });
      }

      await tx.businessSettings.upsert({
        where: { tenantId },
        update: { displayName: salonName || null, updatedAt: new Date() },
        create: {
          id: `biz_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          displayName: salonName || null,
          updatedAt: new Date(),
        },
      });

      await tx.billingProfile.upsert({
        where: { tenantId },
        update: {
          businessName: salonName || null,
          siret: siret || null,
          addressLine1: address || null,
          updatedAt: new Date(),
        },
        create: {
          id: `bill_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          businessName: salonName || null,
          siret: siret || null,
          addressLine1: address || null,
          updatedAt: new Date(),
        },
      });
    });

    revalidatePath("/dashboard/profil");
    revalidatePath("/dashboard");

    return { success: true as const };
  } catch (error) {
    console.error("Error updating profile data:", error);
    return { success: false as const, error: "Erreur lors de l'enregistrement du profil" };
  }
}

import webpush from "web-push";

import prisma from "./prisma";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export type PushPreferenceKey =
  | "stockLowEnabled"
  | "loyalClientThanksEnabled"
  | "onlineBookingEnabled"
  | "paymentReceivedEnabled"
  | "publicBookingChangeEnabled"
  | "automaticFollowUpEnabled";

type PushSendOptions = {
  preferenceKey?: PushPreferenceKey;
};

type PushSendResult = {
  sent: number;
  failed: number;
  removed: number;
};

type WebPushError = Error & {
  statusCode?: number;
};

type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type StoredNotificationPreferences = {
  pushEnabled: boolean;
} & Partial<Record<PushPreferenceKey, boolean>>;

let vapidConfigured = false;

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@glowea.fr";

  if (!publicKey || !privateKey) {
    if (isDevelopment()) {
      console.warn("[push] VAPID keys missing, push notification skipped.");
    }
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function toNotificationPayload(payload: PushPayload) {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/logo-mini.png",
    badge: "/logo-mini.png",
    tag: payload.tag,
    url: payload.url || "/dashboard",
    data: payload.data || {},
  });
}

function isInvalidSubscriptionError(error: WebPushError) {
  return error.statusCode === 404 || error.statusCode === 410;
}

async function sendToSubscriptions(subscriptions: StoredPushSubscription[], payload: PushPayload): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, failed: 0, removed: 0 };
  if (subscriptions.length === 0 || !configureVapid()) return result;

  const body = toNotificationPayload(payload);

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        body
      );
      result.sent += 1;
    } catch (error) {
      const pushError = error as WebPushError;
      result.failed += 1;

      if (isInvalidSubscriptionError(pushError)) {
        await prisma.pushSubscription.deleteMany({
          where: { id: subscription.id },
        });
        result.removed += 1;
      }

      if (isDevelopment()) {
        console.warn("[push] send failed", {
          subscriptionId: subscription.id,
          statusCode: pushError.statusCode,
          message: pushError.message,
        });
      }
    }
  }

  if (isDevelopment()) {
    console.log("[push] send result", result);
  }

  return result;
}

function isPushAllowed(
  preferences: StoredNotificationPreferences | null | undefined,
  preferenceKey?: PushPreferenceKey
) {
  if (preferences?.pushEnabled === false) return false;
  if (preferenceKey && preferences?.[preferenceKey] === false) return false;
  return true;
}

export async function sendPushToTenant(tenantId: string, payload: PushPayload, options: PushSendOptions = {}) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { tenantId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      User: {
        select: {
          NotificationPreference: {
            select: {
              pushEnabled: true,
              stockLowEnabled: true,
              loyalClientThanksEnabled: true,
              onlineBookingEnabled: true,
              paymentReceivedEnabled: true,
              publicBookingChangeEnabled: true,
              automaticFollowUpEnabled: true,
            },
          },
        },
      },
    },
  });

  const enabledSubscriptions = subscriptions
    .filter((subscription) => isPushAllowed(subscription.User.NotificationPreference, options.preferenceKey))
    .map((subscription) => ({
      id: subscription.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    }));

  console.log("Push subscriptions found", enabledSubscriptions.length);

  return sendToSubscriptions(enabledSubscriptions, payload);
}

export async function sendPushToUser(userId: string, payload: PushPayload, options: PushSendOptions = {}) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      User: {
        select: {
          NotificationPreference: {
            select: {
              pushEnabled: true,
              stockLowEnabled: true,
              loyalClientThanksEnabled: true,
              onlineBookingEnabled: true,
              paymentReceivedEnabled: true,
              publicBookingChangeEnabled: true,
              automaticFollowUpEnabled: true,
            },
          },
        },
      },
    },
  });

  const enabledSubscriptions = subscriptions
    .filter((subscription) => isPushAllowed(subscription.User.NotificationPreference, options.preferenceKey))
    .map((subscription) => ({
      id: subscription.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    }));

  return sendToSubscriptions(enabledSubscriptions, payload);
}

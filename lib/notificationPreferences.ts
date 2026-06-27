export const NOTIFICATION_SETTING_KEYS = [
  "pushEnabled",
  "stockLowEnabled",
  "loyalClientThanksEnabled",
  "onlineBookingEnabled",
  "paymentReceivedEnabled",
  "publicBookingChangeEnabled",
  "automaticFollowUpEnabled",
] as const;

export type NotificationSettingKey = (typeof NOTIFICATION_SETTING_KEYS)[number];

export type NotificationPreferenceShape = Record<NotificationSettingKey, boolean>;

const PRO_SETTING_KEYS = new Set<NotificationSettingKey>([
  "onlineBookingEnabled",
  "paymentReceivedEnabled",
  "publicBookingChangeEnabled",
  "automaticFollowUpEnabled",
]);

export function isNotificationSettingKey(value: unknown): value is NotificationSettingKey {
  return typeof value === "string" && (NOTIFICATION_SETTING_KEYS as readonly string[]).includes(value);
}

export function toNotificationPreferences(
  preferences: Partial<NotificationPreferenceShape> | null | undefined
): NotificationPreferenceShape {
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

export function canEnableNotificationSetting(
  key: NotificationSettingKey,
  enabled: boolean,
  canUseProFeatures: boolean
) {
  return !enabled || !PRO_SETTING_KEYS.has(key) || canUseProFeatures;
}

export function getNotificationCompatibilityUpdate(key: NotificationSettingKey, enabled: boolean) {
  if (key === "stockLowEnabled") {
    return { stockAlertEnabled: enabled };
  }

  if (key === "automaticFollowUpEnabled") {
    return { appointmentReminderEnabled: enabled };
  }

  return {};
}

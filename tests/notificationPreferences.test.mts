import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canEnableNotificationSetting,
  getNotificationCompatibilityUpdate,
  isNotificationSettingKey,
  toNotificationPreferences,
} from "../lib/notificationPreferences.ts";
import {
  getPushPreferenceUpdate,
  isValidPushSubscription,
} from "../lib/pushSubscriptions.ts";

describe("notification preferences", () => {
  it("validates notification preference keys before updates", () => {
    assert.equal(isNotificationSettingKey("stockLowEnabled"), true);
    assert.equal(isNotificationSettingKey("pushEnabled"), true);
    assert.equal(isNotificationSettingKey("unknownSetting"), false);
  });

  it("returns defaults while preserving modified preferences", () => {
    const preferences = toNotificationPreferences({
      stockLowEnabled: false,
      automaticFollowUpEnabled: false,
    });

    assert.equal(preferences.pushEnabled, true);
    assert.equal(preferences.stockLowEnabled, false);
    assert.equal(preferences.automaticFollowUpEnabled, false);
    assert.equal(preferences.loyalClientThanksEnabled, true);
  });

  it("keeps compatibility fields in sync when specific preferences change", () => {
    assert.deepEqual(getNotificationCompatibilityUpdate("stockLowEnabled", false), {
      stockAlertEnabled: false,
    });
    assert.deepEqual(getNotificationCompatibilityUpdate("automaticFollowUpEnabled", true), {
      appointmentReminderEnabled: true,
    });
    assert.deepEqual(getNotificationCompatibilityUpdate("loyalClientThanksEnabled", false), {});
  });

  it("blocks enabling pro notification preferences when pro features are unavailable", () => {
    assert.equal(canEnableNotificationSetting("automaticFollowUpEnabled", true, false), false);
    assert.equal(canEnableNotificationSetting("automaticFollowUpEnabled", false, false), true);
    assert.equal(canEnableNotificationSetting("stockLowEnabled", true, false), true);
    assert.equal(canEnableNotificationSetting("automaticFollowUpEnabled", true, true), true);
  });
});

describe("push notifications", () => {
  it("accepts a valid push subscription payload", () => {
    assert.equal(
      isValidPushSubscription({
        endpoint: "https://push.example/subscription",
        keys: {
          p256dh: "client-public-key",
          auth: "auth-secret",
        },
      }),
      true
    );
  });

  it("rejects invalid push subscription payloads", () => {
    assert.equal(isValidPushSubscription(null), false);
    assert.equal(isValidPushSubscription({ endpoint: "" }), false);
    assert.equal(isValidPushSubscription({ endpoint: "https://push.example/subscription" }), false);
    assert.equal(
      isValidPushSubscription({
        endpoint: "https://push.example/subscription",
        keys: { p256dh: "client-public-key" },
      }),
      false
    );
  });

  it("sets pushEnabled to true when activating push notifications", () => {
    assert.deepEqual(getPushPreferenceUpdate(true), { pushEnabled: true });
  });

  it("sets pushEnabled to false when disabling push notifications", () => {
    assert.deepEqual(getPushPreferenceUpdate(false), { pushEnabled: false });
  });
});

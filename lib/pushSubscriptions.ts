export type PushSubscriptionInput = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

export type ValidPushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function isValidPushSubscription(input: unknown): input is ValidPushSubscriptionInput {
  if (!input || typeof input !== "object") return false;
  const subscription = input as PushSubscriptionInput;

  return (
    typeof subscription.endpoint === "string" &&
    subscription.endpoint.length > 0 &&
    typeof subscription.keys?.p256dh === "string" &&
    subscription.keys.p256dh.length > 0 &&
    typeof subscription.keys?.auth === "string" &&
    subscription.keys.auth.length > 0
  );
}

export function getPushPreferenceUpdate(enabled: boolean) {
  return {
    pushEnabled: enabled,
  };
}

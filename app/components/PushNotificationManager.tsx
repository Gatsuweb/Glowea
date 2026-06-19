"use client";

import { useEffect, useState } from "react";

import styles from "./PushNotificationManager.module.css";

type ManagerState = "hidden" | "ready" | "saving";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function canUsePush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

async function registerSubscription() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  return response.ok;
}

export default function PushNotificationManager() {
  const [state, setState] = useState<ManagerState>("hidden");

  useEffect(() => {
    if (!canUsePush() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    if (Notification.permission === "granted") {
      registerSubscription().catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[push] subscription registration failed", error);
        }
      });
      return;
    }

    if (Notification.permission === "default") {
      const timeoutId = window.setTimeout(() => setState("ready"), 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, []);

  const enablePush = async () => {
    if (!canUsePush()) return;

    setState("saving");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("hidden");
        return;
      }

      const saved = await registerSubscription();
      setState(saved ? "hidden" : "ready");
    } catch (error) {
      setState("ready");
      if (process.env.NODE_ENV !== "production") {
        console.warn("[push] enable failed", error);
      }
    }
  };

  if (state === "hidden") return null;

  return (
    <button
      type="button"
      className={styles.pushButton}
      onClick={enablePush}
      disabled={state === "saving"}
      title="Activer les notifications"
    >
      <svg className={styles.pushIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {state === "saving" ? "Activation..." : "Activer les alertes"}
    </button>
  );
}

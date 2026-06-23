import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushSubscriptionInput = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

type ValidPushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function isValidSubscription(input: unknown): input is ValidPushSubscriptionInput {
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

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const subscription = body?.subscription ?? body;

  if (!isValidSubscription(subscription)) {
    return NextResponse.json({ error: "Subscription push invalide." }, { status: 400 });
  }

  const tenantId = await getTenantId();
  const now = new Date();

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      id: `psh_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: req.headers.get("user-agent"),
      updatedAt: now,
    },
    update: {
      tenantId,
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: req.headers.get("user-agent"),
      updatedAt: now,
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      pushEnabled: true,
      updatedAt: now,
    },
    create: {
      id: `npr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      userId,
      pushEnabled: true,
      updatedAt: now,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[push] subscription saved", { tenantId, userId });
  }

  return NextResponse.json({ success: true });
}

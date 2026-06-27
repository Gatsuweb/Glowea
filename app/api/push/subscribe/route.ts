import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";
import { getPushPreferenceUpdate, isValidPushSubscription } from "@/lib/pushSubscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const subscription = body?.subscription ?? body;

  if (!isValidPushSubscription(subscription)) {
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
      ...getPushPreferenceUpdate(true),
      updatedAt: now,
    },
    create: {
      id: `npr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      userId,
      ...getPushPreferenceUpdate(true),
      updatedAt: now,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[push] subscription saved", { tenantId, userId });
  }

  return NextResponse.json({ success: true });
}

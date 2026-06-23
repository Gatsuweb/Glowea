import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint push invalide." }, { status: 400 });
  }

  const tenantId = await getTenantId();
  const now = new Date();
  const deleted = await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      tenantId,
      userId,
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      pushEnabled: false,
      updatedAt: now,
    },
    create: {
      id: `npr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      userId,
      pushEnabled: false,
      updatedAt: now,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[push] subscription removed", { tenantId, userId, count: deleted.count });
  }

  return NextResponse.json({ success: true });
}

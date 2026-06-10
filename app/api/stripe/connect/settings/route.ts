import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeDepositAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(1000000, Math.round(amount));
}

function normalizeDepositType(value: unknown) {
  return value === "percent" ? "percent" : "fixed";
}

export async function PATCH(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();
  const defaultDepositType = normalizeDepositType(body.defaultDepositType);
  const defaultDepositAmount = normalizeDepositAmount(body.defaultDepositAmount);

  if (defaultDepositType === "percent" && defaultDepositAmount > 100) {
    return NextResponse.json({ error: "Le pourcentage d'arrhes doit être compris entre 0 et 100." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, clerkUserId: userId, tenantId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      defaultDepositAmount,
      defaultDepositType,
      updatedAt: new Date(),
    },
    select: {
      defaultDepositAmount: true,
      defaultDepositType: true,
    },
  });

  return NextResponse.json({ success: true, user: updatedUser });
}

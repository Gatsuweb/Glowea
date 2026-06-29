import { NextResponse } from "next/server";

import { getPublicAvailability } from "@/lib/bookingAvailability";
import prisma from "@/lib/prisma";
import { getSubscriptionAccessFromTenant } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const params = await context.params;
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId") || "";
  const serviceIds = [
    ...url.searchParams.getAll("serviceIds"),
    ...(url.searchParams.get("serviceIds") || "").split(","),
  ].map((id) => id.trim()).filter(Boolean);
  const date = parseDate(url.searchParams.get("date"));

  if ((!serviceId && serviceIds.length === 0) || !date) {
    return NextResponse.json({ success: false, error: "Prestation ou date invalide." }, { status: 400 });
  }

  const profile = await prisma.publicProfile.findUnique({
    where: { slug: params.slug },
    include: {
      Tenant: {
        include: {
          Subscription: {
            select: {
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      },
    },
  });

  if (!profile || !profile.isPublished || !getSubscriptionAccessFromTenant(profile.Tenant).canUseBooking) {
    return NextResponse.json({ success: false, error: "Reservation indisponible." }, { status: 404 });
  }

  const availability = await getPublicAvailability({
    tenantId: profile.tenantId,
    serviceId,
    serviceIds,
    date,
  });

  if (!availability.success) {
    return NextResponse.json(availability, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    slots: availability.slots,
    durationMin: availability.durationMin,
    bookingSettings: availability.bookingSettings,
    depositAmount: availability.depositAmount,
    priceCents: availability.priceCents,
  });
}

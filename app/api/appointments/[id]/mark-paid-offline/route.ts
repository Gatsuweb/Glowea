import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  getAppointmentFinancialSummary,
  normalizeAppointmentPaymentMethod,
} from "@/lib/appointmentFinance";
import { getAppointmentServicesLabel } from "@/lib/appointmentServices";
import { recordAppointmentPayment } from "@/lib/appointmentPayments";
import { requireTenantMutationAccess } from "@/lib/subscription";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCustomPriceCents(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const params = await context.params;
  const appointmentId = params.id;
  const body = await req.json().catch(() => ({}));
  const normalizedMethod = normalizeAppointmentPaymentMethod(body.paymentMethod) || "other";
  const customPriceCents = parseCustomPriceCents(body.customPriceCents);

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      Service: true,
      AppointmentService: {
        include: { Service: true },
        orderBy: { position: "asc" },
      },
      Session: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const initialFinance = getAppointmentFinancialSummary(appointment);

  if (customPriceCents !== null) {
    if (customPriceCents < initialFinance.paidAmountCents) {
      return NextResponse.json(
        { error: "Le prix ne peut pas être inférieur au montant déjà encaissé." },
        { status: 400 }
      );
    }

    const adjustedFinance = getAppointmentFinancialSummary({
      ...appointment,
      price: customPriceCents,
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        price: adjustedFinance.priceCents,
        depositAmount: adjustedFinance.depositAmountCents,
        depositPaidAmount: adjustedFinance.depositPaidAmountCents,
        paidAmount: adjustedFinance.paidAmountCents,
        remainingAmount: adjustedFinance.remainingAmountCents,
        updatedAt: new Date(),
      },
    });
  }

  const finance = getAppointmentFinancialSummary({
    ...appointment,
    price: customPriceCents ?? initialFinance.priceCents,
  });
  const remainingAmount = finance.remainingAmountCents;

  if (remainingAmount <= 0) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const paymentResult = await recordAppointmentPayment({
    tenantId,
    appointmentId,
    amountCents: remainingAmount,
    paymentType: "offline",
    paymentMethod: normalizedMethod,
    sourceLabel: `Paiement hors ligne - ${getAppointmentServicesLabel(appointment)}`,
    sessionId: appointment.Session?.id || null,
    externalPaymentId: `manual:${appointmentId}:offline:${normalizedMethod}`,
    transactionDate: new Date(),
  });

  if (!paymentResult.success) {
    return NextResponse.json({ error: paymentResult.error }, { status: 400 });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      paymentMethod: normalizedMethod,
      paymentStatus: "paid_offline",
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

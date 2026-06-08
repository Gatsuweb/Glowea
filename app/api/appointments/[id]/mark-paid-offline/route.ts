import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  getAppointmentFinancialSummary,
  normalizeAppointmentPaymentMethod,
} from "@/lib/appointmentFinance";
import { recordAppointmentPayment } from "@/lib/appointmentPayments";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const params = await context.params;
  const appointmentId = params.id;
  const body = await req.json().catch(() => ({}));
  const normalizedMethod = normalizeAppointmentPaymentMethod(body.paymentMethod) || "other";

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      Service: true,
      Session: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const finance = getAppointmentFinancialSummary(appointment);
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
    sourceLabel: `Paiement hors ligne - ${appointment.Service?.name || "Rendez-vous"}`,
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
      status: "COMPLETED",
      completedAt: new Date(),
      paymentMethod: normalizedMethod,
      paymentStatus: "paid_offline",
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

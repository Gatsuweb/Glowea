import Stripe from "stripe";

import { sendAppointmentPaymentPushOnce } from "./appointmentPaymentPush";
import prisma from "./prisma";
import { recordAppointmentPayment } from "./appointmentPayments";
import { stripe } from "./stripe";

type AppointmentCheckoutPaymentType = "deposit" | "full" | "remaining";

function isAppointmentCheckoutPaymentType(value: string | null | undefined): value is AppointmentCheckoutPaymentType {
  return value === "deposit" || value === "full" || value === "remaining";
}

async function resolveTenantIdForAppointment(appointmentId: string, tenantId?: string | null) {
  if (tenantId) return tenantId;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { tenantId: true },
  });

  return appointment?.tenantId || null;
}

export async function syncAppointmentPaymentFromCheckoutSession(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointmentId || null;
  const paymentType = session.metadata?.paymentType || null;

  if (!appointmentId) {
    return { success: false as const, reason: "missing_appointment_id" as const };
  }

  if (!isAppointmentCheckoutPaymentType(paymentType)) {
    return { success: false as const, reason: "invalid_payment_type" as const };
  }

  const tenantId = await resolveTenantIdForAppointment(appointmentId, session.metadata?.tenantId || null);
  if (!tenantId) {
    return { success: false as const, reason: "tenant_not_found" as const };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  const amountCents = session.amount_total || session.amount_subtotal || 0;

  if (amountCents <= 0) {
    return { success: false as const, reason: "zero_amount" as const };
  }

  const paymentResult = await recordAppointmentPayment({
    tenantId,
    appointmentId,
    amountCents,
    paymentType,
    paymentMethod: "stripe",
    sourceLabel:
      paymentType === "deposit"
        ? "Arrhes Stripe"
        : paymentType === "remaining"
          ? "Solde restant Stripe"
          : "Paiement complet Stripe",
    sessionId: null,
    externalPaymentId: paymentIntentId || session.id,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    transactionDate: new Date(session.created ? session.created * 1000 : Date.now()),
  });
  if (!paymentResult.success) {
    return {
      success: false as const,
      reason: "payment_record_failed" as const,
      error: paymentResult.error,
    };
  }

  await prisma.appointment.updateMany({
    where: {
      id: appointmentId,
      tenantId,
      status: "PENDING_PAYMENT",
      paymentStatus: { in: ["deposit_paid", "paid", "paid_offline"] },
    },
    data: {
      status: "CONFIRMED",
      expiresAt: null,
      updatedAt: new Date(),
    },
  });

  try {
    await sendAppointmentPaymentPushOnce({
      tenantId,
      appointmentId,
      paymentType,
      checkoutSessionId: session.id,
    });
  } catch (pushError) {
    console.error("[push] appointment payment sync notification failed:", pushError);
  }

  return {
    success: true as const,
    appointmentId,
    tenantId,
    paymentType,
    amountCents,
    skipped: Boolean("skipped" in paymentResult && paymentResult.skipped),
  };
}

export async function syncAppointmentPaymentFromCheckoutSessionId(
  sessionId: string,
  expectedAppointmentId?: string | null
) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.mode !== "payment") {
    return { success: false as const, reason: "not_payment_mode" as const };
  }

  const appointmentId = session.metadata?.appointmentId || null;
  if (expectedAppointmentId && appointmentId && expectedAppointmentId !== appointmentId) {
    return { success: false as const, reason: "appointment_mismatch" as const };
  }

  return syncAppointmentPaymentFromCheckoutSession(session);
}

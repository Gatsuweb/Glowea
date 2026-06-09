import prisma from "./prisma";
import {
  AppointmentPaymentMethod,
  AppointmentPaymentStatus,
  centsToEuros,
  clampCents,
  getAppointmentFinancialSummary,
  mapAppointmentPaymentMethodToFinancialMethod,
  normalizeAppointmentPaymentMethod,
} from "./appointmentFinance";

type PaymentType = "deposit" | "full" | "remaining" | "offline";

type RecordAppointmentPaymentParams = {
  tenantId: string;
  appointmentId: string;
  amountCents: number;
  paymentType: PaymentType;
  paymentMethod: AppointmentPaymentMethod | string;
  sourceLabel: string;
  transactionDate?: Date;
  sessionId?: string | null;
  externalPaymentId: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
};

function buildPaymentStatus(params: {
  paymentType: PaymentType;
  paymentMethod: AppointmentPaymentMethod | string;
  priceCents: number;
  depositAmountCents: number;
  depositPaidAmountCents: number;
  paidAmountCents: number;
}) {
  const normalizedMethod = normalizeAppointmentPaymentMethod(params.paymentMethod);

  if (params.paidAmountCents <= 0) {
    return params.depositAmountCents > 0 ? ("deposit_pending" as AppointmentPaymentStatus) : "none";
  }

  if (params.paidAmountCents >= params.priceCents && params.priceCents > 0) {
    return normalizedMethod && normalizedMethod !== "stripe" ? "paid_offline" : "paid";
  }

  if (params.paymentType === "deposit" && params.depositPaidAmountCents > 0) {
    return "deposit_paid";
  }

  if (params.depositPaidAmountCents > 0 && params.paidAmountCents <= params.depositPaidAmountCents) {
    return "deposit_paid";
  }

  return "partial_paid";
}

export async function recordAppointmentPayment(params: RecordAppointmentPaymentParams) {
  const amountCents = clampCents(params.amountCents);
  if (amountCents <= 0) {
    return { success: false as const, error: "Montant de paiement invalide" };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.appointmentId, tenantId: params.tenantId },
    include: {
      Service: true,
      Session: true,
    },
  });

  if (!appointment) {
    return { success: false as const, error: "Rendez-vous introuvable" };
  }

  const externalPaymentId = params.externalPaymentId.trim();
  const existingPayment = await prisma.financialTransaction.findFirst({
    where: {
      tenantId: params.tenantId,
      externalPaymentId,
      sourceType: "APPOINTMENT",
    },
    select: { id: true },
  });

  if (existingPayment) {
    return { success: true as const, skipped: true, appointmentId: appointment.id };
  }

  const current = getAppointmentFinancialSummary(appointment);
  const remainingBefore = current.remainingAmountCents;
  if (remainingBefore <= 0) {
    return { success: false as const, error: "Aucun montant restant a encaisser" };
  }
  const appliedAmount = Math.min(amountCents, remainingBefore);

  const nextDepositPaidAmountCents =
    params.paymentType === "deposit"
      ? clampCents(current.depositPaidAmountCents + appliedAmount, current.priceCents)
      : current.depositPaidAmountCents;
  const nextPaidAmountCents = clampCents(current.paidAmountCents + appliedAmount, current.priceCents);
  const nextRemainingAmountCents = Math.max(current.priceCents - nextPaidAmountCents, 0);
  const nextPaymentStatus = buildPaymentStatus({
    paymentType: params.paymentType,
    paymentMethod: params.paymentMethod,
    priceCents: current.priceCents,
    depositAmountCents: current.depositAmountCents,
    depositPaidAmountCents: nextDepositPaidAmountCents,
    paidAmountCents: nextPaidAmountCents,
  });
  const normalizedMethod = normalizeAppointmentPaymentMethod(params.paymentMethod);

  const transaction = await prisma.$transaction(async (tx) => {
    const createdTransaction = await tx.financialTransaction.create({
      data: {
        id: `txn_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId: params.tenantId,
        appointmentId: appointment.id,
        sessionId: params.sessionId || appointment.Session?.id || null,
        externalPaymentId,
        type: "INCOME",
        sourceType: "APPOINTMENT",
        label: params.sourceLabel,
        amount: centsToEuros(appliedAmount),
        currency: "EUR",
        paymentMethod: mapAppointmentPaymentMethodToFinancialMethod(normalizedMethod || params.paymentMethod),
        transactionDate: params.transactionDate || new Date(),
        updatedAt: new Date(),
      },
    });

    const updatedAppointment = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        price: current.priceCents,
        depositAmount: current.depositAmountCents,
        depositPaidAmount: nextDepositPaidAmountCents,
        paidAmount: nextPaidAmountCents,
        remainingAmount: nextRemainingAmountCents,
        paymentMethod: normalizedMethod,
        paymentStatus: nextPaymentStatus,
        stripeCheckoutSessionId: params.stripeCheckoutSessionId || appointment.stripeCheckoutSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId || appointment.stripePaymentIntentId,
        updatedAt: new Date(),
      },
    });

    return { createdTransaction, updatedAppointment };
  });

  return {
    success: true as const,
    appointment: transaction.updatedAppointment,
    transaction: transaction.createdTransaction,
    appliedAmountCents: appliedAmount,
    remainingAmountCents: nextRemainingAmountCents,
    paidAmountCents: nextPaidAmountCents,
  };
}

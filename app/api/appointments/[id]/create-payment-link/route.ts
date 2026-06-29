import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getAppointmentFinancialSummary } from "@/lib/appointmentFinance";
import { getAppointmentServicesLabel } from "@/lib/appointmentServices";
import { requireTenantMutationAccess } from "@/lib/subscription";
import { stripe } from "@/lib/stripe";
import { getCurrentUserRecord } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentType = "deposit" | "full" | "remaining";

function isPaymentType(value: unknown): value is PaymentType {
  return value === "deposit" || value === "full" || value === "remaining";
}

function parseCustomPriceCents(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function getApplicationFeeAmount(amount: number) {
  const fixedFee = Number(process.env.STRIPE_APPLICATION_FEE_AMOUNT || 0);
  if (Number.isFinite(fixedFee) && fixedFee > 0) {
    return Math.min(Math.round(fixedFee), amount);
  }

  const feePercent = Number(process.env.STRIPE_APPLICATION_FEE_PERCENT || 0);
  if (!Number.isFinite(feePercent) || feePercent <= 0) return undefined;

  return Math.min(Math.round(amount * (feePercent / 100)), amount);
}

function getDefaultDepositAmount(params: {
  price: number;
  defaultDepositAmount: number;
  defaultDepositType: "fixed" | "percent";
}) {
  if (params.defaultDepositType === "percent") {
    return Math.round(params.price * (params.defaultDepositAmount / 100));
  }

  return params.defaultDepositAmount;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserRecord = await getCurrentUserRecord();
  const tenantId = currentUserRecord.tenantId;
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const params = await context.params;
  const appointmentId = params.id;
  const body = await req.json();
  const paymentType = body.paymentType;
  const customPriceCents = parseCustomPriceCents(body.customPriceCents);

  if (!isPaymentType(paymentType)) {
    return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: currentUserRecord.id, tenantId },
    select: {
      id: true,
      stripeAccountId: true,
      paymentsEnabled: true,
      defaultDepositAmount: true,
      defaultDepositType: true,
    },
  });

  if (!user?.stripeAccountId || !user.paymentsEnabled) {
    return NextResponse.json({ error: "Stripe Connect onboarding is not complete" }, { status: 403 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      Client: true,
      Service: true,
      AppointmentService: {
        include: { Service: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const currentSummary = getAppointmentFinancialSummary(appointment);
  const price = customPriceCents ?? currentSummary.priceCents;

  if (price < currentSummary.paidAmountCents) {
    return NextResponse.json(
      { error: "Le prix ne peut pas être inférieur au montant déjà encaissé." },
      { status: 400 }
    );
  }

  const current = getAppointmentFinancialSummary({
    ...appointment,
    price,
  });

  if (price <= 0) {
    return NextResponse.json({ error: "Appointment price must be greater than zero" }, { status: 400 });
  }

  const computedDepositAmount = current.depositAmountCents || getDefaultDepositAmount({
    price,
    defaultDepositAmount: user.defaultDepositAmount,
    defaultDepositType: user.defaultDepositType,
  });
  const depositAmount = Math.min(Math.max(computedDepositAmount, 0), price);
  const remainingAmount = current.remainingAmountCents;
  const amount =
    paymentType === "deposit"
      ? depositAmount
      : paymentType === "remaining" || paymentType === "full"
        ? remainingAmount
        : price;

  if (amount <= 0) {
    return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const clientName = `${appointment.Client?.firstName || ""} ${appointment.Client?.lastName || ""}`.trim();
  const serviceName = getAppointmentServicesLabel(appointment);
  const applicationFeeAmount = getApplicationFeeAmount(amount);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: appointment.Client?.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name:
              paymentType === "deposit"
                ? `Arrhes - ${serviceName}`
                : paymentType === "remaining"
                  ? `Solde restant - ${serviceName}`
                  : serviceName,
            description: clientName || undefined,
          },
        },
      },
    ],
    payment_intent_data: {
      metadata: {
        appointmentId,
        tenantId,
        userId,
        paymentType,
      },
      transfer_data: {
        destination: user.stripeAccountId,
      },
      ...(applicationFeeAmount ? { application_fee_amount: applicationFeeAmount } : {}),
    },
    metadata: {
      appointmentId,
      tenantId,
      userId,
      paymentType,
    },
    success_url: `${appUrl}/dashboard/agenda?payment=success&appointmentId=${appointmentId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/agenda?payment=cancel&appointmentId=${appointmentId}`,
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      price,
      depositAmount,
      depositPaidAmount: current.depositPaidAmountCents,
      paidAmount: current.paidAmountCents,
      remainingAmount,
      paymentStatus: paymentType === "deposit" ? "deposit_pending" : appointment.paymentStatus,
      stripeCheckoutSessionId: checkoutSession.id,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";
import { normalizeAppointmentPaymentMethod } from "../../lib/appointmentFinance";
import { recordAppointmentPayment } from "../../lib/appointmentPayments";


export async function processPayment(data: {
  appointmentId: string;
  clientId: string;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "OTHER";
  serviceName: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const { appointmentId, clientId, amount, paymentMethod, serviceName } = data;

    // Verify appointment exists
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId: TENANT_ID },
      include: { Session: true, Service: true }
    });

    if (!appointment) {
      return { success: false, error: "Rendez-vous introuvable" };
    }

    if (appointment.clientId !== clientId) {
      return { success: false, error: "Cliente invalide pour ce rendez-vous" };
    }

    const normalizedMethod = normalizeAppointmentPaymentMethod(paymentMethod) || "other";

    const paymentResult = await recordAppointmentPayment({
      tenantId: TENANT_ID,
      appointmentId,
      amountCents: amount,
      paymentType: "offline",
      paymentMethod: normalizedMethod,
      sourceLabel: `Paiement pour ${serviceName}`,
      sessionId: appointment.Session ? appointment.Session.id : null,
      externalPaymentId: `manual:${appointmentId}:${normalizedMethod}:${amount}`,
      transactionDate: new Date(),
    });

    if (!paymentResult.success) {
      return { success: false, error: paymentResult.error };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard/compta");

    return { success: true };
  } catch (error) {
    console.error("Error processing payment:", error);
    return { success: false, error: "Erreur lors de la validation du paiement" };
  }
}

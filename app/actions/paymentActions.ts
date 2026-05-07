"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";


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
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { Session: true }
    });

    if (!appointment) {
      return { success: false, error: "Rendez-vous introuvable" };
    }

    // Generate transaction ID
    const transactionId = `txn_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Use a Prisma transaction to ensure both payment record and appointment status update succeed together
    await prisma.$transaction([
      prisma.financialTransaction.create({
        data: {
          id: transactionId,
          tenantId: TENANT_ID,
          appointmentId: appointmentId,
          sessionId: appointment.Session ? appointment.Session.id : null,
          type: "INCOME",
          sourceType: "APPOINTMENT",
          label: `Paiement pour ${serviceName}`,
          amount: amount,
          currency: "EUR",
          paymentMethod: paymentMethod,
          transactionDate: new Date(),
          updatedAt: new Date(),
        }
      }),
      prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          paymentStatus: "PAID",
          completedAt: new Date(),
          updatedAt: new Date(),
        }
      })
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard/compta");

    return { success: true };
  } catch (error) {
    console.error("Error processing payment:", error);
    return { success: false, error: "Erreur lors de la validation du paiement" };
  }
}

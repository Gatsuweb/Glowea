"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";


export async function createAppointment(data: {
  clientId: string;
  serviceId: string;
  scheduledAt: Date;
  endAt?: Date;
  notes?: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const id = `app_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    
    // Si la date de fin n'est pas fournie, on la calcule à partir de la durée du service
    let finalEndAt = data.endAt;
    if (!finalEndAt) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId }
      });
      const durationMin = service?.durationMin || 60;
      finalEndAt = new Date(data.scheduledAt.getTime() + durationMin * 60000);
    }

    const appointment = await prisma.appointment.create({
      data: {
        id,
        tenantId: TENANT_ID,
        clientId: data.clientId,
        serviceId: data.serviceId,
        scheduledAt: data.scheduledAt,
        endAt: finalEndAt,
        notes: data.notes,
        status: "SCHEDULED",
        paymentStatus: "PENDING",
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");
    return { success: true, appointment };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Erreur lors de la création du rendez-vous" };
  }
}

export async function updateAppointment(id: string, data: {
  clientId?: string;
  serviceId?: string;
  scheduledAt?: Date;
  endAt?: Date;
  notes?: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    // Si le service ou l'heure change et qu'il n'y a pas de date de fin, la recalculer
    let finalEndAt = data.endAt;
    if (!finalEndAt && data.scheduledAt && data.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId }
      });
      const durationMin = service?.durationMin || 60;
      finalEndAt = new Date(data.scheduledAt.getTime() + durationMin * 60000);
    }

    const appointment = await prisma.appointment.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        ...data,
        endAt: finalEndAt,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");
    return { success: true, appointment };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Erreur lors de la mise à jour du rendez-vous" };
  }
}

export async function deleteAppointment(id: string) {
  const TENANT_ID = await getTenantId();
  try {
    await prisma.appointment.delete({
      where: { id, tenantId: TENANT_ID },
    });

    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return { success: false, error: "Erreur lors de la suppression du rendez-vous" };
  }
}

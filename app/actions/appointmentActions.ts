"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess } from "../../lib/subscription";

type AppointmentStatusInput =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

type AppointmentMutationInput = {
  clientId: string;
  serviceId: string;
  scheduledAt: Date;
  endAt?: Date;
  notes?: string;
};

const ACTIVE_CONFLICT_STATUSES: AppointmentStatusInput[] = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
];

function get24hReminderScheduledFor(scheduledAt: Date) {
  return new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function normalizeNotes(notes?: string) {
  const value = notes?.trim();
  return value ? value.slice(0, 1000) : null;
}

function isValidStatus(status: string): status is AppointmentStatusInput {
  return ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED", "NO_SHOW"].includes(status);
}

function revalidateAgendaViews() {
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
}

async function getOwnedClientAndService(tenantId: string, clientId: string, serviceId: string) {
  const [client, service] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, tenantId, archivedAt: null },
      select: { id: true },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, tenantId, isActive: true },
      select: { id: true, durationMin: true },
    }),
  ]);

  if (!client) {
    return { error: "Cliente introuvable pour ce compte" };
  }

  if (!service) {
    return { error: "Prestation introuvable pour ce compte" };
  }

  return { client, service };
}

function getAppointmentEndAt(scheduledAt: Date, endAt: Date | undefined, durationMin: number | null) {
  if (endAt) return endAt;
  return new Date(scheduledAt.getTime() + (durationMin || 60) * 60000);
}

async function upsert24hReminderForAppointment(params: {
  tenantId: string;
  appointmentId: string;
  scheduledAt: Date;
}) {
  const scheduledFor = get24hReminderScheduledFor(params.scheduledAt);
  const reminderId = `rem24_push_${params.appointmentId}`;

  await prisma.appointmentReminder.upsert({
    where: { id: reminderId },
    create: {
      id: reminderId,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      channel: "PUSH",
      status: "PENDING",
      scheduledFor,
      updatedAt: new Date(),
    },
    update: {
      scheduledFor,
      status: "PENDING",
      sentAt: null,
      errorMessage: null,
      updatedAt: new Date(),
    },
  });
}

async function findConflictingAppointment(params: {
  tenantId: string;
  scheduledAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}) {
  const dayStart = new Date(params.scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(params.scheduledAt);
  dayEnd.setHours(23, 59, 59, 999);

  const sameDayAppointments = await prisma.appointment.findMany({
    where: {
      tenantId: params.tenantId,
      id: params.excludeAppointmentId ? { not: params.excludeAppointmentId } : undefined,
      status: { in: ACTIVE_CONFLICT_STATUSES },
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      Client: true,
      Service: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return sameDayAppointments.find((appointment) => {
    const existingStart = appointment.scheduledAt;
    const existingEnd =
      appointment.endAt ||
      new Date(existingStart.getTime() + (appointment.Service?.durationMin || 60) * 60000);

    return params.scheduledAt < existingEnd && params.endAt > existingStart;
  });
}

function formatConflictMessage(conflict: Awaited<ReturnType<typeof findConflictingAppointment>>) {
  if (!conflict) return "Ce creneau est deja occupe";

  const clientName = `${conflict.Client?.firstName || ""} ${conflict.Client?.lastName || ""}`.trim() || "une cliente";
  const time = conflict.scheduledAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Conflit horaire : ${clientName} a deja un rendez-vous a ${time}`;
}

async function cancelPendingReminders(tenantId: string, appointmentId: string) {
  await prisma.appointmentReminder.updateMany({
    where: { tenantId, appointmentId, status: "PENDING" },
    data: { status: "CANCELED", updatedAt: new Date() },
  });
}

export async function schedule24hRemindersForUpcomingAppointments() {
  const tenantId = await getTenantId();
  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: { gte: now },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    select: {
      id: true,
      scheduledAt: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  for (const appt of appointments) {
    await upsert24hReminderForAppointment({
      tenantId,
      appointmentId: appt.id,
      scheduledAt: appt.scheduledAt,
    });
  }

  return { success: true, remindersScheduled: appointments.length };
}

export async function processDueAppointmentReminders() {
  const tenantId = await getTenantId();
  const now = new Date();

  const dueReminders = await prisma.appointmentReminder.findMany({
    where: {
      tenantId,
      status: "PENDING",
      scheduledFor: { lte: now },
      Appointment: {
        scheduledAt: { gte: now },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    },
    include: {
      Appointment: {
        include: {
          Client: true,
          Service: true,
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
    take: 50,
  });

  for (const reminder of dueReminders) {
    const appointment = reminder.Appointment;
    const clientName = `${appointment.Client?.firstName || ""} ${appointment.Client?.lastName || ""}`.trim() || "Client";
    const timeStr = new Date(appointment.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const dateStr = new Date(appointment.scheduledAt).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
    const serviceName = appointment.Service?.name || "Prestation";

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.appointmentReminder.updateMany({
        where: {
          id: reminder.id,
          tenantId,
          status: "PENDING",
        },
        data: {
          status: "SENT",
          sentAt: now,
          updatedAt: now,
        },
      });

      if (claimed.count === 0) return;

      await tx.notification.createMany({
        data: [{
          id: `not_${reminder.id}`,
          tenantId,
          clientId: appointment.clientId,
          appointmentId: appointment.id,
          type: "APPOINTMENT_REMINDER",
          title: "Rappel de rendez-vous (J-1)",
          body: `${clientName} - ${dateStr} a ${timeStr} - ${serviceName}`,
        }],
        skipDuplicates: true,
      });
    });
  }

  return { success: true, processed: dueReminders.length };
}

export async function markAllNotificationsRead() {
  const tenantId = await getTenantId();
  const now = new Date();

  const res = await prisma.notification.updateMany({
    where: { tenantId, readAt: null },
    data: { readAt: now },
  });

  return { success: true, updated: res.count };
}

export async function createAppointment(data: AppointmentMutationInput) {
  const tenantId = await getTenantId();
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    if (!data.clientId || !data.serviceId) {
      return { success: false, error: "Cliente et prestation sont obligatoires" };
    }

    if (!isValidDate(data.scheduledAt)) {
      return { success: false, error: "Date de rendez-vous invalide" };
    }

    const owned = await getOwnedClientAndService(tenantId, data.clientId, data.serviceId);
    if ("error" in owned) {
      return { success: false, error: owned.error };
    }

    const finalEndAt = getAppointmentEndAt(data.scheduledAt, data.endAt, owned.service.durationMin);
    if (finalEndAt <= data.scheduledAt) {
      return { success: false, error: "L'heure de fin doit etre apres l'heure de debut" };
    }

    const conflict = await findConflictingAppointment({
      tenantId,
      scheduledAt: data.scheduledAt,
      endAt: finalEndAt,
    });

    if (conflict) {
      return { success: false, error: formatConflictMessage(conflict) };
    }

    const appointment = await prisma.appointment.create({
      data: {
        id: `app_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        clientId: data.clientId,
        serviceId: data.serviceId,
        scheduledAt: data.scheduledAt,
        endAt: finalEndAt,
        notes: normalizeNotes(data.notes),
        status: "SCHEDULED",
        paymentStatus: "PENDING",
        updatedAt: new Date(),
      },
    });

    await upsert24hReminderForAppointment({
      tenantId,
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt,
    });

    revalidateAgendaViews();
    return { success: true, appointment };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Erreur lors de la creation du rendez-vous" };
  }
}

export async function updateAppointment(
  id: string,
  data: Partial<AppointmentMutationInput> & { status?: AppointmentStatusInput }
) {
  const tenantId = await getTenantId();
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const existingAppointment = await prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { Service: true },
    });

    if (!existingAppointment) {
      return { success: false, error: "Rendez-vous introuvable" };
    }

    const finalClientId = data.clientId || existingAppointment.clientId;
    const finalServiceId = data.serviceId || existingAppointment.serviceId;

    if (!finalServiceId) {
      return { success: false, error: "Une prestation est obligatoire" };
    }

    const owned = await getOwnedClientAndService(tenantId, finalClientId, finalServiceId);
    if ("error" in owned) {
      return { success: false, error: owned.error };
    }

    const finalScheduledAt = data.scheduledAt || existingAppointment.scheduledAt;
    if (!isValidDate(finalScheduledAt)) {
      return { success: false, error: "Date de rendez-vous invalide" };
    }

    const finalEndAt = getAppointmentEndAt(finalScheduledAt, data.endAt, owned.service.durationMin);
    if (finalEndAt <= finalScheduledAt) {
      return { success: false, error: "L'heure de fin doit etre apres l'heure de debut" };
    }

    const finalStatus = data.status || existingAppointment.status;
    if (!isValidStatus(finalStatus)) {
      return { success: false, error: "Statut de rendez-vous invalide" };
    }

    if (ACTIVE_CONFLICT_STATUSES.includes(finalStatus)) {
      const conflict = await findConflictingAppointment({
        tenantId,
        scheduledAt: finalScheduledAt,
        endAt: finalEndAt,
        excludeAppointmentId: id,
      });

      if (conflict) {
        return { success: false, error: formatConflictMessage(conflict) };
      }
    }

    const now = new Date();
    const appointment = await prisma.appointment.update({
      where: { id, tenantId },
      data: {
        clientId: finalClientId,
        serviceId: finalServiceId,
        scheduledAt: finalScheduledAt,
        endAt: finalEndAt,
        notes: data.notes !== undefined ? normalizeNotes(data.notes) : existingAppointment.notes,
        status: finalStatus,
        cancelledAt: finalStatus === "CANCELED" ? now : null,
        completedAt: finalStatus === "COMPLETED" ? now : null,
        updatedAt: now,
      },
    });

    if (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED") {
      await upsert24hReminderForAppointment({
        tenantId,
        appointmentId: appointment.id,
        scheduledAt: appointment.scheduledAt,
      });
    } else {
      await cancelPendingReminders(tenantId, appointment.id);
    }

    revalidateAgendaViews();
    return { success: true, appointment };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Erreur lors de la mise a jour du rendez-vous" };
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatusInput) {
  if (!isValidStatus(status)) {
    return { success: false, error: "Statut de rendez-vous invalide" };
  }

  return updateAppointment(id, { status });
}

export async function deleteAppointment(id: string) {
  const tenantId = await getTenantId();
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!appointment) {
      return { success: false, error: "Rendez-vous introuvable" };
    }

    await prisma.appointment.delete({
      where: { id, tenantId },
    });

    revalidateAgendaViews();
    return { success: true };
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return { success: false, error: "Erreur lors de la suppression du rendez-vous" };
  }
}

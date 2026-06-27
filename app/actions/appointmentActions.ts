"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getCurrentUserRecord, getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess } from "../../lib/subscription";
import {
  getAppointmentFinancialSummary,
  isOfflinePaymentMethod,
} from "../../lib/appointmentFinance";
import {
  buildAppointmentServiceSelection,
  getAppointmentServicesSummary,
  normalizeAppointmentServiceIds,
  replaceAppointmentServices,
} from "../../lib/appointmentServices";
import {
  type AppointmentStatusValue,
  BLOCKING_APPOINTMENT_STATUSES,
  REMINDER_ELIGIBLE_APPOINTMENT_STATUSES,
  canTransitionAppointmentStatus,
  getBlockingAppointmentWhere,
  isValidAppointmentStatus,
} from "../../lib/appointmentStatus";
import { notifyLoyalClientIfNeeded } from "../../lib/notificationEvents";
import { sendPushToTenant } from "../../lib/push";
import { addNoShowClientFlag } from "../../lib/clientVigilance";

type AppointmentStatusInput = AppointmentStatusValue;

type AppointmentMutationInput = {
  clientId: string;
  serviceId?: string;
  serviceIds?: string[];
  scheduledAt: Date;
  endAt?: Date;
  price?: number;
  notes?: string;
};

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

function normalizePrice(price?: number) {
  if (price === undefined) return undefined;
  if (!Number.isFinite(price) || price < 0) return 0;
  return Math.min(Math.round(price), 100000000);
}

function isValidStatus(status: string): status is AppointmentStatusInput {
  return isValidAppointmentStatus(status);
}

function statusCanConflict(status: AppointmentStatusInput) {
  return [...BLOCKING_APPOINTMENT_STATUSES, "PENDING_PAYMENT"].includes(status);
}

function revalidateAgendaViews() {
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
}

async function getOwnedClient(tenantId: string, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId, archivedAt: null },
    select: { id: true },
  });

  if (!client) {
    return { error: "Cliente introuvable pour ce compte" };
  }

  return { client };
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
      ...getBlockingAppointmentWhere(),
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      Client: true,
      Service: true,
      AppointmentService: {
        orderBy: { position: "asc" },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return sameDayAppointments.find((appointment) => {
    const existingStart = appointment.scheduledAt;
    const existingEnd =
      appointment.endAt ||
      new Date(existingStart.getTime() + getAppointmentServicesSummary(appointment).totalDurationMin * 60000);

    return params.scheduledAt < existingEnd && params.endAt > existingStart;
  });
}

function formatConflictMessage(conflict: Awaited<ReturnType<typeof findConflictingAppointment>>) {
  if (!conflict) return "Ce créneau est déjà occupé";

  const clientName = `${conflict.Client?.firstName || ""} ${conflict.Client?.lastName || ""}`.trim() || "une cliente";
  const time = conflict.scheduledAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Conflit horaire : ${clientName} a déjà un rendez-vous à ${time}`;
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
      status: { in: [...REMINDER_ELIGIBLE_APPOINTMENT_STATUSES] },
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
        status: { in: [...REMINDER_ELIGIBLE_APPOINTMENT_STATUSES] },
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

    const shouldSendPush = await prisma.$transaction(async (tx) => {
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

      if (claimed.count === 0) return false;

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

      return true;
    });

    if (shouldSendPush) {
      await sendPushToTenant(
        tenantId,
        {
          title: "Rappel de rendez-vous (J-1)",
          body: `${clientName} - ${dateStr} a ${timeStr} - ${serviceName}`,
          url: "/dashboard/agenda",
          tag: `appointment-reminder-${appointment.id}`,
          data: { appointmentId: appointment.id, clientId: appointment.clientId },
        },
        { preferenceKey: "automaticFollowUpEnabled" }
      );
    }
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

export async function markOnlineBookingNotificationsRead() {
  const tenantId = await getTenantId();
  const now = new Date();

  const res = await prisma.notification.updateMany({
    where: {
      tenantId,
      readAt: null,
      Appointment: {
        is: {
          source: "ONLINE_BOOKING",
        },
      },
    },
    data: { readAt: now },
  });

  revalidateAgendaViews();
  return { success: true, updated: res.count };
}

export async function createAppointment(data: AppointmentMutationInput) {
  const currentUserRecord = await getCurrentUserRecord();
  const tenantId = currentUserRecord.tenantId;
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const requestedServiceIds = normalizeAppointmentServiceIds({
      serviceId: data.serviceId,
      serviceIds: data.serviceIds,
    });
    const hasMultipleServices = requestedServiceIds.length > 1;

    if (!data.clientId || requestedServiceIds.length === 0) {
      return { success: false, error: "Cliente et prestation sont obligatoires" };
    }

    if (!isValidDate(data.scheduledAt)) {
      return { success: false, error: "Date de rendez-vous invalide" };
    }

    const owned = await getOwnedClient(tenantId, data.clientId);
    if ("error" in owned) {
      return { success: false, error: owned.error };
    }

    const serviceSelection = await buildAppointmentServiceSelection({
      tenantId,
      serviceIds: requestedServiceIds,
    });
    if ("error" in serviceSelection) {
      return { success: false, error: serviceSelection.error };
    }

    const finalEndAt = hasMultipleServices
      ? getAppointmentEndAt(data.scheduledAt, undefined, serviceSelection.totalDurationMin)
      : getAppointmentEndAt(data.scheduledAt, data.endAt, serviceSelection.totalDurationMin);
    if (finalEndAt <= data.scheduledAt) {
      return { success: false, error: "L'heure de fin doit être après l'heure de début" };
    }

    const conflict = await findConflictingAppointment({
      tenantId,
      scheduledAt: data.scheduledAt,
      endAt: finalEndAt,
    });

    if (conflict) {
      return { success: false, error: formatConflictMessage(conflict) };
    }

    const finalPriceCents = hasMultipleServices
      ? serviceSelection.totalPriceCents
      : normalizePrice(data.price) ?? serviceSelection.totalPriceCents;
    const serviceSnapshots = serviceSelection.snapshots.length === 1
      ? [{ ...serviceSelection.snapshots[0], priceSnapshot: finalPriceCents }]
      : serviceSelection.snapshots;

    const appointment = await prisma.$transaction(async (tx) => {
      const createdAppointment = await tx.appointment.create({
        data: {
          id: `app_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          clientId: data.clientId,
          serviceId: serviceSelection.primaryServiceId,
          createdByUserId: currentUserRecord.id,
          scheduledAt: data.scheduledAt,
          endAt: finalEndAt,
          price: finalPriceCents,
          depositPaidAmount: 0,
          paidAmount: 0,
          remainingAmount: finalPriceCents,
          notes: normalizeNotes(data.notes),
          status: "SCHEDULED",
          paymentStatus: "none",
          updatedAt: new Date(),
        },
      });

      await replaceAppointmentServices(tx, createdAppointment.id, serviceSnapshots);
      return createdAppointment;
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
    return { success: false, error: "Erreur lors de la création du rendez-vous" };
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
      include: {
        Service: true,
        AppointmentService: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!existingAppointment) {
      return { success: false, error: "Rendez-vous introuvable" };
    }

    const finalClientId = data.clientId || existingAppointment.clientId;
    const servicesInputProvided = data.serviceIds !== undefined || data.serviceId !== undefined;
    const existingServiceSummary = getAppointmentServicesSummary(existingAppointment);
    const requestedServiceIds = servicesInputProvided
      ? normalizeAppointmentServiceIds({
          serviceId: data.serviceId,
          serviceIds: data.serviceIds,
        })
      : existingServiceSummary.services.map((service) => service.serviceId);

    if (requestedServiceIds.length === 0) {
      return { success: false, error: "Une prestation est obligatoire" };
    }

    const owned = await getOwnedClient(tenantId, finalClientId);
    if ("error" in owned) {
      return { success: false, error: owned.error };
    }

    const serviceSelection = servicesInputProvided
      ? await buildAppointmentServiceSelection({
          tenantId,
          serviceIds: requestedServiceIds,
        })
      : {
          snapshots: existingServiceSummary.services,
          primaryServiceId: existingServiceSummary.primaryServiceId,
          totalPriceCents: existingServiceSummary.totalPriceCents,
          totalDurationMin: existingServiceSummary.totalDurationMin,
          label: existingServiceSummary.label,
        };

    if ("error" in serviceSelection) {
      return { success: false, error: serviceSelection.error };
    }

    const finalScheduledAt = data.scheduledAt || existingAppointment.scheduledAt;
    if (!isValidDate(finalScheduledAt)) {
      return { success: false, error: "Date de rendez-vous invalide" };
    }

    const finalEndAt = servicesInputProvided && requestedServiceIds.length > 1
      ? getAppointmentEndAt(finalScheduledAt, undefined, serviceSelection.totalDurationMin)
      : getAppointmentEndAt(finalScheduledAt, data.endAt, serviceSelection.totalDurationMin);
    if (finalEndAt <= finalScheduledAt) {
      return { success: false, error: "L'heure de fin doit être après l'heure de début" };
    }

    const finalStatus = data.status || existingAppointment.status;
    if (!isValidStatus(finalStatus)) {
      return { success: false, error: "Statut de rendez-vous invalide" };
    }

    if (finalStatus !== existingAppointment.status) {
      const transition = canTransitionAppointmentStatus({
        from: existingAppointment.status,
        to: finalStatus,
        expiresAt: existingAppointment.expiresAt,
        paymentStatus: existingAppointment.paymentStatus,
        paidAmount: existingAppointment.paidAmount,
        depositPaidAmount: existingAppointment.depositPaidAmount,
      });

      if (!transition.allowed) {
        return { success: false, error: transition.reason };
      }
    }

    const existingFinance = getAppointmentFinancialSummary(existingAppointment);
    const nextPriceCents =
      servicesInputProvided && requestedServiceIds.length > 1
        ? serviceSelection.totalPriceCents
        : data.price !== undefined
        ? normalizePrice(data.price) ?? existingFinance.priceCents
        : servicesInputProvided
          ? serviceSelection.totalPriceCents
          : existingFinance.priceCents;
    const nextStoredPrice = data.price !== undefined || servicesInputProvided ? nextPriceCents : existingAppointment.price;
    const serviceSnapshots = serviceSelection.snapshots.length === 1
      ? [{ ...serviceSelection.snapshots[0], priceSnapshot: nextPriceCents }]
      : serviceSelection.snapshots;
    const shouldReplaceServices = servicesInputProvided || (data.price !== undefined && serviceSnapshots.length === 1);
    const nextDepositPaidCents = Math.min(existingFinance.depositPaidAmountCents, nextPriceCents);
    const nextPaidAmountCents = Math.min(existingFinance.paidAmountCents, nextPriceCents);
    const nextRemainingAmountCents = Math.max(nextPriceCents - nextPaidAmountCents, 0);
    const nextPaymentStatus =
      existingFinance.paymentStatus === "refunded"
        ? "refunded"
        : nextPaidAmountCents <= 0
          ? (existingFinance.depositAmountCents > 0 ? "deposit_pending" : "none")
          : nextPaidAmountCents >= nextPriceCents && nextPriceCents > 0
            ? (isOfflinePaymentMethod(existingFinance.paymentMethod) ? "paid_offline" : "paid")
            : nextDepositPaidCents > 0 && nextPaidAmountCents <= nextDepositPaidCents
              ? "deposit_paid"
              : "partial_paid";

    if (statusCanConflict(finalStatus)) {
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
    const appointment = await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id, tenantId },
        data: {
          clientId: finalClientId,
          serviceId: serviceSelection.primaryServiceId,
          scheduledAt: finalScheduledAt,
          endAt: finalEndAt,
          price: nextStoredPrice,
          depositPaidAmount: nextDepositPaidCents,
          paidAmount: nextPaidAmountCents,
          remainingAmount: nextRemainingAmountCents,
          paymentStatus: nextPaymentStatus,
          notes: data.notes !== undefined ? normalizeNotes(data.notes) : existingAppointment.notes,
          status: finalStatus,
          cancelledAt: finalStatus === "CANCELED" ? now : null,
          completedAt: finalStatus === "COMPLETED" ? now : null,
          updatedAt: now,
        },
      });

      if (shouldReplaceServices) {
        await replaceAppointmentServices(tx, updatedAppointment.id, serviceSnapshots);
      }

      return updatedAppointment;
    });

    if ((REMINDER_ELIGIBLE_APPOINTMENT_STATUSES as readonly string[]).includes(appointment.status)) {
      await upsert24hReminderForAppointment({
        tenantId,
        appointmentId: appointment.id,
        scheduledAt: appointment.scheduledAt,
      });
    } else {
      await cancelPendingReminders(tenantId, appointment.id);
    }

    if (appointment.status === "COMPLETED") {
      await notifyLoyalClientIfNeeded({
        tenantId,
        clientId: appointment.clientId,
        appointmentWasAlreadyCompleted: existingAppointment.status === "COMPLETED",
      });
    }

    if (appointment.status === "NO_SHOW" && existingAppointment.status !== "NO_SHOW") {
      await prisma.$transaction((tx) =>
        addNoShowClientFlag(tx, {
          tenantId,
          clientId: appointment.clientId,
        })
      );
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

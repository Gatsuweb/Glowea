import type { Prisma } from "@prisma/client";

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
  "EXPIRED",
  "NO_SHOW",
] as const;

export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

export const BLOCKING_APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
] as const satisfies AppointmentStatusValue[];

export const COMPLETED_APPOINTMENT_STATUSES = [
  "COMPLETED",
] as const satisfies AppointmentStatusValue[];

export const LOST_APPOINTMENT_STATUSES = [
  "CANCELED",
  "EXPIRED",
  "NO_SHOW",
] as const satisfies AppointmentStatusValue[];

export const ACTIVE_APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
] as const satisfies AppointmentStatusValue[];

export const REMINDER_ELIGIBLE_APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
] as const satisfies AppointmentStatusValue[];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatusValue, string> = {
  SCHEDULED: "Planifié",
  PENDING_PAYMENT: "Paiement requis",
  CONFIRMED: "Confirmé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELED: "Annulé",
  EXPIRED: "Expiré",
  NO_SHOW: "Absente",
};

export const APPOINTMENT_STATUS_TRANSITION_LABELS: Record<AppointmentStatusValue, string> = {
  SCHEDULED: "Planifier",
  PENDING_PAYMENT: "Mettre en paiement requis",
  CONFIRMED: "Confirmer",
  IN_PROGRESS: "Démarrer",
  COMPLETED: "Terminer",
  CANCELED: "Annuler",
  EXPIRED: "Marquer expiré",
  NO_SHOW: "Marquer absente",
};

const VALID_STATUS_SET = new Set<string>(APPOINTMENT_STATUSES);
const LOST_STATUS_SET = new Set<string>(LOST_APPOINTMENT_STATUSES);

export function isValidAppointmentStatus(status: string): status is AppointmentStatusValue {
  return VALID_STATUS_SET.has(status);
}

export function isPendingPaymentExpired(
  appointment: { status: string; expiresAt?: Date | string | null },
  now = new Date()
) {
  if (appointment.status !== "PENDING_PAYMENT") return false;
  if (!appointment.expiresAt) return false;

  const expiresAt = appointment.expiresAt instanceof Date
    ? appointment.expiresAt
    : new Date(appointment.expiresAt);

  return !Number.isNaN(expiresAt.getTime()) && expiresAt <= now;
}

export function isBlockingAppointment(
  appointment: { status: string; expiresAt?: Date | string | null },
  now = new Date()
) {
  if (appointment.status === "PENDING_PAYMENT") {
    return !isPendingPaymentExpired(appointment, now);
  }

  return (BLOCKING_APPOINTMENT_STATUSES as readonly string[]).includes(appointment.status);
}

export function isActiveStatsAppointment(
  appointment: { status: string; expiresAt?: Date | string | null },
  now = new Date()
) {
  if (LOST_STATUS_SET.has(appointment.status)) return false;
  if (appointment.status === "PENDING_PAYMENT") {
    return !isPendingPaymentExpired(appointment, now);
  }
  return true;
}

export function getBlockingAppointmentWhere(now = new Date()): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: { in: [...BLOCKING_APPOINTMENT_STATUSES] } },
      {
        status: "PENDING_PAYMENT",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    ],
  };
}

export function getActiveStatsAppointmentWhere(now = new Date()): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: { in: [...ACTIVE_APPOINTMENT_STATUSES] } },
      {
        status: "PENDING_PAYMENT",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    ],
  };
}

export function hasReceivedAppointmentPayment(appointment: {
  paymentStatus?: string | null;
  paidAmount?: number | null;
  depositPaidAmount?: number | null;
}) {
  return (
    ["deposit_paid", "partial_paid", "paid", "paid_offline"].includes(appointment.paymentStatus || "") ||
    (appointment.paidAmount || 0) > 0 ||
    (appointment.depositPaidAmount || 0) > 0
  );
}

export function getAppointmentStatusLabel(status: string) {
  return isValidAppointmentStatus(status) ? APPOINTMENT_STATUS_LABELS[status] : "À venir";
}

export function canTransitionAppointmentStatus(params: {
  from: AppointmentStatusValue;
  to: AppointmentStatusValue;
  expiresAt?: Date | string | null;
  paymentStatus?: string | null;
  paidAmount?: number | null;
  depositPaidAmount?: number | null;
  now?: Date;
}) {
  const now = params.now || new Date();

  if (params.from === params.to) {
    return { allowed: true as const };
  }

  if (params.from === "SCHEDULED") {
    return ["CONFIRMED", "CANCELED"].includes(params.to)
      ? { allowed: true as const }
      : { allowed: false as const, reason: "Transition invalide depuis un rendez-vous planifie." };
  }

  if (params.from === "CONFIRMED") {
    return ["IN_PROGRESS", "CANCELED", "NO_SHOW"].includes(params.to)
      ? { allowed: true as const }
      : { allowed: false as const, reason: "Transition invalide depuis un rendez-vous confirme." };
  }

  if (params.from === "PENDING_PAYMENT") {
    if (params.to === "CONFIRMED") {
      return hasReceivedAppointmentPayment(params)
        ? { allowed: true as const }
        : { allowed: false as const, reason: "Le rendez-vous ne peut etre confirme qu'apres reception du paiement." };
    }

    if (params.to === "EXPIRED") {
      return isPendingPaymentExpired({ status: params.from, expiresAt: params.expiresAt }, now)
        ? { allowed: true as const }
        : { allowed: false as const, reason: "Le rendez-vous ne peut expirer qu'apres le delai de paiement." };
    }

    return params.to === "CANCELED"
      ? { allowed: true as const }
      : { allowed: false as const, reason: "Transition invalide depuis un rendez-vous en attente de paiement." };
  }

  if (params.from === "IN_PROGRESS") {
    return params.to === "COMPLETED"
      ? { allowed: true as const }
      : { allowed: false as const, reason: "Un rendez-vous en cours doit etre termine avant de changer d'etat." };
  }

  return {
    allowed: false as const,
    reason: "Ce statut est final. Creez ou restaurez explicitement un rendez-vous pour le rouvrir.",
  };
}

export function getAllowedAppointmentStatusTransitions(params: {
  status: AppointmentStatusValue;
  expiresAt?: Date | string | null;
  paymentStatus?: string | null;
  paidAmount?: number | null;
  depositPaidAmount?: number | null;
  now?: Date;
}) {
  return APPOINTMENT_STATUSES.filter((nextStatus) => {
    if (nextStatus === params.status) return false;

    return canTransitionAppointmentStatus({
      from: params.status,
      to: nextStatus,
      expiresAt: params.expiresAt,
      paymentStatus: params.paymentStatus,
      paidAmount: params.paidAmount,
      depositPaidAmount: params.depositPaidAmount,
      now: params.now,
    }).allowed;
  });
}

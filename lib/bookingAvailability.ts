import prisma from "./prisma";
import { getBlockingAppointmentWhere, isBlockingAppointment } from "./appointmentStatus";
import { getAppointmentServicesSummary, normalizeAppointmentServiceIds } from "./appointmentServices";
import type { Prisma } from "@prisma/client";

type BreakWindow = {
  start: string;
  end: string;
};

type DaySchedule = {
  isOpen: boolean;
  start: string;
  end: string;
  breaks: BreakWindow[];
};

type AgendaSettingsLike = {
  workingDaysJson?: unknown;
  openingHoursJson?: unknown;
  defaultAppointmentDuration?: number | null;
  bufferMin?: number | null;
  minBookingNoticeMin?: number | null;
  slotIntervalMin?: number | null;
  depositsEnabled?: boolean | null;
  depositsRequired?: boolean | null;
  depositAmount?: number | null;
  depositType?: "fixed" | "percent" | null;
  pendingBookingTtlMin?: number | null;
} | null;

type BusyWindow = {
  startAt: Date;
  endAt: Date;
};

export type PublicBookingSettings = {
  minBookingNoticeMin: number;
  slotIntervalMin: number;
  bufferMin: number;
  depositsEnabled: boolean;
  depositsRequired: boolean;
  depositAmount: number;
  depositType: "fixed" | "percent";
  pendingBookingTtlMin: number;
};

export type AvailabilitySlot = {
  time: string;
  startAt: string;
  endAt: string;
};

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const defaultWeek: DaySchedule[] = [
  { isOpen: false, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
];

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseTimeToMinutes(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function dateAtMinutes(date: Date, totalMinutes: number) {
  const next = new Date(date);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

function getDayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function normalizeBreaks(value: unknown): BreakWindow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const start = typeof item.start === "string" ? item.start : typeof item.startTime === "string" ? item.startTime : "";
      const end = typeof item.end === "string" ? item.end : typeof item.endTime === "string" ? item.endTime : "";
      return parseTimeToMinutes(start) !== null && parseTimeToMinutes(end) !== null ? { start, end } : null;
    })
    .filter((item): item is BreakWindow => Boolean(item));
}

function normalizeDayConfig(value: unknown, fallback: DaySchedule): DaySchedule {
  if (!isRecord(value)) return fallback;
  const start =
    typeof value.start === "string"
      ? value.start
      : typeof value.startTime === "string"
        ? value.startTime
        : typeof value.from === "string"
          ? value.from
          : fallback.start;
  const end =
    typeof value.end === "string"
      ? value.end
      : typeof value.endTime === "string"
        ? value.endTime
        : typeof value.to === "string"
          ? value.to
          : fallback.end;

  return {
    isOpen: typeof value.isOpen === "boolean" ? value.isOpen : typeof value.open === "boolean" ? value.open : fallback.isOpen,
    start: parseTimeToMinutes(start) === null ? fallback.start : start,
    end: parseTimeToMinutes(end) === null ? fallback.end : end,
    breaks: normalizeBreaks(value.breaks || value.pauses),
  };
}

function getWeekSchedule(settings: AgendaSettingsLike): DaySchedule[] {
  const week = defaultWeek.map((day) => ({ ...day, breaks: [...day.breaks] }));
  const openingHours = settings?.openingHoursJson;

  if (Array.isArray(openingHours)) {
    openingHours.slice(0, 7).forEach((day, index) => {
      week[index] = normalizeDayConfig(day, week[index]);
    });
  } else if (isRecord(openingHours)) {
    dayKeys.forEach((key, index) => {
      const value = openingHours[key] || openingHours[index.toString()];
      if (value) week[index] = normalizeDayConfig(value, week[index]);
    });
  }

  const workingDays = settings?.workingDaysJson;
  if (Array.isArray(workingDays)) {
    workingDays.slice(0, 7).forEach((isOpen, index) => {
      if (typeof isOpen === "boolean") week[index].isOpen = isOpen;
    });
  }

  return week;
}

export function normalizePublicBookingSettings(settings: AgendaSettingsLike): PublicBookingSettings {
  const bufferMin = clampInt(settings?.bufferMin, 0, 0, 240);
  return {
    minBookingNoticeMin: clampInt(settings?.minBookingNoticeMin, 1440, 0, 365 * 24 * 60),
    slotIntervalMin: clampInt(settings?.slotIntervalMin, 30, 5, 240),
    bufferMin,
    depositsEnabled: Boolean(settings?.depositsEnabled),
    depositsRequired: Boolean(settings?.depositsEnabled && settings?.depositsRequired),
    depositAmount: clampInt(settings?.depositAmount, 0, 0, 100000000),
    depositType: settings?.depositType === "percent" ? "percent" : "fixed",
    pendingBookingTtlMin: clampInt(settings?.pendingBookingTtlMin, 15, 1, 120),
  };
}

export function getDepositAmountCents(params: {
  priceCents: number;
  bookingSettings: PublicBookingSettings;
}) {
  if (!params.bookingSettings.depositsEnabled) return 0;
  if (params.bookingSettings.depositType === "percent") {
    return Math.min(params.priceCents, Math.round(params.priceCents * (params.bookingSettings.depositAmount / 100)));
  }
  return Math.min(params.priceCents, params.bookingSettings.depositAmount);
}

function overlaps(a: BusyWindow, b: BusyWindow) {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

function appointmentBlocksSlot(appointment: {
  scheduledAt: Date;
  endAt: Date | null;
  expiresAt?: Date | null;
  status: string;
  Service?: { durationMin: number | null } | null;
  AppointmentService?: Array<{
    serviceId: string;
    nameSnapshot: string;
    priceSnapshot: number;
    durationSnapshot: number;
    position: number | null;
  }> | null;
}, now: Date) {
  if (!isBlockingAppointment(appointment, now)) {
    return null;
  }

  const startAt = appointment.scheduledAt;
  const fallbackDuration = appointment.AppointmentService && appointment.AppointmentService.length > 0
    ? getAppointmentServicesSummary({ AppointmentService: appointment.AppointmentService }).totalDurationMin
    : appointment.Service?.durationMin || 60;
  const endAt = appointment.endAt || new Date(startAt.getTime() + fallbackDuration * 60000);
  return { startAt, endAt };
}

function getAvailableSlotsFromWindows(params: {
  date: Date;
  durationMin: number;
  settings: AgendaSettingsLike;
  appointments: Array<{
    scheduledAt: Date;
    endAt: Date | null;
    expiresAt?: Date | null;
    status: string;
    Service?: { durationMin: number | null } | null;
    AppointmentService?: Array<{
      serviceId: string;
      nameSnapshot: string;
      priceSnapshot: number;
      durationSnapshot: number;
      position: number | null;
    }> | null;
  }>;
  exceptions: BusyWindow[];
  now?: Date;
}) {
  const now = params.now || new Date();
  const bookingSettings = normalizePublicBookingSettings(params.settings);
  const daySchedule = getWeekSchedule(params.settings)[params.date.getDay()];
  if (!daySchedule.isOpen) return [];

  const openStart = parseTimeToMinutes(daySchedule.start);
  const openEnd = parseTimeToMinutes(daySchedule.end);
  if (openStart === null || openEnd === null || openEnd <= openStart) return [];

  const minStartAt = new Date(now.getTime() + bookingSettings.minBookingNoticeMin * 60000);
  const busyWindows = [
    ...params.exceptions,
    ...daySchedule.breaks.map((breakWindow) => ({
      startAt: dateAtMinutes(params.date, parseTimeToMinutes(breakWindow.start) ?? 0),
      endAt: dateAtMinutes(params.date, parseTimeToMinutes(breakWindow.end) ?? 0),
    })),
    ...params.appointments
      .map((appointment) => appointmentBlocksSlot(appointment, now))
      .filter((window): window is BusyWindow => Boolean(window))
      .map((window) => ({
        startAt: new Date(window.startAt.getTime() - bookingSettings.bufferMin * 60000),
        endAt: new Date(window.endAt.getTime() + bookingSettings.bufferMin * 60000),
      })),
  ];

  const slots: AvailabilitySlot[] = [];
  for (let cursor = openStart; cursor + params.durationMin <= openEnd; cursor += bookingSettings.slotIntervalMin) {
    const startAt = dateAtMinutes(params.date, cursor);
    const endAt = new Date(startAt.getTime() + params.durationMin * 60000);
    if (startAt < minStartAt) continue;

    const slotWindow = { startAt, endAt };
    if (busyWindows.some((busy) => overlaps(slotWindow, busy))) continue;

    slots.push({
      time: minutesToTime(cursor),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });
  }

  return slots;
}

export async function getPublicAvailability(params: {
  tenantId: string;
  serviceId?: string;
  serviceIds?: string[];
  date: Date;
  now?: Date;
}) {
  const { start, end } = getDayBounds(params.date);
  const serviceIds = normalizeAppointmentServiceIds({
    serviceId: params.serviceId,
    serviceIds: params.serviceIds,
  });

  if (serviceIds.length === 0) {
    return { success: false as const, error: "Prestation introuvable." };
  }

  const [settings, services, appointments, exceptions] = await Promise.all([
    prisma.agendaSettings.findUnique({ where: { tenantId: params.tenantId } }),
    prisma.service.findMany({
      where: { id: { in: serviceIds }, tenantId: params.tenantId, isActive: true, isPublic: true },
      select: { id: true, durationMin: true, price: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: params.tenantId,
        ...getBlockingAppointmentWhere(),
        scheduledAt: { lte: end },
        OR: [{ endAt: null }, { endAt: { gte: start } }],
      },
      select: {
        scheduledAt: true,
        endAt: true,
        expiresAt: true,
        status: true,
        Service: { select: { durationMin: true } },
        AppointmentService: {
          select: {
            serviceId: true,
            nameSnapshot: true,
            priceSnapshot: true,
            durationSnapshot: true,
            position: true,
          },
        },
      },
    }),
    prisma.availabilityException.findMany({
      where: {
        tenantId: params.tenantId,
        startAt: { lte: end },
        endAt: { gte: start },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  if (services.length !== serviceIds.length) {
    return { success: false as const, error: "Prestation introuvable." };
  }

  const servicesById = new Map(services.map((service) => [service.id, service]));
  const bookingSettings = normalizePublicBookingSettings(settings);
  const durationMin = serviceIds.reduce((sum, serviceId) => {
    const service = servicesById.get(serviceId);
    return sum + (service?.durationMin || settings?.defaultAppointmentDuration || 60);
  }, 0);
  const priceCents = serviceIds.reduce((sum, serviceId) => {
    const service = servicesById.get(serviceId);
    return sum + (service?.price ? Math.round(Number(service.price.toString()) * 100) : 0);
  }, 0);
  const slots = getAvailableSlotsFromWindows({
    date: params.date,
    durationMin,
    settings,
    appointments,
    exceptions,
    now: params.now,
  });

  return {
    success: true as const,
    slots,
    durationMin,
    bookingSettings,
    depositAmount: getDepositAmountCents({
      priceCents,
      bookingSettings,
    }),
    priceCents,
  };
}

export async function assertPublicSlotAvailable(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  serviceId?: string;
  serviceIds?: string[];
  scheduledAt: Date;
  endAt: Date;
  now?: Date;
}) {
  const now = params.now || new Date();
  const { start, end } = getDayBounds(params.scheduledAt);
  const serviceIds = normalizeAppointmentServiceIds({
    serviceId: params.serviceId,
    serviceIds: params.serviceIds,
  });

  if (serviceIds.length === 0) {
    return { success: false as const, error: "Cette prestation n'est plus disponible." };
  }

  const [settings, services, appointments, exceptions] = await Promise.all([
    params.tx.agendaSettings.findUnique({ where: { tenantId: params.tenantId } }),
    params.tx.service.findMany({
      where: { id: { in: serviceIds }, tenantId: params.tenantId, isActive: true, isPublic: true },
      select: { id: true },
    }),
    params.tx.appointment.findMany({
      where: {
        tenantId: params.tenantId,
        ...getBlockingAppointmentWhere(),
        scheduledAt: { lte: end },
        OR: [{ endAt: null }, { endAt: { gte: start } }],
      },
      select: {
        scheduledAt: true,
        endAt: true,
        expiresAt: true,
        status: true,
        Service: { select: { durationMin: true } },
        AppointmentService: {
          select: {
            serviceId: true,
            nameSnapshot: true,
            priceSnapshot: true,
            durationSnapshot: true,
            position: true,
          },
        },
      },
    }),
    params.tx.availabilityException.findMany({
      where: {
        tenantId: params.tenantId,
        startAt: { lte: end },
        endAt: { gte: start },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  if (services.length !== serviceIds.length) {
    return { success: false as const, error: "Cette prestation n'est plus disponible." };
  }

  const bookingSettings = normalizePublicBookingSettings(settings);
  const startMinutes = params.scheduledAt.getHours() * 60 + params.scheduledAt.getMinutes();
  const expectedTime = minutesToTime(startMinutes);
  const slots = getAvailableSlotsFromWindows({
    date: params.scheduledAt,
    durationMin: Math.round((params.endAt.getTime() - params.scheduledAt.getTime()) / 60000),
    settings,
    appointments,
    exceptions,
    now,
  });

  const available = slots.some((slot) => slot.time === expectedTime);
  return available
    ? { success: true as const, bookingSettings }
    : { success: false as const, error: "Ce creneau n'est plus disponible." };
}

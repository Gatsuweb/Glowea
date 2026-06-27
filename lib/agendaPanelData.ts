import prisma from "./prisma";
import type { AppointmentStatusValue } from "./appointmentStatus";
import { getAppointmentServicesSummary } from "./appointmentServices";

export type AgendaPanelData = {
  appointments: Array<{
    id: string;
    scheduledAt: string;
    endAt: string;
    status: AppointmentStatusValue;
    paymentStatus: string;
    price?: number | null;
    depositAmount?: number | null;
    depositPaidAmount?: number | null;
    paidAmount?: number | null;
    remainingAmount?: number | null;
    paymentMethod?: string | null;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    expiresAt?: string | null;
    notes?: string;
    clientId: string;
    serviceId: string;
    client: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
    };
    service: {
      id: string;
      name: string;
      durationMin: number;
      price: number | string;
      color?: string | null;
    };
    appointmentServices: Array<{
      serviceId: string;
      name: string;
      durationMin: number;
      price: number;
      position: number;
    }>;
  }>;
  clients: Array<{ id: string; name: string; riskLevel?: string; noShowCount?: number; riskReason?: string }>;
  services: Array<{ id: string; name: string; price: string; durationMin: number }>;
  bookingSettings: {
    days: Array<{ isOpen: boolean; start: string; end: string; breaks: Array<{ start: string; end: string }> }>;
    minBookingNoticeMin: number;
    slotIntervalMin: number;
    bufferMin: number;
    depositsEnabled: boolean;
    depositsRequired: boolean;
    depositAmount: number;
    depositType: "fixed" | "percent";
    pendingBookingTtlMin: number;
  };
  availabilityExceptions: Array<{
    id: string;
    type: "VACATION" | "ABSENCE" | "PERSONAL_APPOINTMENT" | "TRAINING" | "OTHER";
    title: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    notes: string;
  }>;
  paymentSettings: {
    stripeConnected: boolean;
    stripeOnboardingComplete: boolean;
    paymentsEnabled: boolean;
    defaultDepositAmount: number;
    defaultDepositType: "fixed" | "percent";
  };
  onlineBookingUnreadCount: number;
};

const defaultBookingDays = [
  { isOpen: false, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
];

function serializeValue<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (current && typeof current === "object" && current.constructor?.name === "Decimal") {
        return current.toString();
      }
      if (typeof current === "bigint") {
        return current.toString();
      }
      return current;
    })
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeBookingDays(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  return defaultBookingDays.map((fallback, index) => {
    const day = source[index];
    if (!isRecord(day)) return fallback;
    return {
      isOpen: typeof day.isOpen === "boolean" ? day.isOpen : fallback.isOpen,
      start: typeof day.start === "string" ? day.start : fallback.start,
      end: typeof day.end === "string" ? day.end : fallback.end,
      breaks: Array.isArray(day.breaks)
        ? day.breaks
            .filter(isRecord)
            .map((item) => ({
              start: typeof item.start === "string" ? item.start : "12:00",
              end: typeof item.end === "string" ? item.end : "13:00",
            }))
        : [],
    };
  });
}

function normalizeDepositType(value: unknown): "fixed" | "percent" {
  return value === "percent" ? "percent" : "fixed";
}

export async function getAgendaPanelData(tenantId: string, userId?: string | null): Promise<AgendaPanelData> {
  const [
    appointmentsData,
    clientsData,
    servicesData,
    agendaSettings,
    availabilityExceptionsData,
    paymentSettings,
    onlineBookingUnreadCount,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId },
      include: {
        Client: true,
        Service: true,
        AppointmentService: {
          include: { Service: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.client.findMany({
      where: { tenantId, archivedAt: null },
      include: {
        ClientFlag: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.agendaSettings.findUnique({
      where: { tenantId },
    }),
    prisma.availabilityException.findMany({
      where: { tenantId },
      orderBy: { startAt: "asc" },
      take: 500,
    }),
    userId
      ? prisma.user.findFirst({
          where: { clerkUserId: userId, tenantId },
          select: {
            stripeAccountId: true,
            stripeOnboardingComplete: true,
            paymentsEnabled: true,
            defaultDepositAmount: true,
            defaultDepositType: true,
          },
        })
      : null,
    prisma.notification.count({
      where: {
        tenantId,
        readAt: null,
        Appointment: {
          is: {
            source: "ONLINE_BOOKING",
          },
        },
      },
    }),
  ]);

  const appointments = appointmentsData.map((app) => {
    const serviceSummary = getAppointmentServicesSummary(app);
    const primaryService = app.AppointmentService[0]?.Service || app.Service;

    return {
      id: app.id,
      scheduledAt: app.scheduledAt.toISOString(),
      endAt: app.endAt
        ? app.endAt.toISOString()
        : new Date(app.scheduledAt.getTime() + serviceSummary.totalDurationMin * 60000).toISOString(),
      status: app.status,
      paymentStatus: app.paymentStatus,
      price: app.price,
      depositAmount: app.depositAmount,
      depositPaidAmount: app.depositPaidAmount,
      paidAmount: app.paidAmount,
      remainingAmount: app.remainingAmount,
      paymentMethod: app.paymentMethod,
      stripeCheckoutSessionId: app.stripeCheckoutSessionId,
      stripePaymentIntentId: app.stripePaymentIntentId,
      expiresAt: app.expiresAt ? app.expiresAt.toISOString() : null,
      notes: app.notes || "",
      clientId: app.clientId,
      serviceId: serviceSummary.primaryServiceId || app.serviceId || "",
      client: {
        id: app.Client?.id || "",
        name: `${app.Client?.firstName || ""} ${app.Client?.lastName || ""}`.trim(),
        email: app.Client?.email || "",
        phone: app.Client?.phone || "",
        riskLevel: app.Client?.riskLevel || "LOW",
        noShowCount: app.Client?.noShowCount || 0,
        riskReason: app.Client?.noShowCount
          ? `${app.Client.noShowCount} no-show${app.Client.noShowCount > 1 ? "s" : ""}`
          : "",
      },
      service: {
        id: serviceSummary.primaryServiceId || app.Service?.id || "",
        name: serviceSummary.label,
        durationMin: serviceSummary.totalDurationMin,
        price: serviceSummary.totalPriceCents / 100,
        color: primaryService?.color || "var(--tertiary)",
      },
      appointmentServices: serviceSummary.services.map((service) => ({
        serviceId: service.serviceId,
        name: service.nameSnapshot,
        durationMin: service.durationSnapshot,
        price: service.priceSnapshot / 100,
        position: service.position,
      })),
    };
  });

  return {
    appointments: serializeValue(appointments),
    clients: clientsData.map((client) => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName || ""}`.trim(),
      riskLevel: client.riskLevel,
      noShowCount: client.noShowCount,
      riskReason: client.noShowCount > 0
        ? `${client.noShowCount} no-show${client.noShowCount > 1 ? "s" : ""}`
        : client.ClientFlag[0]?.note || "",
    })),
    services: servicesData.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price ? service.price.toString() : "0",
      durationMin: service.durationMin || 60,
    })),
    bookingSettings: {
      days: normalizeBookingDays(agendaSettings?.openingHoursJson),
      minBookingNoticeMin: agendaSettings?.minBookingNoticeMin ?? 1440,
      slotIntervalMin: agendaSettings?.slotIntervalMin ?? 30,
      bufferMin: agendaSettings?.bufferMin ?? 0,
      depositsEnabled: Boolean(agendaSettings?.depositsEnabled),
      depositsRequired: Boolean(agendaSettings?.depositsRequired),
      depositAmount: agendaSettings?.depositAmount ?? 0,
      depositType: normalizeDepositType(agendaSettings?.depositType),
      pendingBookingTtlMin: agendaSettings?.pendingBookingTtlMin ?? 15,
    },
    availabilityExceptions: availabilityExceptionsData.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title || "",
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: item.allDay,
      notes: item.notes || "",
    })),
    paymentSettings: {
      stripeConnected: Boolean(paymentSettings?.stripeAccountId),
      stripeOnboardingComplete: Boolean(paymentSettings?.stripeOnboardingComplete),
      paymentsEnabled: Boolean(paymentSettings?.paymentsEnabled),
      defaultDepositAmount: Number(paymentSettings?.defaultDepositAmount || 0),
      defaultDepositType: normalizeDepositType(paymentSettings?.defaultDepositType),
    },
    onlineBookingUnreadCount,
  };
}

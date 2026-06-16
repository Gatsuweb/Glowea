import type { Prisma } from "@prisma/client";

import prisma from "./prisma";

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export type AppointmentServiceSnapshot = {
  serviceId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  durationSnapshot: number;
  position: number;
};

type ServiceLike = {
  id: string;
  name: string;
  price?: number | string | { toString(): string } | null;
  durationMin?: number | null;
  color?: string | null;
};

type AppointmentServiceLike = {
  serviceId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  durationSnapshot: number;
  position?: number | null;
  Service?: ServiceLike | null;
};

type AppointmentServiceSummaryInput = {
  price?: number | null;
  Service?: ServiceLike | null;
  AppointmentService?: AppointmentServiceLike[] | null;
};

function toCents(value: ServiceLike["price"]) {
  const amount = Number(value?.toString() || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

function normalizeDuration(value?: number | null) {
  const duration = Number(value || 0);
  if (!Number.isFinite(duration) || duration <= 0) return 60;
  return Math.max(15, Math.round(duration));
}

export function normalizeAppointmentServiceIds(input: {
  serviceId?: string | null;
  serviceIds?: string[] | null;
}) {
  const source = input.serviceIds && input.serviceIds.length > 0 ? input.serviceIds : input.serviceId ? [input.serviceId] : [];
  return Array.from(new Set(source.map((id) => id.trim()).filter(Boolean)));
}

export async function buildAppointmentServiceSelection(params: {
  tenantId: string;
  serviceId?: string | null;
  serviceIds?: string[] | null;
  tx?: PrismaClientLike;
}) {
  const serviceIds = normalizeAppointmentServiceIds({
    serviceId: params.serviceId,
    serviceIds: params.serviceIds,
  });

  if (serviceIds.length === 0) {
    return { error: "Une prestation est obligatoire" as const };
  }

  const client = params.tx || prisma;
  const services = await client.service.findMany({
    where: {
      id: { in: serviceIds },
      tenantId: params.tenantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      durationMin: true,
      color: true,
    },
  });

  if (services.length !== serviceIds.length) {
    return { error: "Une ou plusieurs prestations sont introuvables pour ce compte" as const };
  }

  const servicesById = new Map(services.map((service) => [service.id, service]));
  const snapshots = serviceIds.map((serviceId, position) => {
    const service = servicesById.get(serviceId);
    if (!service) {
      throw new Error("Service tenant validation mismatch");
    }

    return {
      serviceId: service.id,
      nameSnapshot: service.name,
      priceSnapshot: toCents(service.price),
      durationSnapshot: normalizeDuration(service.durationMin),
      position,
    };
  });

  return {
    snapshots,
    primaryServiceId: snapshots[0]?.serviceId || null,
    totalPriceCents: snapshots.reduce((sum, service) => sum + service.priceSnapshot, 0),
    totalDurationMin: snapshots.reduce((sum, service) => sum + service.durationSnapshot, 0),
    label: getAppointmentServicesLabel({ AppointmentService: snapshots }),
  };
}

export async function replaceAppointmentServices(
  tx: Prisma.TransactionClient,
  appointmentId: string,
  snapshots: AppointmentServiceSnapshot[]
) {
  await tx.appointmentService.deleteMany({
    where: { appointmentId },
  });

  if (snapshots.length === 0) return;

  await tx.appointmentService.createMany({
    data: snapshots.map((snapshot) => ({
      id: `aps_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      appointmentId,
      serviceId: snapshot.serviceId,
      nameSnapshot: snapshot.nameSnapshot,
      priceSnapshot: snapshot.priceSnapshot,
      durationSnapshot: snapshot.durationSnapshot,
      position: snapshot.position,
    })),
    skipDuplicates: true,
  });
}

export function getAppointmentServiceSnapshots(appointment: AppointmentServiceSummaryInput): AppointmentServiceSnapshot[] {
  const snapshots = (appointment.AppointmentService || [])
    .slice()
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map((item, index) => ({
      serviceId: item.serviceId,
      nameSnapshot: item.nameSnapshot || item.Service?.name || "Prestation",
      priceSnapshot: Number(item.priceSnapshot || 0),
      durationSnapshot: normalizeDuration(item.durationSnapshot),
      position: item.position ?? index,
    }));

  if (snapshots.length > 0) return snapshots;

  if (!appointment.Service?.id) return [];

  return [{
    serviceId: appointment.Service.id,
    nameSnapshot: appointment.Service.name || "Prestation",
    priceSnapshot: toCents(appointment.Service.price),
    durationSnapshot: normalizeDuration(appointment.Service.durationMin),
    position: 0,
  }];
}

export function getAppointmentServicesSummary(appointment: AppointmentServiceSummaryInput) {
  const snapshots = getAppointmentServiceSnapshots(appointment);
  const totalPriceCents = snapshots.reduce((sum, service) => sum + service.priceSnapshot, 0);
  const totalDurationMin = snapshots.reduce((sum, service) => sum + service.durationSnapshot, 0);

  return {
    services: snapshots,
    totalPriceCents,
    totalDurationMin: totalDurationMin || 60,
    label: getAppointmentServicesLabel({ AppointmentService: snapshots }),
    primaryServiceId: snapshots[0]?.serviceId || appointment.Service?.id || "",
  };
}

export function getAppointmentServicesLabel(appointment: AppointmentServiceSummaryInput) {
  const snapshots = getAppointmentServiceSnapshots(appointment);
  if (snapshots.length === 0) return appointment.Service?.name || "Prestation";
  return snapshots.map((service) => service.nameSnapshot || "Prestation").join(" + ");
}

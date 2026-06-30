"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getDepositAmountCents, assertPublicSlotAvailable } from "../../lib/bookingAvailability";
import {
  buildAppointmentServiceSelection,
  normalizeAppointmentServiceIds,
  replaceAppointmentServices,
} from "../../lib/appointmentServices";
import prisma from "../../lib/prisma";
import { sendPushToTenant } from "../../lib/push";
import { sendTransactionalEmail } from "../../lib/resend";
import { stripe } from "../../lib/stripe";
import { getStoragePathFromPublicUrl, getSupabaseAdminClient, publicStorageBucket } from "../../lib/supabaseAdmin";
import { getSubscriptionAccessFromTenant, getTenantSubscriptionAccess } from "../../lib/subscription";
import { getExistingTenantId, getTenantId } from "../../lib/tenant";

export type PublicProfileInput = {
  isPublished: boolean;
  slug: string;
  businessName: string;
  ownerName: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  instagramUrl: string;
  websiteUrl: string;
  openingHours: string;
  coverImageUrl: string;
  avatarUrl: string;
};

export type PublicServiceInput = {
  id?: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  category: string;
  imageUrl: string;
  isPublic: boolean;
};

export type GalleryImageInput = {
  imageUrl: string;
  alt: string;
  sortOrder: number;
  isPublic: boolean;
};

export type ReviewInput = {
  id?: string;
  authorName: string;
  rating: number;
  comment: string;
  isVisible: boolean;
};

export type DayScheduleInput = {
  isOpen: boolean;
  start: string;
  end: string;
  breaks: Array<{
    start: string;
    end: string;
  }>;
};

export type BookingSettingsInput = {
  days: DayScheduleInput[];
  minBookingNoticeMin: number;
  slotIntervalMin: number;
  bufferMin: number;
  depositsEnabled: boolean;
  depositsRequired: boolean;
  depositAmount: number;
  depositType: "fixed" | "percent";
  pendingBookingTtlMin: number;
};

export type AvailabilityExceptionInput = {
  id?: string;
  type: "VACATION" | "ABSENCE" | "PERSONAL_APPOINTMENT" | "TRAINING" | "OTHER";
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  notes: string;
};

export type PublicBookingInput = {
  slug: string;
  serviceId?: string;
  serviceIds?: string[];
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  instagram?: string;
  message?: string;
};

function safeString(value: unknown, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function safeUrl(value: unknown) {
  const raw = safeString(value, 800);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  return `https://${raw}`;
}

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || `pro-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function getPublicBusinessName(profile: {
  businessName?: string | null;
  Tenant?: { name?: string | null } | null;
}) {
  return profile.businessName?.trim() || profile.Tenant?.name?.trim() || "votre prestataire";
}

function getInstagramContact(instagramUrl: string | null | undefined) {
  const raw = instagramUrl?.trim();
  if (!raw) return "";

  if (raw.startsWith("@")) return raw;

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const handle = url.pathname.split("/").filter(Boolean)[0];
    return handle ? `@${handle}` : raw;
  } catch {
    return raw;
  }
}

function getPublicBookingChangeSection(profile: {
  businessName?: string | null;
  phone?: string | null;
  email?: string | null;
  instagramUrl?: string | null;
  Tenant?: { name?: string | null } | null;
}) {
  const businessName = getPublicBusinessName(profile);
  const instagramContact = getInstagramContact(profile.instagramUrl);
  const contactLines = [
    profile.phone?.trim() ? `Telephone : ${profile.phone.trim()}` : "",
    profile.email?.trim() ? `Email : ${profile.email.trim()}` : "",
    instagramContact ? `Instagram : ${instagramContact}` : "",
  ].filter(Boolean);

  return [
    "Besoin d'annuler ou de déplacer votre rendez-vous ?",
    `Merci de contacter directement ${businessName}.`,
    contactLines.length ? ["", ...contactLines].join("\n") : "",
  ].filter(Boolean).join("\n");
}

function getPublicBookingConfirmationBody(params: {
  firstName: string;
  businessName: string;
  serviceLabel: string;
  dateLabel: string;
  timeLabel: string;
  requiresDeposit: boolean;
  changeSection: string;
}) {
  const statusText = params.requiresDeposit
    ? "Votre demande de réservation est en attente du paiement des arrhes."
    : "Votre rendez-vous est bien confirmé. ✨";

  return [
    `Bonjour ${params.firstName},`,
    "",
    statusText,
    "",
    `Prestation : ${params.serviceLabel}`,
    `Date : ${params.dateLabel} a ${params.timeLabel}`,
    "",
    params.changeSection,
    "",
    "A bientot,",
    params.businessName,
  ].join("\n");
}

function toMoney(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

function toDuration(value: unknown) {
  const duration = Number(value || 60);
  if (!Number.isFinite(duration)) return 60;
  return Math.min(480, Math.max(15, Math.round(duration)));
}

function toInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function isValidTime(value: unknown) {
  if (typeof value !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
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

const defaultBookingDays: DayScheduleInput[] = [
  { isOpen: false, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
];

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeDaySchedule(day: Partial<DayScheduleInput> | undefined, fallback: DayScheduleInput): DayScheduleInput {
  const start = isValidTime(day?.start) ? day?.start || fallback.start : fallback.start;
  const end = isValidTime(day?.end) ? day?.end || fallback.end : fallback.end;
  const safeEnd = timeToMinutes(end) > timeToMinutes(start) ? end : fallback.end;
  const breaks = Array.isArray(day?.breaks)
    ? day.breaks
        .map((item) => ({
          start: isValidTime(item?.start) ? item.start : "",
          end: isValidTime(item?.end) ? item.end : "",
        }))
        .filter((item) => item.start && item.end && timeToMinutes(item.end) > timeToMinutes(item.start))
        .slice(0, 6)
    : [];

  return {
    isOpen: Boolean(day?.isOpen),
    start,
    end: safeEnd,
    breaks,
  };
}

function normalizeBookingDays(value: unknown): DayScheduleInput[] {
  const source = Array.isArray(value) ? value : [];
  return defaultBookingDays.map((fallback, index) => normalizeDaySchedule(source[index] as Partial<DayScheduleInput> | undefined, fallback));
}

function agendaSettingsToDto(settings: {
  openingHoursJson: unknown;
  minBookingNoticeMin: number;
  slotIntervalMin: number;
  bufferMin: number | null;
  depositsEnabled: boolean;
  depositsRequired: boolean;
  depositAmount: number;
  depositType: "fixed" | "percent";
  pendingBookingTtlMin: number;
} | null) {
  return {
    days: normalizeBookingDays(settings?.openingHoursJson),
    minBookingNoticeMin: settings?.minBookingNoticeMin ?? 1440,
    slotIntervalMin: settings?.slotIntervalMin ?? 30,
    bufferMin: settings?.bufferMin ?? 0,
    depositsEnabled: Boolean(settings?.depositsEnabled),
    depositsRequired: Boolean(settings?.depositsRequired),
    depositAmount: settings?.depositAmount ?? 0,
    depositType: settings?.depositType === "percent" ? "percent" as const : "fixed" as const,
    pendingBookingTtlMin: settings?.pendingBookingTtlMin ?? 15,
  };
}

function normalizeExceptionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function removeStoredPublicFile(url: string | null | undefined) {
  if (!url) return;
  const storagePath = getStoragePathFromPublicUrl(url);
  if (!storagePath) return;
  const supabase = getSupabaseAdminClient();
  await supabase.storage.from(publicStorageBucket).remove([storagePath]).catch(() => undefined);
}

function serviceToDto(service: {
  id: string;
  name: string;
  description: string | null;
  durationMin: number | null;
  price: { toString: () => string } | null;
  category: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  isActive: boolean;
}) {
  return {
    id: service.id,
    name: service.name,
    description: service.description || "",
    durationMin: service.durationMin || 60,
    price: service.price ? Number(service.price.toString()) : 0,
    category: service.category || "",
    imageUrl: service.imageUrl || "",
    isPublic: service.isPublic,
    isActive: service.isActive,
  };
}

async function getUniqueSlug(base: string, tenantId: string) {
  let candidate = slugify(base);
  let suffix = 2;

  while (true) {
    const existing = await prisma.publicProfile.findUnique({
      where: { slug: candidate },
      select: { tenantId: true },
    });

    if (!existing || existing.tenantId === tenantId) return candidate;
    candidate = `${slugify(base)}-${suffix}`;
    suffix += 1;
  }
}

async function ensurePublicProfile(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      BusinessSettings: true,
      BillingProfile: true,
      User: { where: { role: "OWNER" }, take: 1 },
      PublicProfile: true,
      Subscription: {
        select: {
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  if (!tenant) throw new Error("Tenant not found");

  if (tenant.PublicProfile) return { tenant, profile: tenant.PublicProfile };

  const owner = tenant.User[0];
  const businessName = tenant.BusinessSettings?.displayName || tenant.name;
  const slug = await getUniqueSlug(businessName, tenantId);

  if (!getSubscriptionAccessFromTenant(tenant).canUsePublicPage) {
    return {
      tenant,
      profile: {
        id: "",
        tenantId,
        slug,
        isPublished: false,
        businessName,
        ownerName: owner?.fullName || null,
        description: "Un espace beaute pense pour des prestations soignees et un suivi client professionnel.",
        address: tenant.BillingProfile?.addressLine1 || null,
        city: tenant.BillingProfile?.city || null,
        phone: owner?.phone || null,
        email: owner?.email || null,
        instagramUrl: null,
        websiteUrl: null,
        openingHours: "Lun - Sam, sur rendez-vous",
        coverImageUrl: null,
        avatarUrl: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    };
  }

  const profile = await prisma.publicProfile.create({
    data: {
      id: `pub_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId,
      slug,
      isPublished: false,
      businessName,
      ownerName: owner?.fullName || null,
      description: "Un espace beauté pensé pour des prestations soignées et un suivi client professionnel.",
      address: tenant.BillingProfile?.addressLine1 || null,
      city: tenant.BillingProfile?.city || null,
      phone: owner?.phone || null,
      email: owner?.email || null,
      openingHours: "Lun - Sam, sur rendez-vous",
      updatedAt: new Date(),
    },
  });

  return { tenant, profile };
}

export async function getPublicPageConfig() {
  const tenantId = await getTenantId();
  const { tenant, profile } = await ensurePublicProfile(tenantId);
  const access = getSubscriptionAccessFromTenant(tenant);
  const [services, gallery, reviews, agendaSettings, availabilityExceptions] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.galleryImage.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.review.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agendaSettings.findUnique({
      where: { tenantId },
    }),
    prisma.availabilityException.findMany({
      where: { tenantId },
      orderBy: { startAt: "asc" },
      take: 100,
    }),
  ]);

  return {
    success: true as const,
    isPro: access.canUsePublicPage,
    access,
    publicPath: `/pro/${profile.slug}`,
    profile: {
      id: profile.id,
      tenantId: profile.tenantId,
      slug: profile.slug,
      isPublished: profile.isPublished,
      businessName: profile.businessName || "",
      ownerName: profile.ownerName || "",
      description: profile.description || "",
      address: profile.address || "",
      city: profile.city || "",
      phone: profile.phone || "",
      email: profile.email || "",
      instagramUrl: profile.instagramUrl || "",
      websiteUrl: profile.websiteUrl || "",
      openingHours: profile.openingHours || "",
      coverImageUrl: profile.coverImageUrl || "",
      avatarUrl: profile.avatarUrl || "",
    },
    services: services.map(serviceToDto),
    gallery: gallery.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      alt: image.alt || "",
      sortOrder: image.sortOrder,
      isPublic: image.isPublic,
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
      isVisible: review.isVisible,
      createdAt: review.createdAt.toISOString(),
    })),
    bookingSettings: agendaSettingsToDto(agendaSettings),
    availabilityExceptions: availabilityExceptions.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title || "",
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: item.allDay,
      notes: item.notes || "",
    })),
  };
}

export async function updatePublicProfile(input: PublicProfileInput) {
  let tenantId: string;

  try {
    tenantId = await getExistingTenantId("updatePublicProfile");
  } catch (error) {
    console.error("[public-profile:update] tenant not found without creation", error);
    return {
      success: false as const,
      error: "Espace introuvable. Reconnectez-vous puis réessayez.",
    };
  }

  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const existing = await prisma.publicProfile.findUnique({ where: { tenantId } });
  const nextSlug = await getUniqueSlug(input.slug || input.businessName || "pro", tenantId);

  const profile = await prisma.publicProfile.upsert({
    where: { tenantId },
    create: {
      id: `pub_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId,
      slug: nextSlug,
      isPublished: Boolean(input.isPublished),
      businessName: safeString(input.businessName, 120) || tenant?.name || null,
      ownerName: safeString(input.ownerName, 120) || null,
      description: safeString(input.description, 900) || null,
      address: safeString(input.address, 240) || null,
      city: safeString(input.city, 120) || null,
      phone: safeString(input.phone, 60) || null,
      email: safeString(input.email, 180) || null,
      instagramUrl: safeUrl(input.instagramUrl) || null,
      websiteUrl: safeUrl(input.websiteUrl) || null,
      openingHours: safeString(input.openingHours, 500) || null,
      coverImageUrl: safeUrl(input.coverImageUrl) || null,
      avatarUrl: safeUrl(input.avatarUrl) || null,
      updatedAt: new Date(),
    },
    update: {
      slug: nextSlug,
      isPublished: Boolean(input.isPublished),
      businessName: safeString(input.businessName, 120) || null,
      ownerName: safeString(input.ownerName, 120) || null,
      description: safeString(input.description, 900) || null,
      address: safeString(input.address, 240) || null,
      city: safeString(input.city, 120) || null,
      phone: safeString(input.phone, 60) || null,
      email: safeString(input.email, 180) || null,
      instagramUrl: safeUrl(input.instagramUrl) || null,
      websiteUrl: safeUrl(input.websiteUrl) || null,
      openingHours: safeString(input.openingHours, 500) || null,
      coverImageUrl: safeUrl(input.coverImageUrl) || null,
      avatarUrl: safeUrl(input.avatarUrl) || null,
      updatedAt: new Date(),
    },
  });

  if (existing?.coverImageUrl && existing.coverImageUrl !== profile.coverImageUrl) {
    await removeStoredPublicFile(existing.coverImageUrl);
  }

  if (existing?.avatarUrl && existing.avatarUrl !== profile.avatarUrl) {
    await removeStoredPublicFile(existing.avatarUrl);
  }

  if (existing?.slug && existing.slug !== profile.slug) revalidatePath(`/pro/${existing.slug}`);
  revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return { success: true as const, profile };
}

export async function saveBookingSettings(input: BookingSettingsInput) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  const days = normalizeBookingDays(input.days);
  const slotIntervalMin = toInt(input.slotIntervalMin, 30, 5, 240);
  const bufferMin = toInt(input.bufferMin, 0, 0, 240);
  const minBookingNoticeMin = toInt(input.minBookingNoticeMin, 1440, 0, 525600);
  const pendingBookingTtlMin = toInt(input.pendingBookingTtlMin, 15, 1, 120);
  const depositType = input.depositType === "percent" ? "percent" : "fixed";
  const maxDeposit = depositType === "percent" ? 100 : 100000000;
  const depositAmount = toInt(input.depositAmount, 0, 0, maxDeposit);

  const settings = await prisma.agendaSettings.upsert({
    where: { tenantId },
    create: {
      id: `ags_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId,
      openingHoursJson: days,
      workingDaysJson: days.map((day) => day.isOpen),
      bufferMin,
      minBookingNoticeMin,
      slotIntervalMin,
      depositsEnabled: Boolean(input.depositsEnabled),
      depositsRequired: Boolean(input.depositsEnabled && input.depositsRequired),
      depositAmount,
      depositType,
      pendingBookingTtlMin,
      updatedAt: new Date(),
    },
    update: {
      openingHoursJson: days,
      workingDaysJson: days.map((day) => day.isOpen),
      bufferMin,
      minBookingNoticeMin,
      slotIntervalMin,
      depositsEnabled: Boolean(input.depositsEnabled),
      depositsRequired: Boolean(input.depositsEnabled && input.depositsRequired),
      depositAmount,
      depositType,
      pendingBookingTtlMin,
      updatedAt: new Date(),
    },
  });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return { success: true as const, bookingSettings: agendaSettingsToDto(settings) };
}

export async function saveAvailabilityException(input: AvailabilityExceptionInput) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  const startAt = normalizeExceptionDate(input.startAt);
  const endAt = normalizeExceptionDate(input.endAt);
  if (!startAt || !endAt || endAt <= startAt) {
    return { success: false as const, error: "La periode d'indisponibilite est invalide." };
  }

  const type = ["VACATION", "ABSENCE", "PERSONAL_APPOINTMENT", "TRAINING", "OTHER"].includes(input.type)
    ? input.type
    : "OTHER";
  const data = {
    type,
    title: safeString(input.title, 160) || null,
    startAt,
    endAt,
    allDay: Boolean(input.allDay),
    notes: safeString(input.notes, 500) || null,
    updatedAt: new Date(),
  };

  const availabilityException = input.id
    ? await prisma.availabilityException.update({
        where: { id: input.id, tenantId },
        data,
      })
    : await prisma.availabilityException.create({
        data: {
          id: `avx_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          ...data,
        },
      });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return {
    success: true as const,
    exception: {
      id: availabilityException.id,
      type: availabilityException.type,
      title: availabilityException.title || "",
      startAt: availabilityException.startAt.toISOString(),
      endAt: availabilityException.endAt.toISOString(),
      allDay: availabilityException.allDay,
      notes: availabilityException.notes || "",
    },
  };
}

export async function deleteAvailabilityException(id: string) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  await prisma.availabilityException.delete({
    where: { id, tenantId },
  });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return { success: true as const };
}

export async function savePublicService(input: PublicServiceInput) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  const name = safeString(input.name, 140);
  if (!name) return { success: false as const, error: "Le nom de la prestation est obligatoire." };

  const existingService = input.id
    ? await prisma.service.findFirst({
        where: { id: input.id, tenantId },
        select: { imageUrl: true },
      })
    : null;

  const data = {
    name,
    description: safeString(input.description, 600) || null,
    durationMin: toDuration(input.durationMin),
    price: toMoney(input.price),
    category: safeString(input.category, 120) || null,
    imageUrl: safeUrl(input.imageUrl) || null,
    isPublic: Boolean(input.isPublic),
    updatedAt: new Date(),
  };

  const service = input.id
    ? await prisma.service.update({
        where: { id: input.id, tenantId },
        data,
      })
    : await prisma.service.create({
        data: {
          id: `srv_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          ...data,
        },
      });

  if (existingService?.imageUrl && existingService.imageUrl !== service.imageUrl) {
    await removeStoredPublicFile(existingService.imageUrl);
  }

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");
  revalidatePath("/dashboard/profil");

  return { success: true as const, service: serviceToDto(service) };
}

export async function deletePublicService(id: string) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  if (!id) {
    return { success: false as const, error: "Prestation introuvable." };
  }

  const existingService = await prisma.service.findFirst({
    where: { id, tenantId },
    select: { imageUrl: true },
  });

  await prisma.service.update({
    where: { id, tenantId },
    data: {
      isActive: false,
      isPublic: false,
      updatedAt: new Date(),
    },
  });

  await removeStoredPublicFile(existingService?.imageUrl);

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");
  revalidatePath("/dashboard/profil");

  return { success: true as const };
}

export async function addGalleryImage(input: GalleryImageInput) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  const imageUrl = safeUrl(input.imageUrl);
  if (!imageUrl) return { success: false as const, error: "L'URL de l'image est obligatoire." };

  const image = await prisma.galleryImage.create({
    data: {
      id: `gal_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId,
      imageUrl,
      alt: safeString(input.alt, 180) || null,
      sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
      isPublic: Boolean(input.isPublic),
    },
  });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return { success: true as const, image };
}

export async function deleteGalleryImage(id: string) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  await prisma.galleryImage.delete({ where: { id, tenantId } });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return { success: true as const };
}

export async function saveReview(input: ReviewInput) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  const authorName = safeString(input.authorName, 120);
  const comment = safeString(input.comment, 1000);
  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating || 5))));

  if (!authorName || !comment) {
    return { success: false as const, error: "Le nom et le commentaire sont obligatoires." };
  }

  const review = input.id
    ? await prisma.review.update({
        where: { id: input.id, tenantId },
        data: {
          authorName,
          rating,
          comment,
          isVisible: Boolean(input.isVisible),
        },
      })
    : await prisma.review.create({
        data: {
          id: `rev_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId,
          authorName,
          rating,
          comment,
          isVisible: Boolean(input.isVisible),
        },
      });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return {
    success: true as const,
    review: {
      id: review.id,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
      isVisible: review.isVisible,
      createdAt: review.createdAt.toISOString(),
    },
  };
}

export async function deleteReview(id: string) {
  const tenantId = await getTenantId();
  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

  await prisma.review.delete({ where: { id, tenantId } });

  const profile = await prisma.publicProfile.findUnique({ where: { tenantId }, select: { slug: true } });
  if (profile) revalidatePath(`/pro/${profile.slug}`);
  revalidatePath("/dashboard/page-publique");

  return { success: true as const };
}

export async function createPublicBooking(input: PublicBookingInput) {
  const slug = slugify(input.slug);
  const firstName = safeString(input.firstName, 80);
  const lastName = safeString(input.lastName, 80);
  const phone = safeString(input.phone, 60);
  const email = safeString(input.email, 180).toLowerCase();
  const instagram = safeString(input.instagram, 80);
  const message = safeString(input.message, 1000);

  if (!firstName || !phone) {
    return { success: false as const, error: "Le prénom et le téléphone sont obligatoires." };
  }

  const scheduledAt = new Date(`${safeString(input.date, 10)}T${safeString(input.time, 5)}:00`);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
    return { success: false as const, error: "Choisissez un créneau à venir." };
  }

  const profile = await prisma.publicProfile.findUnique({
    where: { slug },
    include: {
      Tenant: {
        include: {
          Subscription: {
            select: {
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      },
    },
  });

  if (!profile || !profile.isPublished || !getSubscriptionAccessFromTenant(profile.Tenant).canUseBooking) {
    return { success: false as const, error: "Cette page de réservation n'est pas disponible." };
  }

  const serviceIds = normalizeAppointmentServiceIds({
    serviceId: input.serviceId,
    serviceIds: input.serviceIds,
  });

  if (serviceIds.length === 0) {
    return { success: false as const, error: "Cette prestation n'est plus disponible." };
  }

  const publicServicesCount = await prisma.service.count({
    where: {
      id: { in: serviceIds },
      tenantId: profile.tenantId,
      isActive: true,
      isPublic: true,
    },
  });

  if (publicServicesCount !== serviceIds.length) {
    return { success: false as const, error: "Cette prestation n'est plus disponible." };
  }

  const serviceSelection = await buildAppointmentServiceSelection({
    tenantId: profile.tenantId,
    serviceIds,
  });

  if ("error" in serviceSelection) {
    return { success: false as const, error: serviceSelection.error };
  }

  const endAt = new Date(scheduledAt.getTime() + serviceSelection.totalDurationMin * 60000);
  const clientFullName = `${firstName} ${lastName}`.trim() || firstName;
  const timeLabel = scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = scheduledAt.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
  const priceCents = serviceSelection.totalPriceCents;
  const serviceLabel = serviceSelection.label;
  const businessName = getPublicBusinessName(profile);

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const availability = await assertPublicSlotAvailable({
        tx,
        tenantId: profile.tenantId,
        serviceIds,
        scheduledAt,
        endAt,
      });

      if (!availability.success) {
        throw new Error(availability.error);
      }

      const depositAmount = getDepositAmountCents({
        priceCents,
        bookingSettings: availability.bookingSettings,
      });
      const requiresDeposit = availability.bookingSettings.depositsRequired && depositAmount > 0;
      const expiresAt = requiresDeposit
        ? new Date(Date.now() + availability.bookingSettings.pendingBookingTtlMin * 60000)
        : null;

      const existingClient = await tx.client.findFirst({
        where: {
          tenantId: profile.tenantId,
          archivedAt: null,
          OR: [
            email ? { email } : undefined,
            phone ? { phone } : undefined,
          ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
        },
        select: {
          id: true,
          riskLevel: true,
          noShowCount: true,
          ClientFlag: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              type: true,
              note: true,
            },
          },
        },
      });

      const client = existingClient
        ? await tx.client.update({
            where: { id: existingClient.id },
            data: {
              firstName,
              lastName: lastName || null,
              fullName: `${firstName} ${lastName}`.trim(),
              email: email || null,
              phone,
              instagram: instagram || null,
              updatedAt: new Date(),
            },
          })
        : await tx.client.create({
            data: {
              id: `cli_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
              tenantId: profile.tenantId,
              firstName,
              lastName: lastName || null,
              fullName: `${firstName} ${lastName}`.trim(),
              email: email || null,
              phone,
              instagram: instagram || null,
              updatedAt: new Date(),
            },
          });

      const appointment = await tx.appointment.create({
        data: {
          id: `app_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId: profile.tenantId,
          clientId: client.id,
          serviceId: serviceSelection.primaryServiceId,
          scheduledAt,
          endAt,
          source: "ONLINE_BOOKING",
          status: requiresDeposit ? "PENDING_PAYMENT" : "CONFIRMED",
          paymentStatus: requiresDeposit ? "deposit_pending" : "none",
          price: priceCents,
          depositAmount,
          depositPaidAmount: 0,
          paidAmount: 0,
          remainingAmount: priceCents,
          expiresAt,
          notes: message ? `Réservation en ligne - ${message}` : "Réservation en ligne",
          updatedAt: new Date(),
        },
      });

      await replaceAppointmentServices(tx, appointment.id, serviceSelection.snapshots);

      const clientRiskReason = existingClient?.noShowCount
        ? `${existingClient.noShowCount} no-show${existingClient.noShowCount > 1 ? "s" : ""}`
        : existingClient?.ClientFlag[0]?.note || existingClient?.ClientFlag[0]?.type || "";
      const clientRiskWarning =
        existingClient && (existingClient.riskLevel !== "LOW" || existingClient.noShowCount > 0)
          ? ` Attention : cette cliente a deja ete signalee${clientRiskReason ? `. Motif : ${clientRiskReason}` : ""}.`
          : "";

      await tx.notification.create({
        data: {
          id: `not_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId: profile.tenantId,
          clientId: client.id,
          appointmentId: appointment.id,
          type: "OTHER",
          title: "Nouveau rendez-vous via la page publique",
          body: `${clientFullName} a réservé ${serviceLabel} le ${dateLabel} à ${timeLabel}.${clientRiskWarning}`,
        },
      });

      return { appointment, client, bookingSettings: availability.bookingSettings, depositAmount, requiresDeposit };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

  let checkoutUrl: string | null = null;

  if (reservation.requiresDeposit) {
    const paymentUser = await prisma.user.findFirst({
      where: {
        tenantId: profile.tenantId,
        stripeAccountId: { not: null },
        paymentsEnabled: true,
      },
      select: {
        id: true,
        stripeAccountId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!paymentUser?.stripeAccountId) {
      await prisma.appointment.update({
        where: { id: reservation.appointment.id },
        data: {
          status: "EXPIRED",
          paymentStatus: "none",
          expiresAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return { success: false as const, error: "Le paiement en ligne n'est pas encore configuré pour cette page." };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";
    const origin = appUrl.startsWith("http") ? appUrl : appUrl ? `https://${appUrl}` : "";
    if (!origin) {
      return { success: false as const, error: "Configuration de paiement incomplète." };
    }

    const applicationFeeAmount = getApplicationFeeAmount(reservation.depositAmount);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: reservation.depositAmount,
            product_data: {
              name: `Arrhes - ${serviceLabel}`,
              description: `${clientFullName} - ${dateLabel} à ${timeLabel}`,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          appointmentId: reservation.appointment.id,
          tenantId: profile.tenantId,
          userId: paymentUser.id,
          paymentType: "deposit",
        },
        transfer_data: {
          destination: paymentUser.stripeAccountId,
        },
        ...(applicationFeeAmount ? { application_fee_amount: applicationFeeAmount } : {}),
      },
      metadata: {
        appointmentId: reservation.appointment.id,
        tenantId: profile.tenantId,
        userId: paymentUser.id,
        paymentType: "deposit",
      },
      success_url: `${origin}/pro/${profile.slug}?booking=success&appointmentId=${reservation.appointment.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pro/${profile.slug}?booking=cancel&appointmentId=${reservation.appointment.id}`,
    });

    await prisma.appointment.update({
      where: { id: reservation.appointment.id },
      data: {
        stripeCheckoutSessionId: checkoutSession.id,
        updatedAt: new Date(),
      },
    });

    checkoutUrl = checkoutSession.url;
  }

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  revalidatePath(`/pro/${profile.slug}`);

  try {
    await sendPushToTenant(profile.tenantId, {
      title: "Nouvelle réservation",
      body: "Une cliente vient de réserver un rendez-vous.",
      url: "/dashboard/agenda",
      tag: `booking-${reservation.appointment.id}`,
      data: { appointmentId: reservation.appointment.id },
    }, { preferenceKey: "onlineBookingEnabled" });
  } catch (pushError) {
    console.error("[push] public booking notification failed:", pushError);
  }

  if (email) {
    try {
      const subject = `Confirmation de votre rendez-vous chez ${businessName}`;
      const body = getPublicBookingConfirmationBody({
        firstName,
        businessName,
        serviceLabel,
        dateLabel,
        timeLabel,
        requiresDeposit: reservation.requiresDeposit,
        changeSection: getPublicBookingChangeSection(profile),
      });
      const messageLog = await prisma.messageLog.create({
        data: {
          id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId: profile.tenantId,
          clientId: reservation.client.id,
          channel: "EMAIL",
          subject,
          body,
          updatedAt: new Date(),
        },
      });

      const emailResult = await sendTransactionalEmail({
        to: email,
        subject,
        text: body,
        replyTo: profile.email,
      });

      await prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: emailResult.success ? "SENT" : "FAILED",
          sentAt: emailResult.success ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      if (!emailResult.success) {
        console.error("[email] public booking confirmation failed:", emailResult.error);
      }
    } catch (emailError) {
      console.error("[email] public booking confirmation failed:", emailError);
    }
  }

  return {
    success: true as const,
    appointmentId: reservation.appointment.id,
    serviceName: serviceLabel,
    scheduledAt: reservation.appointment.scheduledAt.toISOString(),
    requiresPayment: reservation.requiresDeposit,
    checkoutUrl,
  };
  } catch (error) {
    console.error("Error creating public booking:", error);
    const message = error instanceof Error && error.message ? error.message : "Ce créneau vient d'être réservé. Choisissez un autre horaire.";
    return { success: false as const, error: message };
  }
}

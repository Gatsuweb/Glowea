"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getStoragePathFromPublicUrl, getSupabaseAdminClient, publicStorageBucket } from "../../lib/supabaseAdmin";
import { getSubscriptionAccessFromTenant, getTenantSubscriptionAccess } from "../../lib/subscription";
import { getTenantId } from "../../lib/tenant";

const ACTIVE_BOOKING_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] as const;

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

export type PublicBookingInput = {
  slug: string;
  serviceId: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
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
    },
  });

  if (!tenant) throw new Error("Tenant not found");

  if (tenant.PublicProfile) return { tenant, profile: tenant.PublicProfile };

  const owner = tenant.User[0];
  const businessName = tenant.BusinessSettings?.displayName || tenant.name;
  const slug = await getUniqueSlug(businessName, tenantId);

  const profile = await prisma.publicProfile.create({
    data: {
      id: `pub_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
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
  const [services, gallery, reviews] = await Promise.all([
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
  };
}

export async function updatePublicProfile(input: PublicProfileInput) {
  const tenantId = await getTenantId();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  if (!getSubscriptionAccessFromTenant(tenant).canUsePublicPage) {
    return { success: false as const, error: "La page publique est disponible avec Glowea Pro." };
  }

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
  const message = safeString(input.message, 1000);

  if (!firstName || !phone) {
    return { success: false as const, error: "Le prenom et le telephone sont obligatoires." };
  }

  const scheduledAt = new Date(`${safeString(input.date, 10)}T${safeString(input.time, 5)}:00`);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
    return { success: false as const, error: "Choisissez un creneau a venir." };
  }

  const profile = await prisma.publicProfile.findUnique({
    where: { slug },
    include: { Tenant: true },
  });

  if (!profile || !profile.isPublished || !getSubscriptionAccessFromTenant(profile.Tenant).canUseBooking) {
    return { success: false as const, error: "Cette page de reservation n'est pas disponible." };
  }

  const service = await prisma.service.findFirst({
    where: {
      id: input.serviceId,
      tenantId: profile.tenantId,
      isActive: true,
      isPublic: true,
    },
    select: { id: true, durationMin: true, name: true },
  });

  if (!service) {
    return { success: false as const, error: "Cette prestation n'est plus disponible." };
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: profile.tenantId,
      scheduledAt,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: { id: true },
  });

  if (conflict) {
    return { success: false as const, error: "Ce creneau vient d'etre reserve. Choisissez un autre horaire." };
  }

  const endAt = new Date(scheduledAt.getTime() + (service.durationMin || 60) * 60000);
  const clientFullName = `${firstName} ${lastName}`.trim() || firstName;
  const timeLabel = scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = scheduledAt.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });

  const appointment = await prisma.$transaction(async (tx) => {
    const existingClient = await tx.client.findFirst({
      where: {
        tenantId: profile.tenantId,
        archivedAt: null,
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
      },
      select: { id: true },
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
            updatedAt: new Date(),
          },
        });

    const appointment = await tx.appointment.create({
      data: {
        id: `app_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId: profile.tenantId,
        clientId: client.id,
        serviceId: service.id,
        scheduledAt,
        endAt,
        source: "ONLINE_BOOKING",
        status: "SCHEDULED",
        paymentStatus: "none",
        notes: message ? `Reservation en ligne - ${message}` : "Reservation en ligne",
        updatedAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        id: `not_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId: profile.tenantId,
        clientId: client.id,
        appointmentId: appointment.id,
        type: "OTHER",
        title: "Nouveau rendez-vous via la page publique",
        body: `${clientFullName} a reserve ${service.name} le ${dateLabel} a ${timeLabel}.`,
      },
    });

    return appointment;
  });

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  revalidatePath(`/pro/${profile.slug}`);

  return {
    success: true as const,
    appointmentId: appointment.id,
    serviceName: service.name,
    scheduledAt: appointment.scheduledAt.toISOString(),
  };
}

import { cache } from "react";
import prisma from "./prisma";
import { getSubscriptionAccessFromTenant } from "./subscription";

export type DirectoryService = {
  id: string;
  name: string;
  category: string | null;
  durationMin: number | null;
  price: number | null;
};

export type DirectoryProfile = {
  slug: string;
  businessName: string;
  city: string | null;
  citySlug: string | null;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  avatarUrl: string | null;
  services: DirectoryService[];
  reviewCount: number;
  averageRating: number | null;
  updatedAt: Date;
};

export type DirectoryCity = {
  name: string;
  slug: string;
  profileCount: number;
  updatedAt: Date;
};

async function readDirectoryProfiles() {
  return prisma.publicProfile.findMany({
    where: {
      isPublished: true,
    },
    select: {
      slug: true,
      businessName: true,
      description: true,
      city: true,
      coverImageUrl: true,
      avatarUrl: true,
      updatedAt: true,
      Tenant: {
        select: {
          name: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          Subscription: {
            select: {
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
          Service: {
            where: {
              isActive: true,
              isPublic: true,
            },
            select: {
              id: true,
              name: true,
              category: true,
              durationMin: true,
              price: true,
            },
            orderBy: [{ category: "asc" }, { name: "asc" }],
          },
          Review: {
            where: {
              isVisible: true,
            },
            select: {
              rating: true,
            },
          },
          GalleryImage: {
            where: {
              isPublic: true,
            },
            select: {
              imageUrl: true,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
            take: 1,
          },
        },
      },
    },
    orderBy: [{ city: "asc" }, { businessName: "asc" }, { updatedAt: "desc" }],
  });
}

type RawDirectoryProfile = Awaited<ReturnType<typeof readDirectoryProfiles>>[number];

function toPrice(value: { toString: () => string } | null) {
  if (!value) return null;
  const price = Number(value.toString());
  return Number.isFinite(price) ? price : null;
}

function cleanText(value: string | null | undefined) {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

export function slugifyDirectorySegment(value: string | null | undefined) {
  const normalized = cleanText(value);
  if (!normalized) return "";

  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDirectoryCityName(value: string) {
  return cleanText(value)!
    .split(/([\s-]+)/)
    .map((part) => {
      if (/^[\s-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function toDirectoryProfile(profile: RawDirectoryProfile): DirectoryProfile {
  const city = cleanText(profile.city);
  const citySlug = slugifyDirectorySegment(city);
  const reviews = profile.Tenant.Review;
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  return {
    slug: profile.slug,
    businessName: cleanText(profile.businessName) || profile.Tenant.name,
    city: city ? formatDirectoryCityName(city) : null,
    citySlug: citySlug || null,
    description: cleanText(profile.description),
    imageUrl: profile.coverImageUrl || profile.avatarUrl || profile.Tenant.GalleryImage[0]?.imageUrl || null,
    coverImageUrl: profile.coverImageUrl || profile.Tenant.GalleryImage[0]?.imageUrl || null,
    avatarUrl: profile.avatarUrl || null,
    services: profile.Tenant.Service.map((service) => ({
      id: service.id,
      name: service.name,
      category: cleanText(service.category),
      durationMin: service.durationMin,
      price: toPrice(service.price),
    })),
    reviewCount: reviews.length,
    averageRating,
    updatedAt: profile.updatedAt,
  };
}

export const getDirectoryProfiles = cache(async () => {
  const profiles = await readDirectoryProfiles();

  return profiles
    .filter((profile) => getSubscriptionAccessFromTenant(profile.Tenant).canUsePublicPage)
    .map(toDirectoryProfile)
    .sort((a, b) => {
      const cityCompare = (a.city || "").localeCompare(b.city || "", "fr");
      if (cityCompare !== 0) return cityCompare;
      return a.businessName.localeCompare(b.businessName, "fr");
    });
});

export function getDirectoryCitiesFromProfiles(profiles: DirectoryProfile[]) {
  const cities = new Map<string, DirectoryCity>();

  for (const profile of profiles) {
    if (!profile.city || !profile.citySlug) continue;

    const current = cities.get(profile.citySlug);
    if (!current) {
      cities.set(profile.citySlug, {
        name: profile.city,
        slug: profile.citySlug,
        profileCount: 1,
        updatedAt: profile.updatedAt,
      });
      continue;
    }

    cities.set(profile.citySlug, {
      ...current,
      profileCount: current.profileCount + 1,
      updatedAt: profile.updatedAt > current.updatedAt ? profile.updatedAt : current.updatedAt,
    });
  }

  return Array.from(cities.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export const getDirectoryCities = cache(async () => {
  return getDirectoryCitiesFromProfiles(await getDirectoryProfiles());
});

export const getDirectoryCityPage = cache(async (citySlug: string) => {
  const normalizedCitySlug = slugifyDirectorySegment(citySlug);
  if (!normalizedCitySlug) return null;

  const profiles = (await getDirectoryProfiles()).filter((profile) => profile.citySlug === normalizedCitySlug);
  if (profiles.length === 0) return null;

  const [city] = getDirectoryCitiesFromProfiles(profiles);
  return { city, profiles };
});

export function filterDirectoryProfiles(
  profiles: DirectoryProfile[],
  filters: { query?: string; citySlug?: string }
) {
  const query = cleanText(filters.query)?.toLowerCase() || "";
  const citySlug = slugifyDirectorySegment(filters.citySlug);

  return profiles.filter((profile) => {
    if (citySlug && profile.citySlug !== citySlug) return false;
    if (!query) return true;

    const haystack = [
      profile.businessName,
      profile.city,
      profile.description,
      ...profile.services.flatMap((service) => [service.name, service.category]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

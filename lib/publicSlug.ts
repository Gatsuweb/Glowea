import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type PublicProfileLookup = Pick<typeof prisma.publicProfile, "findUnique">;

const DEFAULT_PUBLIC_SLUG_BASE = "espace-utilisateur";

export function slugifyPublicProfile(value: string | null | undefined) {
  const slug = value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || DEFAULT_PUBLIC_SLUG_BASE;
}

export async function getAvailablePublicSlug(
  lookup: PublicProfileLookup,
  params: {
    base: string | null | undefined;
    tenantId: string;
  }
) {
  const baseSlug = slugifyPublicProfile(params.base);
  let candidate = baseSlug;
  let suffix = 2;

  while (suffix < 1000) {
    const existing = await lookup.findUnique({
      where: { slug: candidate },
      select: { tenantId: true },
    });

    if (!existing || existing.tenantId === params.tenantId) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return `${baseSlug}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

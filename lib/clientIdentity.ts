import type { Prisma } from "@prisma/client";

type ClientIdentityWhere = {
  tenantId: string;
  normalizedEmail?: string | null;
  normalizedPhone?: string | null;
  excludeClientId?: string;
};

type PrismaClientIdentityDelegate = Pick<Prisma.TransactionClient["client"], "findFirst">;

export function normalizeClientEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase();
  return email || null;
}

export function normalizeClientPhone(value: string | null | undefined) {
  const compact = value?.trim().replace(/[\s.\-()]/g, "");
  if (!compact) return null;

  if (compact.startsWith("0033")) {
    return `+33${compact.slice(4)}`;
  }

  if (/^0[1-9]\d{8}$/.test(compact)) {
    return `+33${compact.slice(1)}`;
  }

  return compact;
}

export function getClientIdentityValues(data: {
  email?: string | null;
  phone?: string | null;
}) {
  return {
    normalizedEmail: normalizeClientEmail(data.email),
    normalizedPhone: normalizeClientPhone(data.phone),
  };
}

export function getClientDuplicateMessage(existing?: { archivedAt?: Date | null } | null) {
  return existing?.archivedAt
    ? "Un client avec cet email ou ce téléphone existe déjà dans les clientes archivées."
    : "Un client avec cet email ou ce téléphone existe déjà.";
}

export async function findClientByIdentity(
  clientDelegate: PrismaClientIdentityDelegate,
  params: ClientIdentityWhere
) {
  const conditions = [
    params.normalizedEmail ? { normalizedEmail: params.normalizedEmail } : null,
    params.normalizedPhone ? { normalizedPhone: params.normalizedPhone } : null,
  ].filter(Boolean) as Array<{ normalizedEmail: string } | { normalizedPhone: string }>;

  if (conditions.length === 0) return null;

  return clientDelegate.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.excludeClientId ? { not: params.excludeClientId } : undefined,
      OR: conditions,
    },
    orderBy: { createdAt: "asc" },
  });
}

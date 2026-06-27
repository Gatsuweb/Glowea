import type { ClientFlagType, ClientRiskLevel, Prisma } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient;

export type ClientVigilanceSummary = {
  isFlagged: boolean;
  riskLevel: ClientRiskLevel;
  mainReason: string;
  noShowCount: number;
};

const FLAG_TYPE_LABELS: Record<ClientFlagType, string> = {
  NO_SHOW: "No-show",
  LATE_CANCEL: "Annulation tardive",
  UNPAID: "Paiement non regle",
  BEHAVIOR: "Comportement problematique",
  OTHER: "Autre signalement",
};

export function getRiskLevelFromNoShowCount(noShowCount: number): ClientRiskLevel {
  if (noShowCount >= 3) return "HIGH";
  if (noShowCount >= 2) return "MEDIUM";
  return "LOW";
}

export function getFlagTypeLabel(type: ClientFlagType) {
  return FLAG_TYPE_LABELS[type] || "Signalement";
}

export function getVigilanceMainReason(params: {
  noShowCount?: number | null;
  latestFlag?: { type: ClientFlagType; note?: string | null } | null;
}) {
  const noShowCount = Number(params.noShowCount || 0);
  if (noShowCount > 0) {
    return `${noShowCount} no-show${noShowCount > 1 ? "s" : ""}`;
  }

  if (params.latestFlag?.note) return params.latestFlag.note;
  if (params.latestFlag?.type) return getFlagTypeLabel(params.latestFlag.type);
  return "";
}

export function getClientVigilanceSummary(client: {
  riskLevel?: ClientRiskLevel | null;
  noShowCount?: number | null;
  ClientFlag?: Array<{ type: ClientFlagType; note?: string | null; createdAt?: Date | string }> | null;
}): ClientVigilanceSummary {
  const flags = client.ClientFlag || [];
  const riskLevel = client.riskLevel || "LOW";
  const latestFlag = flags[0] || null;
  const mainReason = getVigilanceMainReason({
    noShowCount: client.noShowCount,
    latestFlag,
  });

  return {
    isFlagged: riskLevel !== "LOW" || flags.length > 0,
    riskLevel,
    mainReason,
    noShowCount: Number(client.noShowCount || 0),
  };
}

export async function addNoShowClientFlag(tx: PrismaTx, params: {
  tenantId: string;
  clientId: string;
}) {
  const client = await tx.client.findFirst({
    where: {
      id: params.clientId,
      tenantId: params.tenantId,
      archivedAt: null,
    },
    select: {
      id: true,
      noShowCount: true,
      riskLevel: true,
    },
  });

  if (!client) return null;

  const nextNoShowCount = client.noShowCount + 1;
  const noShowRiskLevel = getRiskLevelFromNoShowCount(nextNoShowCount);
  const nextRiskLevel = client.riskLevel === "HIGH" || noShowRiskLevel === "HIGH"
    ? "HIGH"
    : client.riskLevel === "MEDIUM" || noShowRiskLevel === "MEDIUM"
      ? "MEDIUM"
      : "LOW";

  await tx.clientFlag.create({
    data: {
      id: `cfl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId: params.tenantId,
      clientId: params.clientId,
      type: "NO_SHOW",
      severity: nextRiskLevel,
      note: `${nextNoShowCount} no-show${nextNoShowCount > 1 ? "s" : ""}`,
    },
  });

  await tx.client.updateMany({
    where: { id: params.clientId, tenantId: params.tenantId },
    data: {
      noShowCount: nextNoShowCount,
      riskLevel: nextRiskLevel,
      updatedAt: new Date(),
    },
  });

  return { noShowCount: nextNoShowCount, riskLevel: nextRiskLevel };
}

"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess } from "../../lib/subscription";

export type ConsentSnapshot = {
  contactLenses: "Oui" | "Non";
  cyanoacrylateAllergy: string;
  acrylatesSensitivity: string;
  medicalTreatment: string;
  contraindications: string;
  notes: string;
  mediaConsent: boolean;
  anonymizeMedia: boolean;
  careConsentAccepted: boolean;
  dataConsentAccepted: boolean;
  signedBy: string;
};

function normalizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 1000);
}

function normalizeConsentSnapshot(input: Partial<ConsentSnapshot>): ConsentSnapshot {
  return {
    contactLenses: input.contactLenses === "Oui" ? "Oui" : "Non",
    cyanoacrylateAllergy: normalizeText(input.cyanoacrylateAllergy, "Aucune connue"),
    acrylatesSensitivity: normalizeText(input.acrylatesSensitivity, "Aucune connue"),
    medicalTreatment: normalizeText(input.medicalTreatment, "Aucun"),
    contraindications: normalizeText(input.contraindications),
    notes: normalizeText(input.notes),
    mediaConsent: Boolean(input.mediaConsent),
    anonymizeMedia: Boolean(input.anonymizeMedia),
    careConsentAccepted: Boolean(input.careConsentAccepted),
    dataConsentAccepted: Boolean(input.dataConsentAccepted),
    signedBy: normalizeText(input.signedBy).slice(0, 120),
  };
}

async function ensureOwnedClient(tenantId: string, clientId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, tenantId, archivedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });
}

export async function getConsent(clientId: string) {
  if (!clientId) return { success: false as const, error: "Cliente introuvable" };

  const tenantId = await getTenantId();

  try {
    const client = await ensureOwnedClient(tenantId, clientId);
    if (!client) {
      return { success: false as const, error: "Cliente introuvable pour ce compte" };
    }

    const documents = await prisma.consentDocument.findMany({
      where: { tenantId, clientId, documentType: "CONSENT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentType: true,
        pdfUrl: true,
        signedAt: true,
        expiresAt: true,
        snapshotJson: true,
        createdAt: true,
      },
    });

    return {
      success: true as const,
      latest: documents[0] || null,
      history: documents,
      suggestedSigner: `${client.firstName} ${client.lastName || ""}`.trim(),
    };
  } catch (error) {
    console.error("Error fetching consent:", error);
    return { success: false as const, error: "Impossible de récupérer le consentement" };
  }
}

export async function saveConsent(clientId: string, input: Partial<ConsentSnapshot>) {
  if (!clientId) return { success: false as const, error: "Cliente introuvable" };

  const tenantId = await getTenantId();
  const access = await requireTenantMutationAccess(tenantId);
  if (!access.allowed) {
    return { success: false as const, error: access.error };
  }

  const snapshot = normalizeConsentSnapshot(input);

  if (!snapshot.careConsentAccepted) {
    return { success: false as const, error: "Le consentement à la prestation est obligatoire" };
  }

  if (!snapshot.dataConsentAccepted) {
    return { success: false as const, error: "Le consentement au stockage des données est obligatoire" };
  }

  if (!snapshot.signedBy) {
    return { success: false as const, error: "Le nom de la signataire est obligatoire" };
  }

  try {
    const client = await ensureOwnedClient(tenantId, clientId);
    if (!client) {
      return { success: false as const, error: "Cliente introuvable pour ce compte" };
    }

    const signedAt = new Date();
    const expiresAt = new Date(signedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const consent = await prisma.consentDocument.create({
      data: {
        id: `cons_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        clientId,
        documentType: "CONSENT",
        pdfUrl: "",
        signedAt,
        expiresAt,
        snapshotJson: {
          ...snapshot,
          version: 1,
          signedAt: signedAt.toISOString(),
        },
        updatedAt: signedAt,
      },
      select: {
        id: true,
        documentType: true,
        pdfUrl: true,
        signedAt: true,
        expiresAt: true,
        snapshotJson: true,
        createdAt: true,
      },
    });

    revalidatePath("/dashboard/clients");
    return { success: true as const, consent };
  } catch (error) {
    console.error("Error saving consent:", error);
    return { success: false as const, error: "Impossible d'enregistrer le consentement" };
  }
}

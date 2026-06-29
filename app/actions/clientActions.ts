"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import type { ClientFlagType, ClientRiskLevel } from "@prisma/client";
import { getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess } from "../../lib/subscription";
import { getRiskLevelFromNoShowCount } from "../../lib/clientVigilance";

const DIRECT_GALLERY_PROJECT_LABEL_PREFIX = "GLOWEA_GALLERY_PROJECT";
const DIRECT_GALLERY_ROLES = new Set(["before", "after", "other"]);

type DirectGalleryRole = "before" | "after" | "other";

const CLIENT_FLAG_TYPES = new Set<ClientFlagType>(["NO_SHOW", "LATE_CANCEL", "UNPAID", "BEHAVIOR", "OTHER"]);
const CLIENT_RISK_LEVELS = new Set<ClientRiskLevel>(["LOW", "MEDIUM", "HIGH"]);

function isClientFlagType(value: unknown): value is ClientFlagType {
  return typeof value === "string" && CLIENT_FLAG_TYPES.has(value as ClientFlagType);
}

function isClientRiskLevel(value: unknown): value is ClientRiskLevel {
  return typeof value === "string" && CLIENT_RISK_LEVELS.has(value as ClientRiskLevel);
}

async function getOwnedActiveClient(tenantId: string, clientId: string) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId,
      archivedAt: null,
    },
    select: {
      id: true,
      noShowCount: true,
      riskLevel: true,
    },
  });
}

function encodeDirectGalleryProjectLabel(data: {
  projectId: string;
  role: DirectGalleryRole;
  title: string;
  description: string;
}) {
  return [
    DIRECT_GALLERY_PROJECT_LABEL_PREFIX,
    data.projectId,
    data.role,
    encodeURIComponent(data.title),
    encodeURIComponent(data.description),
  ].join("|");
}

function parseDirectGalleryProjectLabel(label: string | null | undefined) {
  if (!label?.startsWith(`${DIRECT_GALLERY_PROJECT_LABEL_PREFIX}|`)) return null;

  const [, projectId, role] = label.split("|");
  if (!projectId || !DIRECT_GALLERY_ROLES.has(role)) return null;

  return {
    projectId,
    role: role as DirectGalleryRole,
  };
}

function getDirectGalleryRoleFromLabel(label: string | null | undefined): DirectGalleryRole {
  const directProject = parseDirectGalleryProjectLabel(label);
  if (directProject) return directProject.role;

  const normalizedLabel = (label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (normalizedLabel.includes("avant")) return "before";
  if (normalizedLabel.includes("apres")) return "after";
  return "other";
}

export async function createClient(data: {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  birthDate?: Date;
  referredBy?: string;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const id = `cli_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const client = await prisma.client.create({
      data: {
        id,
        tenantId: TENANT_ID,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName || ''}`.trim(),
        phone: data.phone,
        email: data.email,
        instagram: data.instagram,
        birthDate: data.birthDate,
        referredBy: data.referredBy,
        updatedAt: new Date(),
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/agenda");

    return { success: true, client };
  } catch (error) {
    console.error("Error creating client:", error);
    return { success: false, error: "Erreur lors de la création du client" };
  }
}

export async function updateClientProfile(data: {
  clientId: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  birthDate?: string;
  referredBy?: string;
  note?: string;
  allergies?: Array<{ label: string; notes?: string }>;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId: TENANT_ID,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!existingClient) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    const firstName = data.firstName.trim();
    const lastName = data.lastName?.trim() || null;
    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;
    const instagram = data.instagram?.trim().replace(/^@/, "") || null;
    const referredBy = data.referredBy?.trim() || null;
    const note = data.note?.trim() || "";
    const allergies = (data.allergies || [])
      .map((allergy) => ({
        label: allergy.label.trim(),
        notes: allergy.notes?.trim() || null,
      }))
      .filter((allergy) => allergy.label.length > 0);

    if (!firstName) {
      return { success: false, error: "Le prenom est obligatoire" };
    }

    const birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (birthDate && Number.isNaN(birthDate.getTime())) {
      return { success: false, error: "La date de naissance est invalide" };
    }

    const updatedClient = await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: data.clientId },
        data: {
          firstName,
          lastName,
          fullName: `${firstName} ${lastName || ""}`.trim(),
          phone,
          email,
          instagram,
          birthDate,
          referredBy,
          updatedAt: new Date(),
        },
      });

      await tx.clientAllergy.updateMany({
        where: { clientId: data.clientId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      if (allergies.length > 0) {
        await tx.clientAllergy.createMany({
          data: allergies.map((allergy) => ({
            id: `all_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            clientId: data.clientId,
            label: allergy.label,
            notes: allergy.notes,
            isActive: true,
            updatedAt: new Date(),
          })),
        });
      }

      const existingNote = await tx.clientNote.findFirst({
        where: {
          clientId: data.clientId,
          type: "GENERAL",
          title: "Note fiche cliente",
        },
        orderBy: { updatedAt: "desc" },
      });

      if (note) {
        if (existingNote) {
          await tx.clientNote.update({
            where: { id: existingNote.id },
            data: {
              content: note,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.clientNote.create({
            data: {
              id: `note_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
              clientId: data.clientId,
              type: "GENERAL",
              title: "Note fiche cliente",
              content: note,
              isPinned: true,
              updatedAt: new Date(),
            },
          });
        }
      } else if (existingNote) {
        await tx.clientNote.delete({
          where: { id: existingNote.id },
        });
      }

      return tx.client.findFirst({
        where: { id: data.clientId, tenantId: TENANT_ID },
        include: {
          ClientAllergy: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          },
          ClientNote: {
            where: {
              type: "GENERAL",
              title: "Note fiche cliente",
            },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/agenda");

    return { success: true, client: updatedClient };
  } catch (error) {
    console.error("Error updating client:", error);
    return { success: false, error: "Erreur lors de la mise a jour du client" };
  }
}

export async function archiveClient(clientId: string) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: TENANT_ID,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!existingClient) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    await prisma.client.updateMany({
      where: { id: existingClient.id, tenantId: TENANT_ID },
      data: {
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/agenda");

    return { success: true };
  } catch (error) {
    console.error("Error archiving client:", error);
    return { success: false, error: "Erreur lors de la suppression de la cliente" };
  }
}

export async function addClientFlag(data: {
  clientId: string;
  type: ClientFlagType;
  severity: ClientRiskLevel;
  note?: string;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  const type = isClientFlagType(data.type) ? data.type : "OTHER";
  const severity = isClientRiskLevel(data.severity) ? data.severity : "LOW";
  const note = data.note?.trim().slice(0, 1000) || null;

  try {
    const client = await getOwnedActiveClient(TENANT_ID, data.clientId);
    if (!client) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    const nextNoShowCount = type === "NO_SHOW" ? client.noShowCount + 1 : client.noShowCount;
    const noShowRiskLevel = getRiskLevelFromNoShowCount(nextNoShowCount);
    const nextRiskLevel = severity === "HIGH" || client.riskLevel === "HIGH" || noShowRiskLevel === "HIGH"
      ? "HIGH"
      : severity === "MEDIUM" || client.riskLevel === "MEDIUM" || noShowRiskLevel === "MEDIUM"
        ? "MEDIUM"
        : "LOW";

    const flag = await prisma.$transaction(async (tx) => {
      const createdFlag = await tx.clientFlag.create({
        data: {
          id: `cfl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
          tenantId: TENANT_ID,
          clientId: client.id,
          type,
          severity,
          note,
        },
      });

      await tx.client.updateMany({
        where: { id: client.id, tenantId: TENANT_ID },
        data: {
          noShowCount: nextNoShowCount,
          riskLevel: nextRiskLevel,
          updatedAt: new Date(),
        },
      });

      return createdFlag;
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");

    return { success: true, flag, riskLevel: nextRiskLevel, noShowCount: nextNoShowCount };
  } catch (error) {
    console.error("Error adding client flag:", error);
    return { success: false, error: "Erreur lors de l'ajout du signalement" };
  }
}

export async function updateClientRiskLevel(clientId: string, riskLevel: ClientRiskLevel) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  if (!isClientRiskLevel(riskLevel)) {
    return { success: false, error: "Niveau de vigilance invalide" };
  }

  try {
    const client = await getOwnedActiveClient(TENANT_ID, clientId);
    if (!client) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    await prisma.client.updateMany({
      where: { id: client.id, tenantId: TENANT_ID },
      data: {
        riskLevel,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");

    return { success: true, riskLevel };
  } catch (error) {
    console.error("Error updating client risk level:", error);
    return { success: false, error: "Erreur lors de la mise a jour de la vigilance" };
  }
}

export async function clearClientVigilance(clientId: string) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const client = await getOwnedActiveClient(TENANT_ID, clientId);
    if (!client) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    await prisma.client.updateMany({
      where: { id: client.id, tenantId: TENANT_ID },
      data: {
        riskLevel: "LOW",
        noShowCount: 0,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");

    return { success: true, riskLevel: "LOW" as const, noShowCount: 0 };
  } catch (error) {
    console.error("Error clearing client vigilance:", error);
    return { success: false, error: "Erreur lors du retrait de la vigilance" };
  }
}

export async function createClientGalleryProject(data: {
  clientId: string;
  title?: string;
  description?: string;
  photos: Array<{
    role: DirectGalleryRole;
    url: string;
    storageKey?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }>;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId: TENANT_ID,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!existingClient) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    const title = (data.title || "").trim().slice(0, 140);
    const description = (data.description || "").trim().slice(0, 1000);
    const photos = (data.photos || [])
      .filter((photo) => photo.url && DIRECT_GALLERY_ROLES.has(photo.role))
      .slice(0, 3);

    if (photos.length === 0) {
      return { success: false, error: "Ajoutez au moins une photo au projet" };
    }

    const projectId = `gproj_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    await prisma.$transaction(async (tx) => {
      for (const photo of photos) {
        const mediaId = `med_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

        await tx.media.create({
          data: {
            id: mediaId,
            tenantId: TENANT_ID,
            url: photo.url,
            storageKey: photo.storageKey || null,
            mimeType: photo.mimeType || null,
            sizeBytes: Number.isFinite(Number(photo.sizeBytes)) ? Number(photo.sizeBytes) : null,
          },
        });

        await tx.clientMedia.create({
          data: {
            id: `cmed_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            clientId: data.clientId,
            mediaId,
            label: encodeDirectGalleryProjectLabel({
              projectId,
              role: photo.role,
              title,
              description,
            }),
          },
        });
      }

      await tx.client.update({
        where: { id: data.clientId },
        data: { updatedAt: new Date() },
      });
    });

    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    console.error("Error creating client gallery project:", error);
    return { success: false, error: "Erreur lors de la creation du projet" };
  }
}

export async function updateClientGalleryProject(data: {
  clientId: string;
  sessionId?: string | null;
  mediaIds?: string[];
  title: string;
  description: string;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const title = data.title.trim();
    const description = data.description.trim();

    if (data.sessionId) {
      const existingSession = await prisma.session.findFirst({
        where: {
          id: data.sessionId,
          clientId: data.clientId,
          tenantId: TENANT_ID,
        },
        select: { id: true },
      });

      if (!existingSession) {
        return { success: false, error: "Projet introuvable pour cette cliente" };
      }

      await prisma.session.update({
        where: { id: data.sessionId },
        data: {
          title: title || null,
          generalNotes: description || null,
          updatedAt: new Date(),
        },
      });

      revalidatePath("/dashboard/clients");

      return { success: true };
    }

    const mediaIds = Array.from(new Set(data.mediaIds || []));
    if (mediaIds.length === 0) {
      return { success: false, error: "Projet introuvable pour cette cliente" };
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId: TENANT_ID,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!existingClient) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    const allowedMedia = await prisma.media.findMany({
      where: {
        tenantId: TENANT_ID,
        id: { in: mediaIds },
      },
      select: { id: true },
    });

    const clientMedia = await prisma.clientMedia.findMany({
      where: {
        clientId: data.clientId,
        mediaId: { in: allowedMedia.map((item) => item.id) },
      },
      select: { id: true, label: true },
    });

    if (clientMedia.length === 0) {
      return { success: false, error: "Projet introuvable pour cette cliente" };
    }

    const projectId =
      clientMedia
        .map((item) => parseDirectGalleryProjectLabel(item.label)?.projectId)
        .find((id): id is string => Boolean(id)) ||
      `gproj_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    await prisma.$transaction(
      clientMedia.map((item) =>
        prisma.clientMedia.update({
          where: { id: item.id },
          data: {
            label: encodeDirectGalleryProjectLabel({
              projectId,
              role: getDirectGalleryRoleFromLabel(item.label),
              title,
              description,
            }),
          },
        })
      )
    );

    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    console.error("Error updating client gallery project:", error);
    return { success: false, error: "Erreur lors de la mise a jour du projet" };
  }
}

export async function deleteClientGalleryProject(data: {
  clientId: string;
  sessionId?: string | null;
  mediaIds?: string[];
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId: TENANT_ID,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!existingClient) {
      return { success: false, error: "Cliente introuvable pour ce compte" };
    }

    let mediaIds = data.mediaIds || [];

    if (data.sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          id: data.sessionId,
          clientId: data.clientId,
          tenantId: TENANT_ID,
        },
        select: {
          SessionMedia: {
            select: { mediaId: true },
          },
        },
      });

      if (!session) {
        return { success: false, error: "Projet introuvable pour cette cliente" };
      }

      mediaIds = session.SessionMedia.map((item) => item.mediaId);
    }

    if (mediaIds.length === 0) {
      return { success: false, error: "Aucune photo a supprimer de la galerie" };
    }

    const allowedMedia = await prisma.media.findMany({
      where: {
        tenantId: TENANT_ID,
        id: { in: mediaIds },
      },
      select: { id: true },
    });

    await prisma.clientMedia.deleteMany({
      where: {
        clientId: data.clientId,
        mediaId: { in: allowedMedia.map((item) => item.id) },
      },
    });

    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    console.error("Error deleting client gallery project:", error);
    return { success: false, error: "Erreur lors de la suppression du projet" };
  }
}

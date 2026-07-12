"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { getSupabaseAdminClient, publicStorageBucket } from "../../lib/supabaseAdmin";
import { getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess, requireTenantPermission } from "../../lib/subscription";
import { getProductCategoryBySlug } from "../../src/constants/productCategories";
import { getAppointmentServicesSummary } from "../../lib/appointmentServices";
import { notifyStockLowIfNeeded } from "../../lib/notificationEvents";

type SessionStatusInput = "DRAFT" | "COMPLETED" | "IN_PROGRESS";

type ProductUsageInput = {
  productId: string;
  productLotId?: string | null;
  quantityUsed?: number;
  usageRole?: string;
  notes?: string;
  consumeStock?: boolean;
};

type PhotoInput = {
  label: string;
  url: string;
  mimeType?: string;
  mediaId?: string;
  storageKey?: string;
  sizeBytes?: number;
};

function serializeSessionProductUsage(usage: {
  id: string;
  sessionId: string;
  productId: string;
  productLotId: string | null;
  usageRole: string | null;
  quantityUsed: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: usage.id,
    sessionId: usage.sessionId,
    productId: usage.productId,
    productLotId: usage.productLotId,
    usageRole: usage.usageRole,
    quantityUsed:
      usage.quantityUsed && typeof usage.quantityUsed === "object" && "toNumber" in usage.quantityUsed
        ? (usage.quantityUsed as { toNumber: () => number }).toNumber()
        : usage.quantityUsed === null || usage.quantityUsed === undefined
          ? null
          : Number(usage.quantityUsed),
    notes: usage.notes,
    createdAt: usage.createdAt.toISOString(),
    updatedAt: usage.updatedAt.toISOString(),
  };
}

function serializeSessionSnapshot<T extends Record<string, unknown>>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type SaveSessionBase = {
  appointmentId: string;
  clientId: string;
  serviceId?: string;
  status?: SessionStatusInput;
  productUsages?: ProductUsageInput[];
  photos?: PhotoInput[];
};

type SessionGlobalParams = Prisma.InputJsonObject;

async function getTenantAppointment(tenantId: string, appointmentId: string, clientId?: string) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      tenantId,
      ...(clientId ? { clientId } : {}),
    },
    include: { Session: true },
  });

  if (!appointment) {
    throw new Error("Rendez-vous introuvable");
  }

  return appointment;
}

async function requireTechnicalSessionReadAccess(tenantId: string) {
  const access = await requireTenantPermission(
    tenantId,
    "canUseTechnicalSessions",
    "Les sessions techniques ne sont pas incluses dans votre abonnement actuel."
  );

  if (!access.allowed) {
    return { success: false as const, error: access.error };
  }

  return null;
}

async function upsertBaseSession(
  tenantId: string,
  data: SaveSessionBase,
  category: "LASHES" | "BROWLIFT" | "LASH_LIFT" | "NAILS"
) {
  await getTenantAppointment(tenantId, data.appointmentId, data.clientId);

  const now = new Date();
  const sessionStatus = data.status || "COMPLETED";
  const existingSession = await prisma.session.findFirst({
    where: { appointmentId: data.appointmentId, tenantId },
  });

  return prisma.session.upsert({
    where: { appointmentId: data.appointmentId },
    update: {
      clientId: data.clientId,
      serviceId: data.serviceId,
      category,
      status: sessionStatus,
      startedAt: existingSession?.startedAt || now,
      endedAt: sessionStatus === "COMPLETED" ? now : null,
      updatedAt: now,
    },
    create: {
      id: `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      appointmentId: data.appointmentId,
      tenantId,
      clientId: data.clientId,
      serviceId: data.serviceId,
      category,
      status: sessionStatus,
      startedAt: now,
      endedAt: sessionStatus === "COMPLETED" ? now : null,
      updatedAt: now,
    }
  });
}

async function syncSessionProductUsages(
  tenantId: string,
  sessionId: string,
  productUsages: ProductUsageInput[] | undefined,
  shouldConsumeStock: boolean
) {
  if (!productUsages) return;

  const normalizedUsages = productUsages
    .filter((usage) => usage.productId)
    .map((usage) => ({
      ...usage,
      quantityUsed: Math.max(Number(usage.quantityUsed || 1), 0),
    }));

  const previousUsages = await prisma.sessionProductUsage.findMany({
    where: { sessionId },
  });

  const previousQuantityByProduct = previousUsages.reduce<Record<string, number>>((acc, usage) => {
    acc[usage.productId] = (acc[usage.productId] || 0) + Number(usage.quantityUsed || 0);
    return acc;
  }, {});

  await prisma.sessionProductUsage.deleteMany({ where: { sessionId } });

  for (const usage of normalizedUsages) {
    const product = await prisma.product.findFirst({
      where: { id: usage.productId, tenantId, isActive: true },
      include: {
        ProductLot: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!product) continue;
    const shouldConsumeUsage = product.trackingType === "UNIDOSE" || Boolean(usage.consumeStock);

    const lot = usage.productLotId
      ? await prisma.productLot.findFirst({ where: { id: usage.productLotId, productId: product.id } })
      : product.ProductLot[0] || null;

    await prisma.sessionProductUsage.create({
      data: {
        id: `spu_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        sessionId,
        productId: product.id,
        productLotId: lot?.id || null,
        usageRole: usage.usageRole || null,
        quantityUsed: usage.quantityUsed,
        notes: usage.notes || null,
        updatedAt: new Date(),
      },
    });

    const previousQuantity = previousQuantityByProduct[product.id] || 0;
    const delta = usage.quantityUsed - previousQuantity;

    if (shouldConsumeStock && shouldConsumeUsage && lot && delta > 0) {
      const currentQuantity = Number(lot.quantityRemaining || 0);
      const remaining = Math.max(currentQuantity - delta, 0);

      await prisma.productLot.update({
        where: { id: lot.id },
        data: {
          quantityRemaining: remaining,
          status: remaining <= 0 ? "DEPLETED" : lot.status,
          updatedAt: new Date(),
        },
      });

      await prisma.stockMovement.create({
        data: {
          id: `sm_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          tenantId,
          productId: product.id,
          productLotId: lot.id,
          sessionId,
          type: "OUT",
          quantity: delta,
          reason: "SESSION_USAGE",
        },
      });

      await notifyStockLowIfNeeded({
        tenantId,
        productId: product.id,
        previousQuantity: currentQuantity,
        nextQuantity: remaining,
      });
    }
  }
}

async function removeStoredSessionMedia(storageKey: string | null | undefined) {
  if (!storageKey) return;
  const supabase = getSupabaseAdminClient();
  await supabase.storage.from(publicStorageBucket).remove([storageKey]).catch(() => undefined);
}

async function syncSessionPhotos(
  tenantId: string,
  sessionId: string,
  clientId: string,
  photos: PhotoInput[] | undefined
) {
  if (!photos) return;

  const validPhotos = photos.filter((photo) => photo.url && photo.label);
  const existingSessionMedia = await prisma.sessionMedia.findMany({
    where: { sessionId },
    include: { Media: true },
  });
  const nextMediaIds = new Set(validPhotos.map((photo) => photo.mediaId).filter((mediaId): mediaId is string => Boolean(mediaId)));

  await prisma.sessionMedia.deleteMany({
    where: { sessionId },
  });

  for (const photo of validPhotos) {
    let media = photo.mediaId
      ? await prisma.media.findFirst({
          where: {
            id: photo.mediaId,
            tenantId,
          },
        })
      : null;

    if (!media) {
      media = await prisma.media.create({
        data: {
          id: `med_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          tenantId,
          url: photo.url,
          storageKey: photo.storageKey || null,
          mimeType: photo.mimeType || null,
          sizeBytes: Number.isFinite(Number(photo.sizeBytes)) ? Number(photo.sizeBytes) : null,
        },
      });
    }

    await prisma.sessionMedia.create({
      data: {
        id: `smed_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        sessionId,
        mediaId: media.id,
        label: photo.label,
      },
    });

    await prisma.clientMedia.upsert({
      where: {
        clientId_mediaId: {
          clientId,
          mediaId: media.id,
        },
      },
      update: {
        label: photo.label,
      },
      create: {
        id: `cmed_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        clientId,
        mediaId: media.id,
        label: photo.label,
      },
    });
  }

  const removedMedia = existingSessionMedia.filter((item) => !nextMediaIds.has(item.mediaId));
  for (const item of removedMedia) {
    const otherSessionLinks = await prisma.sessionMedia.count({
      where: {
        mediaId: item.mediaId,
        sessionId: { not: sessionId },
      },
    });

    if (otherSessionLinks === 0) {
      await prisma.clientMedia.deleteMany({
        where: {
          clientId,
          mediaId: item.mediaId,
        },
      });
      await prisma.media.deleteMany({
        where: {
          id: item.mediaId,
          tenantId,
        },
      });
      await removeStoredSessionMedia(item.Media.storageKey);
    }
  }
}

export async function getSessionModalData(clientId: string | undefined, appointmentId?: string) {
  const TENANT_ID = await getTenantId();
  const denied = await requireTechnicalSessionReadAccess(TENANT_ID);
  if (denied) return denied;

  try {
    let clientInfo = null;
    let appointmentServices = null;

    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId, tenantId: TENANT_ID },
        include: {
          Appointment: true,
          ClientAllergy: {
            where: { isActive: true }
          }
        }
      });

      if (client) {
        clientInfo = {
          fullName: client.fullName || `${client.firstName} ${client.lastName || ''}`.trim(),
          phone: client.phone || "Non renseigné",
          email: client.email || "Non renseigné",
          appointmentCount: client.Appointment.length,
          allergies: client.ClientAllergy.length > 0 
            ? client.ClientAllergy.map(a => a.label).join(", ") 
            : "Aucune allergie",
          isLoyal: client.Appointment.length >= 5
        };
      }
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, tenantId: TENANT_ID },
        include: {
          Service: true,
          AppointmentService: {
            include: { Service: true },
            orderBy: { position: "asc" },
          },
        },
      });

      if (appointment) {
        const summary = getAppointmentServicesSummary(appointment);
        appointmentServices = {
          label: summary.label,
          totalDurationMin: summary.totalDurationMin,
          totalPriceCents: summary.totalPriceCents,
          services: summary.services.map((service) => ({
            serviceId: service.serviceId,
            name: service.nameSnapshot,
            durationMin: service.durationSnapshot,
            priceCents: service.priceSnapshot,
            position: service.position,
          })),
        };
      }
    }

    const productsData = await prisma.product.findMany({
      where: { tenantId: TENANT_ID, isActive: true },
      include: {
        ProductLot: {
          where: { status: "ACTIVE" }
        },
        ProductCategory: true
      }
    });

    const products = productsData.map(p => {
      const totalStock = p.ProductLot.reduce((sum, lot) => sum + Number(lot.quantityRemaining || 0), 0);
      const businessCategory = getProductCategoryBySlug(p.ProductCategory?.slug);
      return {
        id: p.id,
        name: p.name,
        stock: `Stock ${totalStock}`,
        categorySlug: p.ProductCategory?.slug || null,
        categoryLabel: businessCategory?.label || p.ProductCategory?.name || null,
        categoryFamily: businessCategory?.family || null,
        trackingType: p.trackingType,
        checked: false
      };
    });

    return { success: true, clientInfo, products, appointmentServices };
  } catch (error) {
    console.error("Error fetching session modal data:", error);
    return { success: false, error: "Erreur lors de la récupération des données" };
  }
}

export async function startSession(data: {
  appointmentId: string;
  clientId: string;
  serviceId?: string;
  category: "LASHES" | "BROWLIFT" | "LASH_LIFT" | "NAILS";
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    await upsertBaseSession(TENANT_ID, {
      appointmentId: data.appointmentId,
      clientId: data.clientId,
      serviceId: data.serviceId,
      status: "IN_PROGRESS",
    }, data.category);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");

    return { success: true };
  } catch (error) {
    console.error("Error starting session:", error);
    return { success: false, error: "Erreur lors du demarrage de la session" };
  }
}

export async function getLashSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  const denied = await requireTechnicalSessionReadAccess(TENANT_ID);
  if (denied) return denied;

  try {
    const session = await prisma.session.findFirst({
      where: { appointmentId, tenantId: TENANT_ID },
      include: {
        LashSession: true,
        SessionMedia: { include: { Media: true } },
        SessionProductUsage: true,
      }
    });
    
    if (session && session.LashSession) {
      return { 
        success: true, 
        lashSession: serializeSessionSnapshot(session.LashSession),
        photos: session.SessionMedia.map((item) => ({
          mediaId: item.Media.id,
          label: item.label || "Photo",
          storageKey: item.Media.storageKey || undefined,
          url: item.Media.url,
          mimeType: item.Media.mimeType || undefined,
        })),
        productUsages: session.SessionProductUsage.map(serializeSessionProductUsage),
      };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching lash session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function getBrowliftSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  const denied = await requireTechnicalSessionReadAccess(TENANT_ID);
  if (denied) return denied;

  try {
    const session = await prisma.session.findFirst({
      where: { appointmentId, tenantId: TENANT_ID },
      include: {
        BrowliftSession: true,
        SessionMedia: { include: { Media: true } },
        SessionProductUsage: true,
      }
    });
    
    if (session && session.BrowliftSession) {
      return { 
        success: true, 
        browliftSession: serializeSessionSnapshot(session.BrowliftSession),
        photos: session.SessionMedia.map((item) => ({
          mediaId: item.Media.id,
          label: item.label || "Photo",
          storageKey: item.Media.storageKey || undefined,
          url: item.Media.url,
          mimeType: item.Media.mimeType || undefined,
        })),
        productUsages: session.SessionProductUsage.map(serializeSessionProductUsage),
      };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching browlift session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function getLashLiftSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  const denied = await requireTechnicalSessionReadAccess(TENANT_ID);
  if (denied) return denied;

  try {
    const session = await prisma.session.findFirst({
      where: { appointmentId, tenantId: TENANT_ID },
      include: {
        LashLiftSession: true,
        SessionMedia: { include: { Media: true } },
        SessionProductUsage: true,
      }
    });
    
    if (session && session.LashLiftSession) {
      return { 
        success: true, 
        lashLiftSession: serializeSessionSnapshot(session.LashLiftSession),
        photos: session.SessionMedia.map((item) => ({
          mediaId: item.Media.id,
          label: item.label || "Photo",
          storageKey: item.Media.storageKey || undefined,
          url: item.Media.url,
          mimeType: item.Media.mimeType || undefined,
        })),
        productUsages: session.SessionProductUsage.map(serializeSessionProductUsage),
      };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching lash lift session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function getNailSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  const denied = await requireTechnicalSessionReadAccess(TENANT_ID);
  if (denied) return denied;

  try {
    const session = await prisma.session.findFirst({
      where: { appointmentId, tenantId: TENANT_ID },
      include: {
        NailSession: true,
        SessionMedia: { include: { Media: true } },
        SessionProductUsage: true,
      }
    });
    
    if (session && session.NailSession) {
      return { 
        success: true, 
        nailSession: serializeSessionSnapshot(session.NailSession),
        photos: session.SessionMedia.map((item) => ({
          mediaId: item.Media.id,
          label: item.label || "Photo",
          storageKey: item.Media.storageKey || undefined,
          url: item.Media.url,
          mimeType: item.Media.mimeType || undefined,
        })),
        productUsages: session.SessionProductUsage.map(serializeSessionProductUsage),
      };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching nail session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function saveLashSession(data: {
  appointmentId: string;
  clientId: string;
  serviceId?: string;
  prestationType: string;
  poseName: string;
  lashBrand: string;
  lashReference: string;
  glueUsed: string;
  generalCurl: string;
  generalThickness: string;
  generalLengthMapJson: string[];
  globalParamsJson?: SessionGlobalParams;
  remarks?: string;
  status?: SessionStatusInput;
  productUsages?: ProductUsageInput[];
  photos?: PhotoInput[];
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const lashSessionId = `lash_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await upsertBaseSession(TENANT_ID, data, "LASHES");

    // Create LashSession
    await prisma.lashSession.upsert({
      where: { sessionId: session.id },
      update: {
        prestationType: data.prestationType,
        poseName: data.poseName,
        lashBrand: data.lashBrand,
        lashReference: data.lashReference,
        glueUsed: data.glueUsed,
        generalCurl: data.generalCurl,
        generalThickness: data.generalThickness,
        generalLengthMapJson: data.generalLengthMapJson,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      },
      create: {
        id: lashSessionId,
        sessionId: session.id,
        prestationType: data.prestationType,
        poseName: data.poseName,
        lashBrand: data.lashBrand,
        lashReference: data.lashReference,
        glueUsed: data.glueUsed,
        generalCurl: data.generalCurl,
        generalThickness: data.generalThickness,
        generalLengthMapJson: data.generalLengthMapJson,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      }
    });

    await syncSessionProductUsages(TENANT_ID, session.id, data.productUsages, sessionStatus === "COMPLETED");
    await syncSessionPhotos(TENANT_ID, session.id, data.clientId, data.photos);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard/clients");
    
    return { success: true };
  } catch (error) {
    console.error("Error saving lash session:", error);
    return { success: false, error: "Erreur lors de la sauvegarde de la session" };
  }
}

export async function saveBrowliftSession(data: {
  appointmentId: string;
  clientId: string;
  serviceId?: string;
  tintEnabled: boolean;
  tintColor: string;
  globalParamsJson?: SessionGlobalParams;
  remarks?: string;
  status?: SessionStatusInput;
  productUsages?: ProductUsageInput[];
  photos?: PhotoInput[];
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const browliftSessionId = `brow_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await upsertBaseSession(TENANT_ID, data, "BROWLIFT");

    await prisma.browliftSession.upsert({
      where: { sessionId: session.id },
      update: {
        tintEnabled: data.tintEnabled,
        tintColor: data.tintColor,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      },
      create: {
        id: browliftSessionId,
        sessionId: session.id,
        tintEnabled: data.tintEnabled,
        tintColor: data.tintColor,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      }
    });

    await syncSessionProductUsages(TENANT_ID, session.id, data.productUsages, sessionStatus === "COMPLETED");
    await syncSessionPhotos(TENANT_ID, session.id, data.clientId, data.photos);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch (error) {
    console.error("Error saving browlift session:", error);
    return { success: false, error: "Erreur lors de la sauvegarde de la session" };
  }
}

export async function saveLashLiftSession(data: {
  appointmentId: string;
  clientId: string;
  serviceId?: string;
  tintEnabled: boolean;
  tintColor: string;
  globalParamsJson?: SessionGlobalParams;
  remarks?: string;
  status?: SessionStatusInput;
  productUsages?: ProductUsageInput[];
  photos?: PhotoInput[];
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const lashLiftSessionId = `lashlift_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await upsertBaseSession(TENANT_ID, data, "LASH_LIFT");

    await prisma.lashLiftSession.upsert({
      where: { sessionId: session.id },
      update: {
        tintEnabled: data.tintEnabled,
        tintColor: data.tintColor,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      },
      create: {
        id: lashLiftSessionId,
        sessionId: session.id,
        tintEnabled: data.tintEnabled,
        tintColor: data.tintColor,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      }
    });

    await syncSessionProductUsages(TENANT_ID, session.id, data.productUsages, sessionStatus === "COMPLETED");
    await syncSessionPhotos(TENANT_ID, session.id, data.clientId, data.photos);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch (error) {
    console.error("Error saving lash lift session:", error);
    return { success: false, error: "Erreur lors de la sauvegarde de la session" };
  }
}

export async function saveNailSession(data: {
  appointmentId: string;
  clientId: string;
  serviceId?: string;
  prestationType: string;
  poseType: string;
  shape: string;
  size: string;
  baseUsed: string;
  gelUsed: string;
  colorUsed: string;
  primerUsed: string;
  globalParamsJson?: SessionGlobalParams;
  remarks?: string;
  status?: SessionStatusInput;
  productUsages?: ProductUsageInput[];
  photos?: PhotoInput[];
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const nailSessionId = `nail_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await upsertBaseSession(TENANT_ID, data, "NAILS");

    await prisma.nailSession.upsert({
      where: { sessionId: session.id },
      update: {
        prestationType: data.prestationType,
        poseType: data.poseType,
        shape: data.shape,
        size: data.size,
        baseUsed: data.baseUsed,
        gelUsed: data.gelUsed,
        colorUsed: data.colorUsed,
        primerUsed: data.primerUsed,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      },
      create: {
        id: nailSessionId,
        sessionId: session.id,
        prestationType: data.prestationType,
        poseType: data.poseType,
        shape: data.shape,
        size: data.size,
        baseUsed: data.baseUsed,
        gelUsed: data.gelUsed,
        colorUsed: data.colorUsed,
        primerUsed: data.primerUsed,
        globalParamsJson: data.globalParamsJson || {},
        remarks: data.remarks || "",
        updatedAt: new Date(),
      }
    });

    await syncSessionProductUsages(TENANT_ID, session.id, data.productUsages, sessionStatus === "COMPLETED");
    await syncSessionPhotos(TENANT_ID, session.id, data.clientId, data.photos);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch (error) {
    console.error("Error saving nail session:", error);
    return { success: false, error: "Erreur lors de la sauvegarde de la session" };
  }
}

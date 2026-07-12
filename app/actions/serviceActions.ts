"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess, requireTenantPermission } from "../../lib/subscription";

function revalidateServiceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/profil");
  revalidatePath("/dashboard/page-publique");
}

function serializeService(service: {
  id: string;
  name: string;
  price: { toString(): string } | number | string | null;
  durationMin: number | null;
  color: string | null;
}) {
  return {
    id: service.id,
    name: service.name,
    price: service.price ? service.price.toString() : "0",
    durationMin: service.durationMin || 60,
    color: service.color,
  };
}

export async function createService(data: {
  name: string;
  price?: number;
  durationMin?: number;
  color?: string;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "Le nom de la prestation est obligatoire" };
    }

    const existingService = await prisma.service.findFirst({
      where: { tenantId: TENANT_ID, name },
    });

    if (existingService?.isActive) {
      return { success: false, error: "Une prestation avec ce nom existe déjà" };
    }

    const service = existingService
      ? await prisma.service.update({
          where: { id: existingService.id, tenantId: TENANT_ID },
          data: {
            price: data.price,
            durationMin: data.durationMin,
            color: data.color,
            isActive: true,
            isPublic: true,
            updatedAt: new Date(),
          },
        })
      : await prisma.service.create({
          data: {
            id: `srv_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            tenantId: TENANT_ID,
            name,
            price: data.price,
            durationMin: data.durationMin,
            color: data.color,
            updatedAt: new Date(),
          },
        });

    revalidateServiceViews();

    return { 
      success: true, 
      service: serializeService(service),
    };
  } catch (error) {
    console.error("Error creating service:", error);
    return { success: false, error: "Erreur lors de la création de la prestation" };
  }
}

export async function getServices() {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantPermission(
    TENANT_ID,
    "canUseMainDashboard",
    "Le dashboard principal n'est pas inclus dans votre abonnement actuel."
  );
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const services = await prisma.service.findMany({
      where: { tenantId: TENANT_ID, isActive: true },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: services };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { success: false, error: "Erreur lors de la récupération des prestations" };
  }
}

export async function updateService(id: string, data: {
  name?: string;
  price?: number;
  durationMin?: number;
  color?: string;
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const service = await prisma.service.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    
    revalidateServiceViews();
    
    return { success: true, data: service };
  } catch (error) {
    console.error("Error updating service:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function deleteService(id: string) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const existingService = await prisma.service.findFirst({
      where: { id, tenantId: TENANT_ID, isActive: true },
      select: { id: true },
    });

    if (!existingService) {
      return { success: false, error: "Prestation introuvable pour ce compte" };
    }

    await prisma.service.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        isActive: false,
        isPublic: false,
        updatedAt: new Date(),
      },
    });
    
    revalidateServiceViews();
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

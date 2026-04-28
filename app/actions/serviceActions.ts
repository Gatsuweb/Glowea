"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";


export async function getServices() {
  const TENANT_ID = await getTenantId();
  try {
    const services = await prisma.service.findMany({
      where: { tenantId: TENANT_ID, isActive: true },
      orderBy: { name: 'asc' },
    });
    
    // Parse Decimal values to numbers for client components
    const formattedServices = services.map(service => ({
      ...service,
      price: service.price ? Number(service.price) : null,
    }));
    
    return { success: true, data: formattedServices };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { success: false, error: "Erreur lors de la récupération des prestations" };
  }
}

export async function createService(data: {
  name: string;
  durationMin?: number;
  price?: number;
  color?: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const newId = `srv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    
    const service = await prisma.service.create({
      data: {
        id: newId,
        tenantId: TENANT_ID,
        name: data.name,
        durationMin: data.durationMin || 60,
        price: data.price !== undefined ? data.price : null,
        color: data.color || "#FF69B4",
        updatedAt: new Date(),
      }
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/agenda");
    
    return { success: true, data: service };
  } catch (error: any) {
    console.error("Error creating service:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Une prestation avec ce nom existe déjà." };
    }
    return { success: false, error: "Erreur lors de la création de la prestation" };
  }
}

export async function updateService(id: string, data: {
  name?: string;
  durationMin?: number;
  price?: number;
  color?: string;
  isActive?: boolean;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.durationMin !== undefined) updateData.durationMin = data.durationMin;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const service = await prisma.service.update({
      where: { id, tenantId: TENANT_ID },
      data: updateData,
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/agenda");
    
    return { success: true, data: service };
  } catch (error) {
    console.error("Error updating service:", error);
    return { success: false, error: "Erreur lors de la modification de la prestation" };
  }
}

export async function deleteService(id: string) {
  const TENANT_ID = await getTenantId();
  try {
    // Instead of actual deletion, we can mark as inactive to preserve history (soft delete)
    // Or hard delete if there are no related appointments.
    // Let's do a soft delete by setting isActive to false.
    await prisma.service.update({
      where: { id, tenantId: TENANT_ID },
      data: { isActive: false, updatedAt: new Date() },
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/agenda");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Erreur lors de la suppression de la prestation" };
  }
}
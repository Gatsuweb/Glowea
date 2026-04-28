"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";

export async function createService(data: {
  name: string;
  price?: number;
  durationMin?: number;
  color?: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const id = `srv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const service = await prisma.service.create({
      data: {
        id,
        tenantId: TENANT_ID,
        name: data.name,
        price: data.price,
        durationMin: data.durationMin,
        color: data.color,
        updatedAt: new Date(),
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard/profil");

    return { 
      success: true, 
      service: {
        id: service.id,
        name: service.name,
        price: service.price ? service.price.toString() : '0',
        durationMin: service.durationMin || 60,
      } 
    };
export async function getServices() {
  const TENANT_ID = await getTenantId();
  try {
    const services = await prisma.service.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: services };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { success: false, error: "Erreur lors de la récupération des prestations" };
  }
}

export async function updateService(id: string, data: any) {
  const TENANT_ID = await getTenantId();
  try {
    const service = await prisma.service.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard/profil");
    
    return { success: true, data: service };
  } catch (error) {
    console.error("Error updating service:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function deleteService(id: string) {
  const TENANT_ID = await getTenantId();
  try {
    await prisma.service.delete({
      where: { id, tenantId: TENANT_ID }
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard/profil");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";

export async function createService(data: {
  name: string;
  price?: number;
  durationMin?: number;
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
  } catch (error) {
    console.error("Error creating service:", error);
    return { success: false, error: "Erreur lors de la création de la prestation" };
  }
}

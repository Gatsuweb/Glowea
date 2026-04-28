"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantId } from "../../lib/tenant";

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

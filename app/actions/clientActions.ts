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

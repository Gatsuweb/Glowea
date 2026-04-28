"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function getConsent(clientId: string) {
  if (!clientId) return null;

  try {
    const consent = await prisma.consentDocument.findFirst({
      where: { clientId, documentType: 'CONSENT' },
      orderBy: { createdAt: 'desc' }
    });
    return consent;
  } catch (error) {
    console.error("Error fetching consent:", error);
    return null;
  }
}

export async function saveConsent(clientId: string, data: any) {
  if (!clientId) return { success: false, error: "Client ID required" };

  try {
    // Find existing or create new
    const existing = await prisma.consentDocument.findFirst({
      where: { clientId, documentType: 'CONSENT' }
    });

    let consent;
    if (existing) {
      consent = await prisma.consentDocument.update({
        where: { id: existing.id },
        data: {
          snapshotJson: data,
          signedAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      const id = `cons_${Date.now()}`;
      consent = await prisma.consentDocument.create({
        data: {
          id,
          tenantId: "tenant_seed_123",
          clientId,
          documentType: 'CONSENT',
          pdfUrl: '',
          signedAt: new Date(),
          snapshotJson: data,
          updatedAt: new Date()
        }
      });
    }

    revalidatePath("/dashboard/clients");
    return { success: true, consent };
  } catch (error) {
    console.error("Error saving consent:", error);
    return { success: false, error: "Failed to save consent" };
  }
}

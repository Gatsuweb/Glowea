"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";


export async function getSessionModalData(clientId: string | undefined) {
  const TENANT_ID = await getTenantId();
  try {
    let clientInfo = null;

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
      return {
        id: p.id,
        name: p.name,
        stock: `Stock ${totalStock}`,
        checked: false
      };
    });

    return { success: true, clientInfo, products };
  } catch (error) {
    console.error("Error fetching session modal data:", error);
    return { success: false, error: "Erreur lors de la récupération des données" };
  }
}

export async function getLashSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  try {
    const session = await prisma.session.findUnique({
      where: { appointmentId },
      include: {
        LashSession: true
      }
    });
    
    if (session && session.LashSession) {
      return { success: true, lashSession: session.LashSession };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching lash session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function getBrowliftSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  try {
    const session = await prisma.session.findUnique({
      where: { appointmentId },
      include: {
        BrowliftSession: true
      }
    });
    
    if (session && session.BrowliftSession) {
      return { success: true, browliftSession: session.BrowliftSession };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching browlift session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function getLashLiftSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  try {
    const session = await prisma.session.findUnique({
      where: { appointmentId },
      include: {
        LashLiftSession: true
      }
    });
    
    if (session && session.LashLiftSession) {
      return { success: true, lashLiftSession: session.LashLiftSession };
    }
    
    return { success: false, error: "Session non trouvée" };
  } catch (error) {
    console.error("Error fetching lash lift session data:", error);
    return { success: false, error: "Erreur lors de la récupération des données de session" };
  }
}

export async function getNailSessionByAppointmentId(appointmentId: string) {
  const TENANT_ID = await getTenantId();
  try {
    const session = await prisma.session.findUnique({
      where: { appointmentId },
      include: {
        NailSession: true
      }
    });
    
    if (session && session.NailSession) {
      return { success: true, nailSession: session.NailSession };
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
  globalParamsJson?: any;
  remarks?: string;
  status?: "DRAFT" | "COMPLETED" | "IN_PROGRESS";
}) {
  const TENANT_ID = await getTenantId();
  try {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const lashSessionId = `lash_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    // Create Session
    const session = await prisma.session.upsert({
      where: { appointmentId: data.appointmentId },
      update: {
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "LASHES",
        status: sessionStatus,
        updatedAt: new Date(),
      },
      create: {
        id: sessionId,
        appointmentId: data.appointmentId,
        tenantId: TENANT_ID,
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "LASHES",
        status: sessionStatus,
        updatedAt: new Date(),
      }
    });

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

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    
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
  globalParamsJson?: any;
  remarks?: string;
  status?: "DRAFT" | "COMPLETED" | "IN_PROGRESS";
}) {
  const TENANT_ID = await getTenantId();
  try {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const browliftSessionId = `brow_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await prisma.session.upsert({
      where: { appointmentId: data.appointmentId },
      update: {
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "BROWLIFT",
        status: sessionStatus,
        updatedAt: new Date(),
      },
      create: {
        id: sessionId,
        appointmentId: data.appointmentId,
        tenantId: TENANT_ID,
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "BROWLIFT",
        status: sessionStatus,
        updatedAt: new Date(),
      }
    });

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
  globalParamsJson?: any;
  remarks?: string;
  status?: "DRAFT" | "COMPLETED" | "IN_PROGRESS";
}) {
  const TENANT_ID = await getTenantId();
  try {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const lashLiftSessionId = `lashlift_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await prisma.session.upsert({
      where: { appointmentId: data.appointmentId },
      update: {
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "LASHES",
        status: sessionStatus,
        updatedAt: new Date(),
      },
      create: {
        id: sessionId,
        appointmentId: data.appointmentId,
        tenantId: TENANT_ID,
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "LASHES",
        status: sessionStatus,
        updatedAt: new Date(),
      }
    });

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
  globalParamsJson?: any;
  remarks?: string;
  status?: "DRAFT" | "COMPLETED" | "IN_PROGRESS";
}) {
  const TENANT_ID = await getTenantId();
  try {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const nailSessionId = `nail_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const sessionStatus = data.status || "COMPLETED";

    const session = await prisma.session.upsert({
      where: { appointmentId: data.appointmentId },
      update: {
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "NAILS",
        status: sessionStatus,
        updatedAt: new Date(),
      },
      create: {
        id: sessionId,
        appointmentId: data.appointmentId,
        tenantId: TENANT_ID,
        clientId: data.clientId,
        serviceId: data.serviceId,
        category: "NAILS",
        status: sessionStatus,
        updatedAt: new Date(),
      }
    });

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

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agenda");
    return { success: true };
  } catch (error) {
    console.error("Error saving nail session:", error);
    return { success: false, error: "Erreur lors de la sauvegarde de la session" };
  }
}

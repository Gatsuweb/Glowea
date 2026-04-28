import React from "react";
import prisma from "../../../lib/prisma";
import ClientsClientWrapper from "../../components/ClientsClientWrapper";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const tenantId = "tenant_seed_123";

  // Fetch all clients for this tenant
  const clientsData = await prisma.client.findMany({
    where: { tenantId },
    include: {
      Appointment: {
        include: {
          Service: {
            include: { ServiceCategory: true }
          },
          Session: true,
        },
        orderBy: {
          scheduledAt: "desc"
        }
      },
      ClientAllergy: {
        where: { isActive: true }
      },
      ConsentDocument: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: {
      firstName: "asc"
    }
  });

  return <ClientsClientWrapper clients={clientsData} />;
}

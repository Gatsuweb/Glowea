import React from "react";
import prisma from "../../../lib/prisma";
import ClientsClientWrapper from "../../components/ClientsClientWrapper";
import { getTenantId } from "../../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const tenantId = await getTenantId();

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

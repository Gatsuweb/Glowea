import React from "react";
import prisma from "../../../lib/prisma";
import ClientsClientWrapper from "../../components/ClientsClientWrapper";
import { getTenantId } from "../../../lib/tenant";

export const dynamic = "force-dynamic";

function serializeValue<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (current && typeof current === "object" && current.constructor?.name === "Decimal") {
        return current.toString();
      }
      if (typeof current === "bigint") {
        return current.toString();
      }
      return current;
    })
  );
}

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
      ClientNote: {
        where: {
          type: "GENERAL",
          title: "Note fiche cliente",
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      ConsentDocument: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: {
      firstName: "asc"
    }
  });

  const serializedClients = serializeValue(clientsData);

  return <ClientsClientWrapper clients={serializedClients} />;
}

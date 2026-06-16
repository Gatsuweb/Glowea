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

  const [clientsData, servicesData] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId },
      include: {
        Appointment: {
          include: {
            Service: {
              include: { ServiceCategory: true }
            },
            AppointmentService: {
              include: { Service: true },
              orderBy: { position: "asc" },
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
        ClientMedia: {
          include: {
            Media: {
              include: {
                SessionMedia: {
                  include: {
                    Session: {
                      include: {
                        Service: true,
                        Appointment: {
                          select: { scheduledAt: true },
                        },
                      },
                    },
                  },
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        ConsentDocument: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: {
        firstName: "asc"
      },
    }),
    prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedClients = serializeValue(clientsData);
  const serializedServices = serializeValue(servicesData);

  return <ClientsClientWrapper clients={serializedClients} services={serializedServices} />;
}

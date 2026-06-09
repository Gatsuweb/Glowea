import type { CampaignChannel, CampaignTargetSegment, MessageTemplate } from "@prisma/client";
import prisma from "./prisma";

export type CampaignPreviewRecipient = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

type CampaignClient = CampaignPreviewRecipient & {
  visitCount: number;
  lastVisitAt: Date | null;
  Appointment: Array<{
    scheduledAt: Date;
    status: string;
    Service: {
      price: { toString(): string } | null;
    } | null;
  }>;
};

type RenderVariables = {
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  offer?: string | null;
  bookingLink?: string | null;
};

export const DEFAULT_CAMPAIGN_TEMPLATES = [
  {
    name: "Confirmation de rendez-vous",
    type: "SMS" as const,
    channel: "SMS" as const,
    subject: null,
    body: "Bonjour {firstName}, votre rendez-vous chez {businessName} est confirme. A bientot",
  },
  {
    name: "Confirmation de rendez-vous - Email",
    type: "EMAIL" as const,
    channel: "EMAIL" as const,
    subject: "Confirmation de votre rendez-vous chez {businessName}",
    body: "Bonjour {firstName},\n\nVotre rendez-vous chez {businessName} est bien confirme.\n\nA tres bientot,\n{businessName}",
  },
  {
    name: "Offre Printemps -20%",
    type: "SMS" as const,
    channel: "SMS" as const,
    subject: null,
    body: "Bonjour {firstName}, profitez de {offer} chez {businessName}. Reservez ici : {bookingLink}",
  },
  {
    name: "Offre Printemps -20% - Email",
    type: "EMAIL" as const,
    channel: "EMAIL" as const,
    subject: "Une offre speciale vous attend chez {businessName}",
    body: "Bonjour {firstName},\n\nProfitez de {offer} chez {businessName}.\n\nVous pouvez reserver ici : {bookingLink}\n\nA bientot,\n{businessName}",
  },
  {
    name: "Rappel 24h Avant",
    type: "SMS" as const,
    channel: "SMS" as const,
    subject: null,
    body: "Bonjour {firstName}, petit rappel pour votre rendez-vous demain chez {businessName}. A bientot",
  },
  {
    name: "Rappel 24h Avant - Email",
    type: "EMAIL" as const,
    channel: "EMAIL" as const,
    subject: "Rappel de votre rendez-vous de demain",
    body: "Bonjour {firstName},\n\nPetit rappel pour votre rendez-vous prevu demain chez {businessName}.\n\nA bientot,\n{businessName}",
  },
  {
    name: "Reactivation cliente inactive",
    type: "SMS" as const,
    channel: "SMS" as const,
    subject: null,
    body: "Bonjour {firstName}, cela fait un moment que l'on ne vous a pas vue chez {businessName}. {offer} pour votre retour : {bookingLink}",
  },
  {
    name: "Reactivation cliente inactive - Email",
    type: "EMAIL" as const,
    channel: "EMAIL" as const,
    subject: "Cela fait longtemps que nous ne vous avons pas vue",
    body: "Bonjour {firstName},\n\nCela fait un moment que nous ne vous avons pas vue chez {businessName}.\n\nPour votre retour, profitez de {offer} : {bookingLink}\n\nAu plaisir de vous revoir,\n{businessName}",
  },
  {
    name: "Remerciement apres seance",
    type: "SMS" as const,
    channel: "SMS" as const,
    subject: null,
    body: "Merci {firstName} pour votre visite chez {businessName}. A tres bientot",
  },
  {
    name: "Remerciement apres seance - Email",
    type: "EMAIL" as const,
    channel: "EMAIL" as const,
    subject: "Merci pour votre visite chez {businessName}",
    body: "Bonjour {firstName},\n\nMerci pour votre visite chez {businessName}.\n\nA tres bientot,\n{businessName}",
  },
];

export function getCampaignProviderMode(channel: CampaignChannel) {
  if (channel === "MOCK") return "mock";
  if (channel === "EMAIL") return "mock";
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  return provider === "twilio" ? "real" : "mock";
}

export async function ensureDefaultCampaignTemplates(tenantId: string) {
  for (const template of DEFAULT_CAMPAIGN_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: template.name,
        },
      },
      create: {
        id: `tmpl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        type: template.type,
        channel: template.channel,
        name: template.name,
        subject: template.subject,
        body: template.body,
        variablesJson: ["firstName", "lastName", "businessName", "offer", "bookingLink"],
        isSystem: true,
        updatedAt: new Date(),
      },
      update: {
        type: template.type,
        channel: template.channel,
        isSystem: true,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }
}

export async function getCampaignTemplates(tenantId: string) {
  await ensureDefaultCampaignTemplates(tenantId);

  return prisma.messageTemplate.findMany({
    where: {
      tenantId,
      isActive: true,
      channel: {
        in: ["SMS", "EMAIL"],
      },
    },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });
}

export async function getBusinessName(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { BusinessSettings: true },
  });

  return tenant?.BusinessSettings?.displayName?.trim() || tenant?.name || "votre institut";
}

export async function getCampaignTemplate(tenantId: string, templateId: string) {
  await ensureDefaultCampaignTemplates(tenantId);

  return prisma.messageTemplate.findFirst({
    where: {
      id: templateId,
      tenantId,
      isActive: true,
    },
  });
}

export async function getSegmentClients(tenantId: string, segment: CampaignTargetSegment) {
  const clients = await prisma.client.findMany({
    where: {
      tenantId,
      archivedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      visitCount: true,
      lastVisitAt: true,
      Appointment: {
        where: {
          status: {
            in: ["COMPLETED", "CONFIRMED", "SCHEDULED"],
          },
        },
        select: {
          scheduledAt: true,
          status: true,
          Service: {
            select: {
              price: true,
            },
          },
        },
      },
    },
  });

  if (segment === "ALL") return clients;

  if (segment === "INACTIVE") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    return clients.filter((client) => {
      const latestAppointment = getLatestAppointmentDate(client);
      const lastActivity = client.lastVisitAt || latestAppointment;
      return !lastActivity || lastActivity < cutoff;
    });
  }

  return clients
    .map((client) => ({
      client,
      revenue: getClientRevenue(client),
      visits: client.visitCount || client.Appointment.length,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits)
    .slice(0, 50)
    .map((entry) => entry.client);
}

export async function getClientsByIds(tenantId: string, clientIds: string[]) {
  const uniqueClientIds = Array.from(new Set(clientIds.filter((clientId) => typeof clientId === "string" && clientId.trim())));
  if (uniqueClientIds.length === 0) return [];

  return prisma.client.findMany({
    where: {
      tenantId,
      archivedAt: null,
      id: { in: uniqueClientIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      visitCount: true,
      lastVisitAt: true,
      Appointment: {
        where: {
          status: {
            in: ["COMPLETED", "CONFIRMED", "SCHEDULED"],
          },
        },
        select: {
          scheduledAt: true,
          status: true,
          Service: {
            select: {
              price: true,
            },
          },
        },
      },
    },
  });
}

export function getSendAddress(client: CampaignPreviewRecipient, channel: CampaignChannel) {
  if (channel === "EMAIL") return client.email?.trim() || "";
  return client.phone?.trim() || "";
}

export function renderCampaignBody(body: string, variables: RenderVariables) {
  const replacements: Record<string, string> = {
    firstName: variables.firstName?.trim() || "cliente",
    lastName: variables.lastName?.trim() || "",
    businessName: variables.businessName?.trim() || "votre institut",
    offer: variables.offer?.trim() || "-20%",
    bookingLink: variables.bookingLink?.trim() || "lien de reservation a venir",
  };

  return body.replace(/\{(firstName|lastName|businessName|offer|bookingLink)\}/g, (_, key: string) => replacements[key] || "");
}

export function buildCampaignPreview(params: {
  clients: CampaignPreviewRecipient[];
  template: MessageTemplate;
  channel: CampaignChannel;
  businessName: string;
}) {
  const sendable = params.clients.filter((client) => Boolean(getSendAddress(client, params.channel)));
  const example = sendable[0] || params.clients[0] || null;

  return {
    totalTargeted: params.clients.length,
    sendableCount: sendable.length,
    skippedCount: params.clients.length - sendable.length,
    exampleRecipients: sendable.slice(0, 3).map((client) => ({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      hasPhone: Boolean(client.phone?.trim()),
      hasEmail: Boolean(client.email?.trim()),
    })),
    renderedPreview: example
      ? renderCampaignBody(params.template.body, {
          firstName: example.firstName,
          lastName: example.lastName,
          businessName: params.businessName,
        })
      : "",
  };
}

function getClientRevenue(client: CampaignClient) {
  return client.Appointment.reduce((sum, appointment) => {
    return sum + Number(appointment.Service?.price || 0);
  }, 0);
}

function getLatestAppointmentDate(client: CampaignClient) {
  return client.Appointment.reduce<Date | null>((latest, appointment) => {
    if (!latest || appointment.scheduledAt > latest) return appointment.scheduledAt;
    return latest;
  }, null);
}

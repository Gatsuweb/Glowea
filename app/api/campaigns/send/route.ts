import { NextResponse } from "next/server";
import type { CampaignChannel, CampaignStatus, CampaignTargetSegment } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { getTenantId } from "../../../../lib/tenant";
import { getTenantSubscriptionAccess } from "../../../../lib/subscription";
import { sendSms } from "../../../../lib/twilio";
import {
  getBusinessName,
  getCampaignProviderMode,
  getCampaignTemplate,
  getSegmentClients,
  getSendAddress,
  renderCampaignBody,
} from "../../../../lib/campaigns";

const SEGMENTS: CampaignTargetSegment[] = ["ALL", "TOP_CLIENTS", "INACTIVE"];
const CHANNELS: CampaignChannel[] = ["SMS", "EMAIL", "MOCK"];

function isSegment(value: unknown): value is CampaignTargetSegment {
  return typeof value === "string" && SEGMENTS.includes(value as CampaignTargetSegment);
}

function isChannel(value: unknown): value is CampaignChannel {
  return typeof value === "string" && CHANNELS.includes(value as CampaignChannel);
}

function getCampaignStatus(sentCount: number, failedCount: number, skippedCount: number): CampaignStatus {
  if (sentCount > 0 && failedCount === 0) return "SENT";
  if (sentCount > 0 && (failedCount > 0 || skippedCount > 0)) return "PARTIAL";
  return "FAILED";
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const targetSegment = body.targetSegment;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";

    if (!isSegment(targetSegment) || !templateId) {
      return NextResponse.json(
        { success: false, error: "Cible ou template invalide" },
        { status: 400 }
      );
    }

    const template = await getCampaignTemplate(tenantId, templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template introuvable pour ce compte" },
        { status: 404 }
      );
    }

    const requestedChannel = isChannel(body.channel) ? body.channel : null;
    const channel = requestedChannel || (template.channel === "EMAIL" ? "EMAIL" : "SMS");
    const providerMode = getCampaignProviderMode(channel);
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);

    if (!subscriptionAccess.canUseProFeatures) {
      return NextResponse.json(
        { success: false, error: "Les campagnes sont reservees a la formule Pro" },
        { status: 403 }
      );
    }

    const [clients, businessName] = await Promise.all([
      getSegmentClients(tenantId, targetSegment),
      getBusinessName(tenantId),
    ]);

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune cliente ciblee" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        id: `camp_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        templateId: template.id,
        name: template.name,
        targetSegment,
        channel,
        customMessage: null,
        status: "DRAFT",
        recipientsCount: clients.length,
        updatedAt: new Date(),
      },
    });

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const client of clients) {
      const address = getSendAddress(client, channel);
      const renderedBody = renderCampaignBody(template.body, {
        firstName: client.firstName,
        lastName: client.lastName,
        businessName,
      });

      if (!address) {
        skippedCount += 1;
        await prisma.campaignRecipientLog.create({
          data: {
            id: `crl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            status: "SKIPPED",
            errorMessage: channel === "EMAIL" ? "Email manquant" : "Telephone manquant",
            updatedAt: new Date(),
          },
        });
        continue;
      }

      try {
        if (providerMode === "real" && channel === "SMS") {
          await sendSms({ to: address, body: renderedBody });
        } else {
          console.log("MOCK CAMPAIGN MESSAGE", {
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            to: address,
            body: renderedBody,
          });
        }

        sentCount += 1;
        await prisma.campaignRecipientLog.create({
          data: {
            id: `crl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            status: "SENT",
            sentAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        failedCount += 1;
        await prisma.campaignRecipientLog.create({
          data: {
            id: `crl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Erreur d'envoi inconnue",
            updatedAt: new Date(),
          },
        });
      }
    }

    const status = getCampaignStatus(sentCount, failedCount, skippedCount);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status,
        sentCount,
        failedCount,
        skippedCount,
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      status,
      recipientsCount: clients.length,
      sentCount,
      failedCount,
      skippedCount,
      providerMode,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      { success: false, error: "Impossible d'envoyer la campagne" },
      { status: 500 }
    );
  }
}

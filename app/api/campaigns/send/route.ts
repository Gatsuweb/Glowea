import { NextResponse } from "next/server";
import type { CampaignChannel, CampaignStatus, CampaignTargetSegment } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { getTenantId } from "../../../../lib/tenant";
import { getTenantSubscriptionAccess } from "../../../../lib/subscription";
import { getTwilioDiagnostics, normalizeSmsPhoneNumber, sendSms, toSmsSendError } from "../../../../lib/twilio";
import {
  getBusinessName,
  getCampaignProviderMode,
  getCampaignTemplate,
  getClientsByIds,
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

type RecipientError = {
  clientId: string;
  clientName: string;
  to: string;
  error: string;
};

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json() as Record<string, unknown>;
    const targetSegment = body.targetSegment;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const rawClientIds = Array.isArray(body.clientIds) ? body.clientIds : [];
    const clientIds = rawClientIds.filter((value: unknown): value is string => typeof value === "string");
    const resolvedTargetSegment = isSegment(targetSegment) ? targetSegment : "ALL";

    if ((!isSegment(targetSegment) && clientIds.length === 0) || !templateId) {
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
    const twilioDiagnostics = getTwilioDiagnostics();
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);

    console.info("[campaign:send] start", {
      tenantId,
      channel,
      smsProvider: twilioDiagnostics.smsProvider,
      resolvedProvider: twilioDiagnostics.resolvedProvider,
      providerMode,
      hasTwilioAccountSid: twilioDiagnostics.hasAccountSid,
      hasTwilioAuthToken: twilioDiagnostics.hasAuthToken,
      hasTwilioFromNumber: twilioDiagnostics.hasFromNumber,
      twilioFromNumber: twilioDiagnostics.fromNumber,
    });

    if (!subscriptionAccess.canUseApp) {
      return NextResponse.json(
        { success: false, error: "Un abonnement actif est necessaire pour envoyer une campagne" },
        { status: 403 }
      );
    }

    if (channel === "SMS" && !subscriptionAccess.canUseSms) {
      return NextResponse.json(
        { success: false, error: "Les campagnes SMS sont disponibles avec l'abonnement Pro." },
        { status: 403 }
      );
    }

    const [clients, businessName] = await Promise.all([
      clientIds.length > 0 ? getClientsByIds(tenantId, clientIds) : getSegmentClients(tenantId, resolvedTargetSegment),
      getBusinessName(tenantId),
    ]);

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune cliente ciblee" },
        { status: 400 }
      );
    }

    console.info("[campaign:send] recipients", {
      campaignTemplateId: template.id,
      targetSegment,
      recipientsCount: clients.length,
    });

    const campaign = await prisma.campaign.create({
      data: {
        id: `camp_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        templateId: template.id,
        name: clientIds.length > 0 ? `${template.name} - selection clientes` : template.name,
        targetSegment: clientIds.length > 0 ? "ALL" : resolvedTargetSegment,
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
    const recipientErrors: RecipientError[] = [];

    for (const client of clients) {
      const address = getSendAddress(client, channel);
      const renderedBody = renderCampaignBody(template.body, {
        firstName: client.firstName,
        lastName: client.lastName,
        businessName,
      });
      const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Cliente";

      if (!address) {
        skippedCount += 1;
        const errorMessage = channel === "EMAIL" ? "Email manquant" : "Telephone manquant";
        console.info("[campaign:send] recipient skipped", {
          campaignId: campaign.id,
          tenantId,
          clientId: client.id,
          clientName,
          channel,
          error: errorMessage,
        });
        await prisma.campaignRecipientLog.create({
          data: {
            id: `crl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            status: "SKIPPED",
            errorMessage,
            updatedAt: new Date(),
          },
        });
        continue;
      }

      try {
        const normalizedAddress = channel === "SMS" ? normalizeSmsPhoneNumber(address) : address;
        console.info("[campaign:send] recipient send attempt", {
          campaignId: campaign.id,
          tenantId,
          clientId: client.id,
          clientName,
          channel,
          smsProvider: twilioDiagnostics.smsProvider,
          providerMode,
          to: normalizedAddress,
          from: channel === "SMS" ? twilioDiagnostics.fromNumber : null,
          body: renderedBody,
        });

        if (providerMode === "real" && channel === "SMS") {
          const smsResult = await sendSms({ to: normalizedAddress, body: renderedBody });
          console.info("[campaign:send] twilio sent", {
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            to: smsResult.to,
            from: smsResult.from,
            sid: smsResult.sid,
          });
        } else {
          console.log("MOCK CAMPAIGN MESSAGE", {
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            to: normalizedAddress,
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
        const smsError = toSmsSendError(error);
        const errorMessage = smsError.userMessage;
        recipientErrors.push({
          clientId: client.id,
          clientName,
          to: address,
          error: errorMessage,
        });

        console.error("[campaign:send] recipient failed", {
          campaignId: campaign.id,
          tenantId,
          clientId: client.id,
          clientName,
          channel,
          to: address,
          from: channel === "SMS" ? twilioDiagnostics.fromNumber : null,
          body: renderedBody,
          errorCode: smsError.code,
          errorMessage: smsError.message,
          userMessage: smsError.userMessage,
          details: smsError.details,
        });

        await prisma.campaignRecipientLog.create({
          data: {
            id: `crl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            campaignId: campaign.id,
            tenantId,
            clientId: client.id,
            channel,
            status: "FAILED",
            errorMessage: errorMessage.slice(0, 500),
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
      recipientErrors,
      errorSummary: recipientErrors.length > 0 ? recipientErrors.map((item) => `${item.clientName}: ${item.error}`).join(" | ") : null,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      { success: false, error: "Impossible d'envoyer la campagne" },
      { status: 500 }
    );
  }
}

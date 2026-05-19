import { NextResponse } from "next/server";
import type { CampaignChannel, CampaignTargetSegment } from "@prisma/client";
import { getTenantId } from "../../../../lib/tenant";
import {
  buildCampaignPreview,
  getBusinessName,
  getCampaignProviderMode,
  getCampaignTemplate,
  getSegmentClients,
} from "../../../../lib/campaigns";

const SEGMENTS: CampaignTargetSegment[] = ["ALL", "TOP_CLIENTS", "INACTIVE"];
const CHANNELS: CampaignChannel[] = ["SMS", "EMAIL", "MOCK"];

function isSegment(value: unknown): value is CampaignTargetSegment {
  return typeof value === "string" && SEGMENTS.includes(value as CampaignTargetSegment);
}

function isChannel(value: unknown): value is CampaignChannel {
  return typeof value === "string" && CHANNELS.includes(value as CampaignChannel);
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
    const [clients, businessName] = await Promise.all([
      getSegmentClients(tenantId, targetSegment),
      getBusinessName(tenantId),
    ]);

    return NextResponse.json({
      success: true,
      channel,
      providerMode: getCampaignProviderMode(channel),
      ...buildCampaignPreview({
        clients,
        template,
        channel,
        businessName,
      }),
    });
  } catch (error) {
    console.error("Error previewing campaign:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de preparer l'aperçu" },
      { status: 500 }
    );
  }
}

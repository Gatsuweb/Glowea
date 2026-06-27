import { NextResponse } from "next/server";
import type { MessageChannel, MessageTemplateType } from "@prisma/client";
import prisma from "../../../../lib/prisma";
import { getTenantId } from "../../../../lib/tenant";
import { getTenantSubscriptionAccess } from "../../../../lib/subscription";
import { getCampaignTemplates } from "../../../../lib/campaigns";

const CHANNELS: MessageChannel[] = ["SMS", "EMAIL"];

function getTemplateType(channel: MessageChannel): MessageTemplateType {
  return channel === "EMAIL" ? "EMAIL" : "SMS";
}

function isTemplateChannel(value: unknown): value is MessageChannel {
  return typeof value === "string" && CHANNELS.includes(value as MessageChannel);
}

function normalizeTemplateInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const channel = isTemplateChannel(body.channel) ? body.channel : "SMS";

  if (!name) return { error: "Le nom du template est obligatoire" };
  if (!content) return { error: "Le contenu du template est obligatoire" };
  if (name.length > 120) return { error: "Le nom du template est trop long" };
  if (subject.length > 160) return { error: "L'objet est trop long" };
  if (content.length > 1200) return { error: "Le message est trop long" };

  return {
    data: {
      name,
      body: content,
      subject: channel === "EMAIL" ? subject || null : null,
      channel,
      type: getTemplateType(channel),
    },
  };
}

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);

    if (!subscriptionAccess.canUseApp) {
      return NextResponse.json(
        { success: false, error: "Un abonnement actif est necessaire pour acceder aux templates" },
        { status: 403 }
      );
    }

    const templates = await getCampaignTemplates(tenantId);

    return NextResponse.json({
      success: true,
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        type: template.type,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        isSystem: template.isSystem,
      })),
    });
  } catch (error) {
    console.error("Error loading campaign templates:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);
    if (!subscriptionAccess.canUseApp) {
      return NextResponse.json(
        { success: false, error: "Un abonnement actif est necessaire pour enregistrer un template" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = normalizeTemplateInput(body);

    if ("error" in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const template = await prisma.messageTemplate.create({
      data: {
        id: `tmpl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId,
        ...parsed.data,
        variablesJson: ["firstName", "lastName", "businessName", "offer", "bookingLink"],
        isSystem: false,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Error creating campaign template:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de creer le template" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId = await getTenantId();
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);
    if (!subscriptionAccess.canUseApp) {
      return NextResponse.json(
        { success: false, error: "Un abonnement actif est necessaire pour modifier un template" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const templateId = typeof body.id === "string" ? body.id : "";
    const parsed = normalizeTemplateInput(body);

    if (!templateId) {
      return NextResponse.json({ success: false, error: "Template invalide" }, { status: 400 });
    }

    if ("error" in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const existing = await prisma.messageTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Template introuvable pour ce compte" },
        { status: 404 }
      );
    }

    const template = await prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        ...parsed.data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Error updating campaign template:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de modifier le template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = await getTenantId();
    const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);
    if (!subscriptionAccess.canUseApp) {
      return NextResponse.json(
        { success: false, error: "Un abonnement actif est necessaire pour supprimer un template" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const templateId = typeof body?.id === "string" ? body.id : "";

    if (!templateId) {
      return NextResponse.json({ success: false, error: "Template invalide" }, { status: 400 });
    }

    const existing = await prisma.messageTemplate.findFirst({
      where: {
        id: templateId,
        tenantId,
        isSystem: false,
        isActive: true,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Template personnalisable introuvable pour ce compte" },
        { status: 404 }
      );
    }

    await prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign template:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de supprimer le template" },
      { status: 500 }
    );
  }
}

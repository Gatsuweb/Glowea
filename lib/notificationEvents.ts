import prisma from "./prisma";
import { sendPushToTenant } from "./push";

export async function notifyStockLowIfNeeded(params: {
  tenantId: string;
  productId: string;
  previousQuantity: number;
  nextQuantity: number;
}) {
  const product = await prisma.product.findFirst({
    where: {
      id: params.productId,
      tenantId: params.tenantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      alertThreshold: true,
    },
  });

  if (!product) return;

  const threshold = product.alertThreshold ? Number(product.alertThreshold) : 5;
  const crossedThreshold = params.previousQuantity > threshold && params.nextQuantity <= threshold;
  if (!crossedThreshold) return;

  const title = "Stock faible";
  const body = `${product.name} est passe sous le seuil bas (${params.nextQuantity}/${threshold}).`;

  await prisma.notification.create({
    data: {
      id: `not_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      tenantId: params.tenantId,
      type: "STOCK_ALERT",
      title,
      body,
    },
  });

  await sendPushToTenant(
    params.tenantId,
    {
      title,
      body,
      url: "/dashboard/stock",
      tag: `stock-low-${product.id}`,
      data: { productId: product.id },
    },
    { preferenceKey: "stockLowEnabled" }
  );
}

export async function notifyLoyalClientIfNeeded(params: {
  tenantId: string;
  clientId: string;
  appointmentWasAlreadyCompleted: boolean;
}) {
  if (params.appointmentWasAlreadyCompleted) return;

  const [client, completedAppointmentsCount] = await Promise.all([
    prisma.client.findFirst({
      where: {
        id: params.clientId,
        tenantId: params.tenantId,
        archivedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
      },
    }),
    prisma.appointment.count({
      where: {
        tenantId: params.tenantId,
        clientId: params.clientId,
        status: "COMPLETED",
      },
    }),
  ]);

  if (!client || completedAppointmentsCount !== 5) return;

  const clientName = client.fullName || `${client.firstName} ${client.lastName || ""}`.trim();
  const title = "Cliente fidele a remercier";
  const body = `${clientName} vient d'atteindre 5 rendez-vous termines.`;
  const notificationId = `not_loyal_${client.id}`;
  const created = await prisma.notification.createMany({
    data: [{
      id: notificationId,
      tenantId: params.tenantId,
      clientId: client.id,
      type: "MARKETING_INSIGHT",
      title,
      body,
    }],
    skipDuplicates: true,
  });

  if (created.count === 0) return;

  await sendPushToTenant(
    params.tenantId,
    {
      title,
      body,
      url: `/dashboard/clients?clientId=${encodeURIComponent(client.id)}`,
      tag: `loyal-client-${client.id}`,
      data: { clientId: client.id },
    },
    { preferenceKey: "loyalClientThanksEnabled" }
  );
}

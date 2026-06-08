import { auth, currentUser } from "@clerk/nextjs/server";
import AgendaClientWrapper from "../../components/AgendaClientWrapper";
import prisma from "../../../lib/prisma";

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

export default async function AgendaPage() {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";
  
  let user = null;
  if (!DEV_BYPASS_AUTH) {
    try {
      user = await currentUser();
    } catch (e) {
      console.error("Erreur Clerk ignorée:", e);
    }
  }

  void user;

  // Use the current user's tenant ID
  const { getTenantId } = await import("../../../lib/tenant");
  const tenantId = await getTenantId();
  const { userId } = await auth();

  // Fetch all appointments for the tenant, to be filtered on the client side
  // (In a real app, we'd fetch only the current month or week, and fetch more via an API route when changing weeks)
  const appointmentsData = await prisma.appointment.findMany({
    where: {
      tenantId,
    },
    include: {
      Client: true,
      Service: true,
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  const clientsData = await prisma.client.findMany({
    where: { tenantId },
    orderBy: { firstName: 'asc' },
  });

  const servicesData = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  const paymentSettings = userId
    ? await prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: {
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          paymentsEnabled: true,
          defaultDepositAmount: true,
          defaultDepositType: true,
        },
      })
    : null;

  // Serialize dates to avoid passing Date objects to client component
  const appointments = appointmentsData.map(app => ({
    id: app.id,
    scheduledAt: app.scheduledAt.toISOString(),
    endAt: app.endAt ? app.endAt.toISOString() : new Date(app.scheduledAt.getTime() + (app.Service?.durationMin || 60) * 60000).toISOString(),
    status: app.status,
    paymentStatus: app.paymentStatus,
    price: app.price,
    depositAmount: app.depositAmount,
    depositPaidAmount: app.depositPaidAmount,
    paidAmount: app.paidAmount,
    remainingAmount: app.remainingAmount,
    paymentMethod: app.paymentMethod,
    stripeCheckoutSessionId: app.stripeCheckoutSessionId,
    stripePaymentIntentId: app.stripePaymentIntentId,
    notes: app.notes || '',
    clientId: app.clientId,
    serviceId: app.serviceId || '',
    client: {
      id: app.Client?.id,
      name: `${app.Client?.firstName} ${app.Client?.lastName || ''}`.trim(),
      email: app.Client?.email || '',
      phone: app.Client?.phone || '',
    },
    service: {
      id: app.Service?.id || '',
      name: app.Service?.name || 'Prestation',
      durationMin: app.Service?.durationMin || 60,
      price: app.Service?.price ? Number(app.Service.price) : 0,
      color: app.Service?.color || 'var(--tertiary)',
    }
  }));
  const serializedAppointments = serializeValue(appointments);

  const clients = clientsData.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName || ''}`.trim(),
  }));

  const services = servicesData.map(s => ({
    id: s.id,
    name: s.name,
    price: s.price ? s.price.toString() : '0',
    durationMin: s.durationMin || 60,
  }));

  return (
    <AgendaClientWrapper 
      appointments={serializedAppointments} 
      clients={clients} 
      services={services} 
      paymentSettings={{
        stripeConnected: Boolean(paymentSettings?.stripeAccountId),
        stripeOnboardingComplete: Boolean(paymentSettings?.stripeOnboardingComplete),
        paymentsEnabled: Boolean(paymentSettings?.paymentsEnabled),
        defaultDepositAmount: Number(paymentSettings?.defaultDepositAmount || 0),
        defaultDepositType: paymentSettings?.defaultDepositType || "fixed",
      }}
    />
  );
}

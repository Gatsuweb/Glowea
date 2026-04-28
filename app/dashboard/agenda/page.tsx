import { currentUser } from "@clerk/nextjs/server";
import AgendaClientWrapper from "../../components/AgendaClientWrapper";
import prisma from "../../../lib/prisma";

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

  // Use the tenant from our seed for demo purposes
  const tenantId = "tenant_seed_123";

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

  // Serialize dates to avoid passing Date objects to client component
  const appointments = appointmentsData.map(app => ({
    id: app.id,
    scheduledAt: app.scheduledAt.toISOString(),
    endAt: app.endAt ? app.endAt.toISOString() : new Date(app.scheduledAt.getTime() + (app.Service?.durationMin || 60) * 60000).toISOString(),
    status: app.status,
    paymentStatus: app.paymentStatus,
    client: {
      id: app.Client?.id,
      name: `${app.Client?.firstName} ${app.Client?.lastName || ''}`.trim(),
      email: app.Client?.email || '',
      phone: app.Client?.phone || '',
    },
    service: {
      id: app.Service?.id,
      name: app.Service?.name || 'Prestation',
      durationMin: app.Service?.durationMin || 60,
      price: app.Service?.price ? Number(app.Service.price) : 0,
      color: app.Service?.color || 'var(--tertiary)',
    }
  }));

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
      appointments={appointments} 
      clients={clients} 
      services={services} 
    />
  );
}
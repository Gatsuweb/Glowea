import { currentUser } from "@clerk/nextjs/server";
import DashboardClientWrapper from "../components/DashboardClientWrapper";
import prisma from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";
  
  let user = null;
  if (!DEV_BYPASS_AUTH) {
    try {
      user = await currentUser();
    } catch (e) {
      console.error("Erreur Clerk ignorée:", e);
    }
  }

  const firstName = user?.firstName || "Sophie";
  const lastName = user?.lastName || "Doe";

  // Get start of today and end of today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Get start and end of current month
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999);

  // Use the tenant from our seed for demo purposes
  const tenantId = "tenant_seed_123";

  // Fetch today's appointments
  const todaysAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      Client: true,
      Service: true,
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  // Fetch this month's stats
  const monthAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      Service: true,
    }
  });

  const monthAppointmentsCount = monthAppointments.length;
  const monthRevenues = monthAppointments
    .filter(app => app.status === 'COMPLETED' || app.status === 'SCHEDULED') // For demo, let's include scheduled to show some revenue
    .reduce((sum, app) => sum + Number(app.Service?.price || 0), 0);

  // Fetch data for the last 7 days (Trend charts)
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const previousWeekStart = new Date(sevenDaysAgo);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const recentAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: { gte: sevenDaysAgo, lte: todayEnd },
      status: { not: 'CANCELED' }
    },
    include: { Service: true }
  });

  // Also fetch transactions for actual revenues
  const recentTransactions = await prisma.financialTransaction.findMany({
    where: {
      tenantId,
      transactionDate: { gte: sevenDaysAgo, lte: todayEnd },
      type: 'INCOME'
    }
  });

  const apptTrend = [];
  const revTrend = [];
  const daysShort = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

  let lastWeekRevenue = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayStr = daysShort[d.getDay()]; // e.g. "lun."

    // Count appointments for this specific day
    const dayAppts = recentAppointments.filter(
      a => new Date(a.scheduledAt).toDateString() === d.toDateString()
    );
    apptTrend.push({ name: dayStr, val: dayAppts.length });

    // Sum transactions for this specific day
    const dayRevs = recentTransactions.filter(
      t => new Date(t.transactionDate).toDateString() === d.toDateString()
    );
    // If we don't have enough transactions in the DB for the demo, we can fallback to appointment prices
    let dayRevTotal = dayRevs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Fallback for demo if transaction table is empty
    if (dayRevTotal === 0 && dayAppts.length > 0) {
      dayRevTotal = dayAppts.reduce((sum, a) => sum + Number(a.Service?.price || 0), 0);
    }
    
    revTrend.push({ name: dayStr, val: dayRevTotal });
    lastWeekRevenue += dayRevTotal;
  }

  // --- WEEKLY BRIEF DATA ---
  // 1. Birthdays this week
  const upcomingWeekEnd = new Date(todayStart);
  upcomingWeekEnd.setDate(upcomingWeekEnd.getDate() + 7);

  // We have to filter birthdays in JS because Prisma doesn't support easy day/month matching across years
  const allClients = await prisma.client.findMany({
    where: { tenantId }
  });

  const birthdaysThisWeek = allClients
    .filter(c => {
      if (!c.birthDate) return false;
      const bDay = new Date(c.birthDate);
      bDay.setFullYear(todayStart.getFullYear()); // Set to current year to compare
      // If the birthday already passed this year but is within next 7 days in next year (Dec-Jan edge case)
      if (bDay < todayStart) {
        bDay.setFullYear(todayStart.getFullYear() + 1);
      }
      return bDay >= todayStart && bDay <= upcomingWeekEnd;
    })
    .map(c => {
      const bDay = new Date(c.birthDate!);
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName || ''}`.trim(),
        date: bDay.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      };
    })
    .slice(0, 5); // Limit to 5 for UI

  // 2. Refills (Clients who came 3 to 4 weeks ago and have no future appointments)
  const threeWeeksAgoStart = new Date(todayStart);
  threeWeeksAgoStart.setDate(threeWeeksAgoStart.getDate() - 28); // 4 weeks ago
  const threeWeeksAgoEnd = new Date(todayStart);
  threeWeeksAgoEnd.setDate(threeWeeksAgoEnd.getDate() - 21); // 3 weeks ago

  const refillAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: { gte: threeWeeksAgoStart, lte: threeWeeksAgoEnd },
      status: 'COMPLETED'
    },
    include: {
      Client: {
        include: {
          Appointment: {
            where: { scheduledAt: { gte: todayStart } } // Future appointments
          }
        }
      },
      Service: true
    }
  });

  // Filter clients who have NO future appointments
  const clientsToRefill = refillAppointments
    .filter(app => app.Client && app.Client.Appointment.length === 0)
    .reduce((acc, app) => {
      // Deduplicate by client ID
      if (!acc.find(item => item.id === app.clientId)) {
        acc.push({
          id: app.clientId,
          name: `${app.Client.firstName} ${app.Client.lastName || ''}`.trim(),
          lastVisit: app.scheduledAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          serviceName: app.Service?.name || 'Prestation'
        });
      }
      return acc;
    }, [] as any[])
    .slice(0, 3); // Limit to 3 for UI

  const weeklyBriefData = {
    goal: {
      lastWeekRevenue,
      recommendedGoal: Math.round(lastWeekRevenue * 1.1) // +10%
    },
    birthdays: birthdaysThisWeek,
    refills: clientsToRefill
  };

  // Fetch top clients
  const clients = await prisma.client.findMany({
    where: { tenantId },
    include: {
      Appointment: {
        include: { Service: true }
      }
    }
  });

  const topClients = clients
    .map(client => {
      const visits = client.Appointment.length;
      const totalAmount = client.Appointment.reduce((sum, app) => sum + Number(app.Service?.price || 0), 0);
      return {
        id: client.id,
        name: `${client.firstName} ${client.lastName || ''}`.trim(),
        visits,
        totalAmount,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 3);

  // Format data for the client wrapper
  const formattedAppointments = todaysAppointments.map(app => {
    return {
      id: app.id,
      clientId: app.clientId,
      serviceId: app.serviceId,
      time: app.scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      clientName: `${app.Client?.firstName} ${app.Client?.lastName || ''}`.trim(),
      serviceName: app.Service?.name || 'Prestation',
      servicePrice: app.Service?.price ? Number(app.Service.price) : 0,
      status: app.status,
      isTomorrow: app.scheduledAt > todayEnd,
    };
  });

  // Fetch clients and services for NewAppointmentModal
  const clientsData = await prisma.client.findMany({
    where: { tenantId },
    orderBy: { firstName: 'asc' },
  });

  const servicesData = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  const modalClients = clientsData.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName || ''}`.trim(),
  }));

  const services = servicesData.map(s => ({
    id: s.id,
    name: s.name,
    price: s.price ? s.price.toString() : '0',
    durationMin: s.durationMin || 60,
  }));

  const productsData = await prisma.product.findMany({
    where: { tenantId },
    include: {
      ProductLot: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
    take: 3,
  });

  const products = productsData.map(p => {
    const lot = p.ProductLot[0];
    const count = lot ? Number(lot.quantityRemaining || 0) : 0;
    return {
      id: p.id,
      name: p.name,
      currentQuantity: count,
      idealQuantity: p.alertThreshold ? Number(p.alertThreshold) * 2 : 10,
    };
  });

  return (
    <DashboardClientWrapper 
      firstName={firstName} 
      lastName={lastName} 
      stats={{
        appointmentsMonth: monthAppointmentsCount,
        revenuesMonth: monthRevenues,
        objectiveCurrent: monthAppointmentsCount,
        objectiveTotal: 34,
        apptTrend,
        revTrend
      }}
      appointments={formattedAppointments}
      topClients={topClients}
      clients={modalClients}
      services={services}
      weeklyBriefData={weeklyBriefData}
      products={products}
    />
  );
}

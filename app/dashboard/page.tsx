import { currentUser } from "@clerk/nextjs/server";
import DashboardClientWrapper from "../components/DashboardClientWrapper";
import prisma from "../../lib/prisma";
import { getTenantSubscriptionAccess } from "../../lib/subscription";
import { syncCheckoutSessionById } from "../../lib/stripeSubscriptionSync";
import { getTenantOnboardingState } from "../actions/onboardingActions";

export const dynamic = "force-dynamic";

type InsightAction = "promo" | "brief" | "stock" | "appointment";

type SmartInsight = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  action: InsightAction;
  priority: number;
};

type RefillClient = {
  id: string;
  name: string;
  lastVisit: string;
  serviceName: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; session_id?: string }>;
}) {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";
  
  let user = null;
  if (!DEV_BYPASS_AUTH) {
    try {
      user = await currentUser();
    } catch (e) {
      console.error("Erreur Clerk ignorée:", e);
    }
  }

  // Get start of today and end of today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Get start and end of current month
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999);
  const previousMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
  const previousMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59, 999);

  // Use the current user's tenant ID
  const { getTenantId } = await import("../../lib/tenant");
  const tenantId = await getTenantId();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let checkoutSyncState: "activated" | "pending" | "error" | null = null;

  if (resolvedSearchParams.success === "true" && resolvedSearchParams.session_id) {
    try {
      const syncResult = await syncCheckoutSessionById(resolvedSearchParams.session_id, tenantId);
      checkoutSyncState = syncResult.synced && syncResult.status === "ACTIVE" ? "activated" : "pending";
    } catch (error) {
      console.error("[stripe:dashboard] checkout sync failed", error);
      checkoutSyncState = "error";
    }
  } else if (resolvedSearchParams.success === "true") {
    checkoutSyncState = "pending";
  }

  const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);
  const onboarding = await getTenantOnboardingState(tenantId);

  const [profileUser, profileTenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { BusinessSettings: true },
    }),
  ]);

  const clerkEmailName = user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "";
  const tenantDisplayName =
    profileTenant?.BusinessSettings?.displayName?.trim() ||
    profileTenant?.name?.replace(/^Espace de\s+/i, "").trim() ||
    "";
  const profileFullName = profileUser?.fullName?.trim() || "";
  const firstName =
    profileUser?.firstName?.trim() ||
    profileFullName.split(" ")[0] ||
    user?.firstName?.trim() ||
    tenantDisplayName ||
    clerkEmailName ||
    "Utilisateur";
  const lastName =
    profileUser?.lastName?.trim() ||
    profileFullName.split(" ").slice(1).join(" ") ||
    user?.lastName?.trim() ||
    "";

  // Fetch upcoming appointments for today and tomorrow
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: {
        gte: todayStart,
        lte: tomorrowEnd,
      },
    },
    include: {
      Client: {
        include: {
          ConsentDocument: {
            where: { documentType: "CONSENT" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      Service: true,
      AppointmentAttachment: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      ConsentDocument: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
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
  const projectedMonthRevenues = monthAppointments
    .filter(app => app.status === 'COMPLETED' || app.status === 'SCHEDULED') // For demo, let's include scheduled to show some revenue
    .reduce((sum, app) => sum + Number(app.Service?.price || 0), 0);

  const monthRevenueTransactions = await prisma.financialTransaction.findMany({
    where: {
      tenantId,
      transactionDate: { gte: monthStart, lte: monthEnd },
      type: 'INCOME'
    }
  });

  const previousMonthRevenueTransactions = await prisma.financialTransaction.findMany({
    where: {
      tenantId,
      transactionDate: { gte: previousMonthStart, lte: previousMonthEnd },
      type: 'INCOME'
    }
  });

  const transactionMonthRevenues = monthRevenueTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const previousMonthRevenues = previousMonthRevenueTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthRevenues = transactionMonthRevenues > 0 ? transactionMonthRevenues : projectedMonthRevenues;
  const revenueTrendPercent = previousMonthRevenues > 0
    ? Math.round(((monthRevenues - previousMonthRevenues) / previousMonthRevenues) * 100)
    : null;

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
    }, [] as RefillClient[])
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
  const formattedAppointments = upcomingAppointments.map(app => {
    const appointmentDocument = app.AppointmentAttachment[0]?.url
      || app.ConsentDocument[0]?.pdfUrl
      || app.Client?.ConsentDocument[0]?.pdfUrl
      || "";

    return {
      id: app.id,
      clientId: app.clientId,
      serviceId: app.serviceId,
      scheduledAt: app.scheduledAt.toISOString(),
      notes: app.notes || "",
      time: app.scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      clientName: `${app.Client?.firstName} ${app.Client?.lastName || ''}`.trim(),
      clientEmail: app.Client?.email || "",
      clientPhone: app.Client?.phone || "",
      serviceName: app.Service?.name || 'Prestation',
      servicePrice: app.Service?.price ? Number(app.Service.price) : 0,
      serviceDurationMin: app.Service?.durationMin || 60,
      documentUrl: appointmentDocument,
      hasDocument: Boolean(appointmentDocument),
      status: app.status,
      isTomorrow: app.scheduledAt > todayEnd,
      client: {
        id: app.Client?.id || app.clientId,
        name: `${app.Client?.firstName} ${app.Client?.lastName || ''}`.trim(),
      },
      service: {
        id: app.Service?.id || app.serviceId || "",
        name: app.Service?.name || "Prestation",
        price: app.Service?.price ? Number(app.Service.price) : 0,
        durationMin: app.Service?.durationMin || 60,
      },
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

  const tomorrowAppointmentsCount = await prisma.appointment.count({
    where: {
      tenantId,
      scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
    },
  });

  const lowStockProducts = products.filter((product) => {
    const alertLevel = product.idealQuantity / 2;
    return product.currentQuantity <= alertLevel;
  });

  const monthDayProgress = todayStart.getDate() / monthEnd.getDate();
  const objectiveProgress = monthAppointmentsCount / 34;
  const isObjectiveLate = monthDayProgress > 0.35 && objectiveProgress < monthDayProgress * 0.75;
  const bestRecentRevenueDay = revTrend.reduce(
    (best, day) => day.val > best.val ? day : best,
    { name: "", val: 0 }
  );

  const smartInsights = [
    tomorrowAppointmentsCount <= 1 && {
      id: "planning-tomorrow",
      title: "Planning a remplir demain",
      description: `Tu as ${tomorrowAppointmentsCount} rendez-vous demain. Une promo ciblee peut aider a remplir les creux.`,
      actionLabel: "Envoyer une promo",
      action: "promo",
      priority: 100,
    },
    clientsToRefill.length > 0 && {
      id: "refills",
      title: "Relances remplissage",
      description: `${clientsToRefill.length} cliente${clientsToRefill.length > 1 ? "s" : ""} sont dans la bonne fenetre de retour, sans futur rendez-vous.`,
      actionLabel: "Voir le brief",
      action: "brief",
      priority: 90,
    },
    lowStockProducts.length > 0 && {
      id: "stock",
      title: "Stock a surveiller",
      description: `${lowStockProducts[0].name} est proche du seuil bas. Anticipe avant tes prochains rendez-vous.`,
      actionLabel: "Gerer le stock",
      action: "stock",
      priority: 80,
    },
    birthdaysThisWeek.length > 0 && {
      id: "birthdays",
      title: "Occasion relation client",
      description: `${birthdaysThisWeek.length} anniversaire${birthdaysThisWeek.length > 1 ? "s" : ""} cette semaine. C'est le bon moment pour une attention personnalisee.`,
      actionLabel: "Envoyer une promo",
      action: "promo",
      priority: 70,
    },
    revenueTrendPercent !== null && revenueTrendPercent < 0 && {
      id: "revenue-drop",
      title: "Revenus en baisse",
      description: `Tes revenus sont a ${revenueTrendPercent}% vs le mois dernier. Priorise les clientes fideles et les prestations a panier eleve.`,
      actionLabel: "Envoyer une promo",
      action: "promo",
      priority: 60,
    },
    isObjectiveLate && {
      id: "objective",
      title: "Objectif en retard",
      description: `Tu es a ${Math.round(objectiveProgress * 100)}% de ton objectif alors que le mois est avance a ${Math.round(monthDayProgress * 100)}%.`,
      actionLabel: "Creer un RDV",
      action: "appointment",
      priority: 50,
    },
    bestRecentRevenueDay.val > 0 && {
      id: "best-day",
      title: "Jour fort repere",
      description: `${bestRecentRevenueDay.name} a genere ${Math.round(bestRecentRevenueDay.val)} euros recemment. Replique ce type de creneau ou d'offre.`,
      actionLabel: "Creer un RDV",
      action: "appointment",
      priority: 30,
    },
  ]
    .filter((insight): insight is SmartInsight => Boolean(insight))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  const insightData: SmartInsight[] = smartInsights.length > 0 ? smartInsights : [{
    id: "steady",
    title: "Activite stable",
    description: "Ton dashboard ne montre pas d'alerte prioritaire aujourd'hui. Profite-en pour planifier tes prochaines relances.",
    actionLabel: "Voir le brief",
    action: "brief",
    priority: 10,
  }];

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
        revTrend,
        revenueTrendPercent
      }}
      appointments={formattedAppointments}
      topClients={topClients}
      clients={modalClients}
      services={services}
      weeklyBriefData={weeklyBriefData}
      products={products}
      insights={insightData}
      subscriptionAccess={subscriptionAccess}
      checkoutSuccess={resolvedSearchParams.success === "true"}
      checkoutSyncState={checkoutSyncState}
      onboarding={onboarding}
    />
  );
}

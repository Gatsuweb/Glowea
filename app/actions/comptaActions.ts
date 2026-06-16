"use server";

import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";
import {
  COMPLETED_APPOINTMENT_STATUSES,
  getActiveStatsAppointmentWhere,
  isActiveStatsAppointment,
} from "../../lib/appointmentStatus";

type AmountLike = {
  amount: number | { toString(): string };
};

type TransactionType = "INCOME" | "EXPENSE";
type RecurringExpenseFrequencyValue = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

type TransactionLike = AmountLike & {
  id: string;
  label?: string | null;
  category?: string | null;
  type: TransactionType;
  transactionDate: Date | string;
};

type RecurringExpenseLike = AmountLike & {
  id: string;
  label: string;
  category?: string | null;
  frequency?: RecurringExpenseFrequencyValue;
};

type StockMovementLike = {
  id: string;
  quantity: number | { toString(): string };
  createdAt: Date;
  Product: {
    name: string;
    defaultUnitCost: number | { toString(): string } | null;
  };
};

type NormalizedTransactionLike = {
  id: string;
  label?: string | null;
  category?: string | null;
  amount: number;
  type: TransactionType;
  sourceType?: string | null;
  transactionDate: Date | string;
};

type NormalizedRecurringExpenseLike = {
  id: string;
  label: string;
  category?: string | null;
  amount: number;
  frequency?: RecurringExpenseFrequencyValue;
};

type NormalizedStockTransactionLike = {
  id: string;
  label: string;
  category: string;
  amount: number;
  type: "EXPENSE";
  sourceType: "STOCK";
  transactionDate: Date;
  isStock: true;
};

type NewClientStat = {
  id: string;
  name: string;
  firstService: string;
  firstVisitDate: Date;
};

type MonthlyTrendPoint = {
  label: string;
  value: number;
};

type CompletedAppointmentWithService = {
  id: string;
  scheduledAt: Date;
  endAt: Date | null;
  paidAmount: number | null;
  Service?: {
    durationMin: number | null;
  } | null;
};

function getMonthlyRecurringAmount(expense: { amount: number | { toString(): string }; frequency?: string | null }) {
  const amount = Number(expense.amount);

  if (expense.frequency === "WEEKLY") return amount * 52 / 12;
  if (expense.frequency === "QUARTERLY") return amount / 3;
  if (expense.frequency === "YEARLY") return amount / 12;

  return amount;
}

function getStockMovementAmount(movement: StockMovementLike) {
  return Number(movement.quantity) * Number(movement.Product.defaultUnitCost || 0);
}

function getAppointmentDurationHours(appointment: CompletedAppointmentWithService) {
  const durationMin = appointment.endAt
    ? Math.max((appointment.endAt.getTime() - appointment.scheduledAt.getTime()) / 60000, 0)
    : Number(appointment.Service?.durationMin || 60);

  return durationMin / 60;
}

export async function getVueEnsembleData(monthString: string) {

  const TENANT_ID = await getTenantId();
  try {
    const startDate = new Date(`${monthString}-01T00:00:00Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0, 23, 59, 59, 999);

    const rawTransactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: TENANT_ID,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    const rawPrevTransactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: TENANT_ID,
        transactionDate: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        }
      }
    });

    const rawRecurringExpenses = await prisma.recurringExpense.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        startDate: { lte: endDate },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } }
        ]
      }
    });

    const stockMovementsThisMonth = await prisma.stockMovement.findMany({
      where: {
        tenantId: TENANT_ID,
        type: 'IN',
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      },
      include: {
        Product: true
      }
    });

    const stockMovementsPrevMonth = await prisma.stockMovement.findMany({
      where: {
        tenantId: TENANT_ID,
        type: 'IN',
        createdAt: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        }
      },
      include: {
        Product: true
      }
    });

    // Parse decimals
    const dbTransactions: NormalizedTransactionLike[] = rawTransactions.map((t: TransactionLike) => ({
      id: t.id,
      label: t.label,
      category: t.category,
      amount: Number(t.amount),
      type: t.type,
      sourceType: (t as TransactionLike & { sourceType?: string | null }).sourceType || null,
      transactionDate: t.transactionDate,
    }));

    const stockTransactions: NormalizedStockTransactionLike[] = stockMovementsThisMonth.map((sm: StockMovementLike) => ({
      id: sm.id,
      label: `Achat stock: ${sm.Product.name}`,
      category: 'Matériel',
      amount: getStockMovementAmount(sm),
      type: "EXPENSE" as const,
      sourceType: "STOCK" as const,
      transactionDate: sm.createdAt,
      isStock: true as const,
    })).filter((st) => st.amount > 0);

    const transactions = [...dbTransactions, ...stockTransactions].sort((a, b) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );

    const dbPrevTransactions: NormalizedTransactionLike[] = rawPrevTransactions.map((t: TransactionLike) => ({
      id: t.id,
      label: t.label,
      category: t.category,
      amount: Number(t.amount),
      type: t.type,
      sourceType: (t as TransactionLike & { sourceType?: string | null }).sourceType || null,
      transactionDate: t.transactionDate,
    }));

    const stockPrevTransactions: NormalizedStockTransactionLike[] = stockMovementsPrevMonth.map((sm: StockMovementLike) => ({
      id: sm.id,
      label: `Achat stock: ${sm.Product.name}`,
      category: 'Matériel',
      amount: getStockMovementAmount(sm),
      type: "EXPENSE" as const,
      sourceType: "STOCK" as const,
      transactionDate: sm.createdAt,
      isStock: true as const,
    })).filter((st) => st.amount > 0);

    const prevTransactions = [...dbPrevTransactions, ...stockPrevTransactions];

    const recurringExpenses: NormalizedRecurringExpenseLike[] = rawRecurringExpenses.map((r: RecurringExpenseLike) => ({
      id: r.id,
      label: r.label,
      category: r.category,
      amount: getMonthlyRecurringAmount(r),
      frequency: r.frequency,
    }));

    return { success: true, data: { transactions, prevTransactions, recurringExpenses } };
  } catch (error) {
    console.error("Erreur getVueEnsembleData:", error);
    return { success: false, error: "Impossible de récupérer les données" };
  }
}

export async function createTransaction(data: {
  type: 'INCOME' | 'EXPENSE';
  label: string;
  amount: number;
  category?: string;
  date: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const transaction = await prisma.financialTransaction.create({
      data: {
        id: `ft_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenantId: TENANT_ID,
        type: data.type,
        sourceType: 'MANUAL',
        label: data.label,
        amount: data.amount,
        category: data.category || null,
        transactionDate: new Date(data.date),
        updatedAt: new Date()
      }
    });
    return { success: true, transaction };
  } catch (error) {
    console.error("Erreur createTransaction:", error);
    return { success: false, error: "Impossible de créer la transaction" };
  }
}

export async function getStatsData(monthString: string) {
  const TENANT_ID = await getTenantId();
  try {
    const startDate = new Date(`${monthString}-01T00:00:00Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0, 23, 59, 59, 999);
    const trendStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 5, 1));

    const appointmentsThisMonth = await prisma.appointment.findMany({
      where: {
        tenantId: TENANT_ID,
        scheduledAt: { gte: startDate, lte: endDate },
        ...getActiveStatsAppointmentWhere(),
      },
      include: {
        Client: true,
        Service: true,
      }
    });

    const appointmentsPrevMonth = await prisma.appointment.count({
      where: {
        tenantId: TENANT_ID,
        scheduledAt: { gte: prevMonthStart, lte: prevMonthEnd },
        ...getActiveStatsAppointmentWhere(),
      }
    });

    const completedAppointmentsAllTime = await prisma.appointment.findMany({
      where: {
        tenantId: TENANT_ID,
        status: { in: [...COMPLETED_APPOINTMENT_STATUSES] },
      },
      select: {
        clientId: true,
        scheduledAt: true,
        Client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        Service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const clientsForFollowUp = await prisma.client.findMany({
      where: {
        tenantId: TENANT_ID,
        archivedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        Appointment: {
          where: {
            ...getActiveStatsAppointmentWhere(),
          },
          select: {
            scheduledAt: true,
            status: true,
            price: true,
            Service: {
              select: {
                price: true,
              },
            },
          },
          orderBy: {
            scheduledAt: "desc",
          },
        },
      },
    });

    const incomeTransactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: TENANT_ID,
        transactionDate: { gte: startDate, lte: endDate },
        type: 'INCOME',
        sourceType: 'APPOINTMENT'
      },
      include: {
        Appointment: {
          include: {
            Client: true,
            Service: true
          }
        },
        Session: {
          include: {
            Client: true
          }
        }
      }
    });

    const monthlyTransactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: TENANT_ID,
        transactionDate: { gte: trendStart, lte: endDate },
      },
      select: {
        id: true,
        amount: true,
        type: true,
        transactionDate: true,
        sourceType: true,
        appointmentId: true,
      },
    });

    const monthlyStockMovements = await prisma.stockMovement.findMany({
      where: {
        tenantId: TENANT_ID,
        type: "IN",
        createdAt: { gte: trendStart, lte: endDate },
      },
      include: {
        Product: true,
      },
    });

    const monthlyAppointments = await prisma.appointment.findMany({
      where: {
        tenantId: TENANT_ID,
        scheduledAt: { gte: trendStart, lte: endDate },
        ...getActiveStatsAppointmentWhere(),
      },
      select: {
        scheduledAt: true,
        endAt: true,
        Service: {
          select: {
            durationMin: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const monthlyRecurringExpenses = await prisma.recurringExpense.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        startDate: { lte: endDate },
        OR: [
          { endDate: null },
          { endDate: { gte: trendStart } }
        ]
      },
      select: {
        amount: true,
        frequency: true,
        startDate: true,
        endDate: true,
      }
    });

    const rdvThisMonth = appointmentsThisMonth.length;
    const rdvPrevMonth = appointmentsPrevMonth;
    const rdvTrend = rdvPrevMonth > 0 ? rdvThisMonth - rdvPrevMonth : 0;
    const rdvTrendStr = rdvTrend > 0 ? `+${rdvTrend}` : `${rdvTrend}`;
    const totalRevenue = incomeTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const paidAppointmentKeys = new Set(
      incomeTransactions.map((transaction) => transaction.appointmentId || transaction.id)
    );
    const averageBasket = paidAppointmentKeys.size > 0 ? totalRevenue / paidAppointmentKeys.size : 0;

    const monthKeyFromDate = (date: Date) =>
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    const monthLabelFromDate = (date: Date) =>
      date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

    const monthlyBuckets = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(trendStart.getUTCFullYear(), trendStart.getUTCMonth() + index, 1));
      return {
        key: monthKeyFromDate(monthDate),
        label: monthLabelFromDate(monthDate),
        revenue: 0,
        appointmentRevenue: 0,
        expenses: 0,
        appointments: 0,
        paidAppointmentKeys: new Set<string>(),
      };
    });
    const monthlyBucketMap = new Map(monthlyBuckets.map((bucket) => [bucket.key, bucket]));

    monthlyTransactions.forEach((transaction) => {
      const key = monthKeyFromDate(new Date(transaction.transactionDate));
      const bucket = monthlyBucketMap.get(key);
      if (!bucket) return;
      const amount = Number(transaction.amount);
      if (transaction.type === "INCOME") {
        bucket.revenue += amount;
        if (transaction.sourceType === "APPOINTMENT") {
          bucket.appointmentRevenue += amount;
          bucket.paidAppointmentKeys.add(transaction.appointmentId || transaction.id);
        }
      }
      if (transaction.type === "EXPENSE") bucket.expenses += amount;
    });

    monthlyStockMovements.forEach((movement) => {
      const key = monthKeyFromDate(movement.createdAt);
      const bucket = monthlyBucketMap.get(key);
      if (!bucket) return;
      bucket.expenses += getStockMovementAmount(movement);
    });

    monthlyAppointments.forEach((appointment) => {
      const key = monthKeyFromDate(appointment.scheduledAt);
      const bucket = monthlyBucketMap.get(key);
      if (!bucket) return;
      bucket.appointments += 1;
    });

    const recurringExpenseValueByMonth = monthlyBuckets.map((bucket) => {
      const monthStart = new Date(Date.UTC(Number(bucket.key.slice(0, 4)), Number(bucket.key.slice(5, 7)) - 1, 1));
      const monthEnd = new Date(Date.UTC(Number(bucket.key.slice(0, 4)), Number(bucket.key.slice(5, 7)), 0, 23, 59, 59, 999));

      return monthlyRecurringExpenses.reduce((sum, expense) => {
        const startOk = expense.startDate <= monthEnd;
        const endOk = expense.endDate === null || expense.endDate >= monthStart;
        return startOk && endOk ? sum + getMonthlyRecurringAmount(expense) : sum;
      }, 0);
    });

    const monthlyBenefitTrend: MonthlyTrendPoint[] = monthlyBuckets.map((bucket, index) => ({
      label: bucket.label,
      value: bucket.revenue - bucket.expenses - recurringExpenseValueByMonth[index] - bucket.revenue * 0.212,
    }));

    const monthlyBasketTrend: MonthlyTrendPoint[] = monthlyBuckets.map((bucket) => ({
      label: bucket.label,
      value: bucket.paidAppointmentKeys.size > 0 ? bucket.appointmentRevenue / bucket.paidAppointmentKeys.size : 0,
    }));

    const firstAppointmentByClient = new Map<string, NewClientStat>();
    for (const appointment of completedAppointmentsAllTime) {
      if (firstAppointmentByClient.has(appointment.clientId)) continue;
      firstAppointmentByClient.set(appointment.clientId, {
        id: appointment.clientId,
        name: `${appointment.Client?.firstName || ""} ${appointment.Client?.lastName || ""}`.trim() || "Cliente",
        firstService: appointment.Service?.name || "Prestation",
        firstVisitDate: appointment.scheduledAt,
      });
    }

    const newClients = Array.from(firstAppointmentByClient.values())
      .filter((client) => client.firstVisitDate >= startDate && client.firstVisitDate <= endDate)
      .sort((a, b) => b.firstVisitDate.getTime() - a.firstVisitDate.getTime());
    const newClientsCount = newClients.length;

    const completedAppointmentsThisMonth = appointmentsThisMonth.filter((appointment) =>
      (COMPLETED_APPOINTMENT_STATUSES as readonly string[]).includes(appointment.status)
    );
    const completedAppointmentIds = new Set(completedAppointmentsThisMonth.map((appointment) => appointment.id));
    const completedHours = completedAppointmentsThisMonth.reduce(
      (sum, appointment) => sum + getAppointmentDurationHours(appointment),
      0
    );
    const completedTransactionRevenue = incomeTransactions
      .filter((transaction) => transaction.appointmentId && completedAppointmentIds.has(transaction.appointmentId))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const completedPaidAmountRevenue = completedAppointmentsThisMonth.reduce(
      (sum, appointment) => sum + Number(appointment.paidAmount || 0) / 100,
      0
    );
    const revenuePerHourRevenue = completedTransactionRevenue > 0
      ? completedTransactionRevenue
      : completedPaidAmountRevenue;
    const revenuePerHour = completedHours > 0 ? revenuePerHourRevenue / completedHours : 0;

    const prestationsMap: Record<string, number> = {};
    const clientsMap: Record<string, number> = {};
    const daysCount = [0, 0, 0, 0, 0, 0, 0];

    appointmentsThisMonth.forEach(app => {
      const dayOfWeek = new Date(app.scheduledAt).getDay(); // 0 = Sunday, 1 = Monday...
      daysCount[dayOfWeek]++;
    });

    incomeTransactions.forEach(t => {
      const amount = Number(t.amount);
      
      let serviceName = "Autre";
      if (t.Appointment?.Service?.name) {
        serviceName = t.Appointment.Service.name;
      } else if (t.category) {
        serviceName = t.category;
      } else if (t.label) {
        serviceName = t.label;
      }
      
      prestationsMap[serviceName] = (prestationsMap[serviceName] || 0) + amount;

      let clientName = null;
      if (t.Appointment?.Client) {
        clientName = `${t.Appointment.Client.firstName} ${t.Appointment.Client.lastName || ''}`.trim();
      } else if (t.Session?.Client) {
        clientName = `${t.Session.Client.firstName} ${t.Session.Client.lastName || ''}`.trim();
      }
      
      if (clientName) {
        clientsMap[clientName] = (clientsMap[clientName] || 0) + amount;
      }
    });

    const topPrestations = Object.entries(prestationsMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    const maxPrestationAmount = topPrestations.length > 0 ? topPrestations[0].amount : 1;

    const topClients = Object.entries(clientsMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    const maxClientAmount = topClients.length > 0 ? topClients[0].amount : 1;

    const maxDayCount = Math.max(...daysCount) || 1;

    const daysData = [
      { day: "L", count: daysCount[1] },
      { day: "M", count: daysCount[2] },
      { day: "M", count: daysCount[3] },
      { day: "J", count: daysCount[4] },
      { day: "V", count: daysCount[5] },
      { day: "S", count: daysCount[6] },
      { day: "D", count: daysCount[0] }
    ].map(d => {
      const ratio = d.count / maxDayCount;
      let level = "empty";
      if (d.count > 0) {
        if (ratio < 0.33) level = "low";
        else if (ratio < 0.66) level = "medium";
        else level = "high";
      }
      return { ...d, level };
    });

    // Calcul de la "Meilleure semaine" (découpage du mois en 5 semaines max)
    const weeklyTotals = [0, 0, 0, 0, 0];
    incomeTransactions.forEach(t => {
      const date = new Date(t.transactionDate);
      const day = date.getDate(); // 1 to 31
      const weekIndex = Math.min(4, Math.floor((day - 1) / 7));
      weeklyTotals[weekIndex] += Number(t.amount);
    });

    let bestWeekIndex = 0;
    let maxWeekAmount = weeklyTotals[0];
    for (let i = 1; i < weeklyTotals.length; i++) {
      if (weeklyTotals[i] > maxWeekAmount) {
        maxWeekAmount = weeklyTotals[i];
        bestWeekIndex = i;
      }
    }

    const meilleureSemaine = {
      label: `Semaine ${bestWeekIndex + 1}`,
      amount: `${maxWeekAmount.toFixed(2)} €`,
      chartData: weeklyTotals.map(val => ({ value: val }))
    };

    const now = new Date();
    const inactiveCutoff = new Date();
    inactiveCutoff.setDate(inactiveCutoff.getDate() - 42);

    const relanceCandidates = clientsForFollowUp
      .map((client) => {
        const upcomingAppointment = client.Appointment.find((appointment) =>
          !(COMPLETED_APPOINTMENT_STATUSES as readonly string[]).includes(appointment.status) &&
          isActiveStatsAppointment(appointment) &&
          new Date(appointment.scheduledAt) >= now
        );
        const lastCompletedAppointment = client.Appointment.find(
          (appointment) => (COMPLETED_APPOINTMENT_STATUSES as readonly string[]).includes(appointment.status)
        );

        if (upcomingAppointment || !lastCompletedAppointment) {
          return null;
        }

        const lastVisitDate = new Date(lastCompletedAppointment.scheduledAt);
        if (lastVisitDate >= inactiveCutoff) {
          return null;
        }

        const estimatedRevenue = Number(
          lastCompletedAppointment.price ??
            lastCompletedAppointment.Service?.price ??
            0
        );

        return {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          estimatedRevenue,
        };
      })
      .filter((client): client is NonNullable<typeof client> => Boolean(client))
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
      .slice(0, 12);

    const relancePotentialRevenue = relanceCandidates.reduce(
      (sum, client) => sum + client.estimatedRevenue,
      0
    );

    return { 
      success: true, 
      data: {
        rdvThisMonth,
        rdvTrendStr,
        averageBasket,
        revenuePerHour,
        revenuePerHourRevenue,
        revenuePerHourHours: completedHours,
        revenuePerHourAppointments: completedAppointmentsThisMonth.length,
        monthlyBenefitTrend,
        monthlyBasketTrend,
        topPrestations,
        maxPrestationAmount,
        topClients,
        maxClientAmount,
        daysData,
        meilleureSemaine,
        relanceCandidates,
        relancePotentialRevenue,
        newClientsCount,
        newClients: newClients.slice(0, 3).map((client) => ({
          id: client.id,
          name: client.name,
          firstService: client.firstService,
        })),
      }
    };

  } catch (error) {
    console.error("Erreur getStatsData:", error);
    return { success: false, error: "Impossible de récupérer les statistiques" };
  }
}


export async function createCharge(data: {
  label: string;
  amount: number;
  category?: string;
  isRecurring: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: string;
}) {
  const TENANT_ID = await getTenantId();
  try {
    if (data.isRecurring && data.frequency) {
      const recurring = await prisma.recurringExpense.create({
        data: {
          id: `re_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          tenantId: TENANT_ID,
          label: data.label,
          amount: data.amount,
          category: data.category || null,
          frequency: data.frequency,
          startDate: new Date(data.startDate),
          isActive: true,
          updatedAt: new Date()
        }
      });
      return { success: true, charge: recurring };
    } else {
      const transaction = await prisma.financialTransaction.create({
        data: {
          id: `ft_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          tenantId: TENANT_ID,
          type: 'EXPENSE',
          sourceType: 'MANUAL',
          label: data.label,
          amount: data.amount,
          category: data.category || null,
          transactionDate: new Date(data.startDate),
          updatedAt: new Date()
        }
      });
      return { success: true, charge: transaction };
    }
  } catch (error) {
    console.error("Erreur createCharge:", error);
    return { success: false, error: "Impossible de créer la charge" };
  }
}

"use server";

import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";

type AmountLike = {
  amount: number | { toString(): string };
};

type TransactionType = "INCOME" | "EXPENSE";

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
      amount: Number(sm.quantity) * Number(sm.Product.defaultUnitCost || 0),
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
      amount: Number(sm.quantity) * Number(sm.Product.defaultUnitCost || 0),
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
      amount: Number(r.amount),
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

    const appointmentsThisMonth = await prisma.appointment.findMany({
      where: {
        tenantId: TENANT_ID,
        scheduledAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELED', 'NO_SHOW'] }
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
        status: { notIn: ['CANCELED', 'NO_SHOW'] }
      }
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

    const rdvThisMonth = appointmentsThisMonth.length;
    const rdvPrevMonth = appointmentsPrevMonth;
    const rdvTrend = rdvPrevMonth > 0 ? rdvThisMonth - rdvPrevMonth : 0;
    const rdvTrendStr = rdvTrend > 0 ? `+${rdvTrend}` : `${rdvTrend}`;

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

    return { 
      success: true, 
      data: {
        rdvThisMonth,
        rdvTrendStr,
        topPrestations,
        maxPrestationAmount,
        topClients,
        maxClientAmount,
        daysData,
        meilleureSemaine
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

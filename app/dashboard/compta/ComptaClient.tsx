"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import styles from "./compta.module.css";
import SparkBarChart from "../../components/SparkBarChart";
import { getVueEnsembleData, createTransaction, createCharge, getStatsData } from "../../actions/comptaActions";
import { exportElementToPDF } from "../../../lib/exportUtils";
import SendClientTemplateModal from "../../components/SendClientTemplateModal";

type TransactionType = "INCOME" | "EXPENSE";

type TransactionItem = {
  id: string;
  label?: string | null;
  category?: string | null;
  amount: number;
  type: TransactionType;
  sourceType?: string | null;
  transactionDate: string | Date;
};

type RecurringExpenseItem = {
  id: string;
  label: string;
  category?: string | null;
  amount: number;
};

type VueEnsembleData = {
  transactions: TransactionItem[];
  prevTransactions: TransactionItem[];
  recurringExpenses: RecurringExpenseItem[];
};

type StatAmountItem = {
  name: string;
  amount: number;
};

type DayStat = {
  day: string;
  count: number;
  level: string;
};

type RelanceCandidate = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  estimatedRevenue: number;
};

type NewClientItem = {
  id: string;
  name: string;
  firstService: string;
};

type TrendPoint = {
  label: string;
  value: number;
};

type StatsData = {
  rdvThisMonth: number;
  rdvTrendStr: string;
  averageBasket: number;
  revenuePerHour: number;
  revenuePerHourRevenue: number;
  revenuePerHourHours: number;
  revenuePerHourAppointments: number;
  monthlyBenefitTrend: TrendPoint[];
  monthlyBasketTrend: TrendPoint[];
  topPrestations: StatAmountItem[];
  maxPrestationAmount: number;
  topClients: StatAmountItem[];
  maxClientAmount: number;
  daysData: DayStat[];
  meilleureSemaine: {
    label: string;
    amount: string;
    chartData: Array<{ value: number }>;
  };
  relanceCandidates: RelanceCandidate[];
  relancePotentialRevenue: number;
  newClientsCount: number;
  newClients: NewClientItem[];
};

type DisplayTransaction = {
  id: string;
  name: string;
  details: string;
  amount: string;
  rawAmount: number;
  type: "revenus" | "depenses";
  date: Date;
};

export default function ComptaClient({
  initialData,
  initialStatsData,
  currentMonth,
  isReadOnlyAccess = false,
  readOnlyMessage = "Votre abonnement n'est plus actif. Vous pouvez consulter vos donnees, mais les actions sont desactivees.",
}: {
  initialData: VueEnsembleData;
  initialStatsData: StatsData | null;
  currentMonth: string;
  isReadOnlyAccess?: boolean;
  readOnlyMessage?: string;
}) {
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState("vue"); // "vue", "stats", "simulation"
  const [data, setData] = useState(initialData);
  const [statsData, setStatsData] = useState<StatsData | null>(initialStatsData);

  // States pour les Modales de Création
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isRelanceModalOpen, setRelanceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readOnlyError, setReadOnlyError] = useState<string | null>(null);

  // Form states Transaction
  const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [transLabel, setTransLabel] = useState("");
  const [transAmount, setTransAmount] = useState("");
  const [transDate, setTransDate] = useState(new Date().toISOString().slice(0, 10));

  // Form states Charge
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [chargeIsRecurring, setChargeIsRecurring] = useState(false);
  const [chargeFrequency, setChargeFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

  const refreshData = useCallback(async () => {
    const res = await getVueEnsembleData(filterMonth);
    if (res.success && res.data) {
      setData(res.data);
    }
    const statsRes = await getStatsData(filterMonth);
    if (statsRes.success && statsRes.data) {
      setStatsData(statsRes.data);
    }
  }, [filterMonth]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (filterMonth !== currentMonth) {
        void refreshData();
      } else {
        setData(initialData);
        setStatsData(initialStatsData);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [filterMonth, currentMonth, initialData, initialStatsData, refreshData]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyAccess) {
      setReadOnlyError(readOnlyMessage);
      return;
    }

    setIsSubmitting(true);
    const res = await createTransaction({
      type: transType,
      label: transLabel,
      amount: parseFloat(transAmount),
      date: transDate
    });
    if (res.success) {
      setIsTransactionModalOpen(false);
      setTransLabel("");
      setTransAmount("");
      refreshData();
    } else {
      alert("Erreur lors de la création de la transaction");
    }
    setIsSubmitting(false);
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyAccess) {
      setReadOnlyError(readOnlyMessage);
      return;
    }

    setIsSubmitting(true);
    const res = await createCharge({
      label: chargeLabel,
      amount: parseFloat(chargeAmount),
      isRecurring: chargeIsRecurring,
      frequency: chargeIsRecurring ? chargeFrequency : undefined,
      startDate: chargeDate
    });
    if (res.success) {
      setIsChargeModalOpen(false);
      setChargeLabel("");
      setChargeAmount("");
      setChargeIsRecurring(false);
      refreshData();
    } else {
      alert("Erreur lors de la création de la charge");
    }
    setIsSubmitting(false);
  };

  const incomeTransactions = data.transactions
    .filter((t: TransactionItem) => t.type === "INCOME");
  const appointmentIncomeTransactions = incomeTransactions
    .filter((t: TransactionItem) => t.sourceType === "APPOINTMENT");
  const caMois = incomeTransactions
    .reduce((sum: number, t: TransactionItem) => sum + t.amount, 0);
  const prevCA = data.prevTransactions
    .filter((t: TransactionItem) => t.type === "INCOME")
    .reduce((sum: number, t: TransactionItem) => sum + t.amount, 0);
  const caTrend = prevCA > 0 ? ((caMois - prevCA) / prevCA) * 100 : 0;
  const caTrendStr = caTrend >= 0 ? `+${caTrend.toFixed(1)}%` : `${caTrend.toFixed(1)}%`;

  const chargesRecurrentes = data.recurringExpenses.reduce(
    (sum: number, r: RecurringExpenseItem) => sum + r.amount,
    0,
  );
  const chargesMateriels = data.transactions
    .filter((t: TransactionItem) => t.type === "EXPENSE")
    .reduce((sum: number, t: TransactionItem) => sum + t.amount, 0);
  const totalCharges = chargesRecurrentes + chargesMateriels;

  // States pour le Simulateur
  const actualRdv = statsData?.rdvThisMonth || 0;
  const actualAverageBasket = statsData?.averageBasket ?? (actualRdv > 0
    ? appointmentIncomeTransactions.reduce((sum: number, t: TransactionItem) => sum + t.amount, 0) / actualRdv
    : 0);
  const actualRevenuePerHour = statsData?.revenuePerHour ?? 0;
  const revenuePerHourRevenue = statsData?.revenuePerHourRevenue ?? 0;
  const revenuePerHourHours = statsData?.revenuePerHourHours ?? 0;
  const revenuePerHourAppointments = statsData?.revenuePerHourAppointments ?? 0;

  const [simObjRevenu, setSimObjRevenu] = useState("2000");
  const [simObjCharges, setSimObjCharges] = useState(totalCharges.toString());
  
  // State pour la Section Bilan
  const [isBilanExpanded, setIsBilanExpanded] = useState(false);

  const [simTarif, setSimTarif] = useState(actualAverageBasket);
  const [simRdv, setSimRdv] = useState(actualRdv);
  const [simCharges, setSimCharges] = useState(totalCharges);
  const simRdvMax = Math.max(300, actualRdv + 50);

  // Synchroniser le simulateur si les données réelles changent (changement de mois par ex)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSimObjCharges(totalCharges.toString());
      setSimTarif(actualAverageBasket);
      setSimRdv(actualRdv);
      setSimCharges(totalCharges);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [totalCharges, actualAverageBasket, actualRdv]);

  const urssafRate = 0.212; // 21.2% URSSAF
  const simulatedCA = simTarif * simRdv;
  const simulatedBeneficeBrut = simulatedCA - simCharges;
  const simulatedUrssaf = simulatedCA * urssafRate;
  const simulatedNet = simulatedBeneficeBrut - simulatedUrssaf;

  // Calcul du nombre de RDV requis pour l'objectif: RDV = (Obj Net + Obj Charges) / (Tarif * (1 - 0.212))
  const netParRdv = simTarif * (1 - urssafRate);
  const requiredRdv = netParRdv > 0 ? Math.ceil((Number(simObjRevenu) + Number(simObjCharges)) / netParRdv) : 0;

  const monthStart = new Date(`${filterMonth}-01T00:00:00Z`);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const bucketCount = 6;
  const bucketWidth = Math.max(1, Math.ceil(daysInMonth / bucketCount));
  const incomeBuckets = Array.from({ length: bucketCount }, () => ({ revenue: 0, count: 0 }));

  data.transactions
    .filter((transaction) => transaction.type === "INCOME")
    .forEach((transaction) => {
      const date = new Date(transaction.transactionDate);
      const bucketIndex = Math.min(bucketCount - 1, Math.floor((date.getDate() - 1) / bucketWidth));
      incomeBuckets[bucketIndex].revenue += Number(transaction.amount || 0);
      incomeBuckets[bucketIndex].count += 1;
    });

  const chartData1 = (statsData?.monthlyBenefitTrend && statsData.monthlyBenefitTrend.length > 0
    ? statsData.monthlyBenefitTrend
    : incomeBuckets.map((bucket, index) => ({ label: `Bloc ${index + 1}`, value: bucket.revenue }))
  );
  const chartData2 = (statsData?.monthlyBasketTrend && statsData.monthlyBasketTrend.length > 0
    ? statsData.monthlyBasketTrend
    : incomeBuckets.map((bucket, index) => ({ label: `Bloc ${index + 1}`, value: bucket.count > 0 ? bucket.revenue / bucket.count : 0 }))
  );

  const urssafTax = caMois * urssafRate;
  const beneficeNet = caMois - totalCharges - urssafTax;
  const benefitTopValue = statsData?.monthlyBenefitTrend?.at(-1)?.value ?? beneficeNet;
  const newClientsCount = statsData?.newClientsCount ?? 0;
  const newClients = statsData?.newClients ?? [];
  const recurringChargesMax = chargesRecurrentes > 0 ? chargesRecurrentes : 1;
  const materialChargesMax = chargesMateriels > 0 ? chargesMateriels : 1;

  const mappedTransactions: DisplayTransaction[] = data.transactions.map((t: TransactionItem) => ({
    id: t.id,
    name: t.label || "Transaction",
    details: `${t.category || ''} - ${new Date(t.transactionDate).toLocaleDateString()}`,
    amount: t.type === 'INCOME' ? `+${t.amount}` : `-${t.amount}`,
    rawAmount: t.amount,
    type: t.type === 'INCOME' ? 'revenus' : 'depenses',
    date: new Date(t.transactionDate)
  }));

  const mappedRecurring: DisplayTransaction[] = data.recurringExpenses.map((r: RecurringExpenseItem) => ({
    id: r.id,
    name: `${r.label} (Récurrent)`,
    details: `${r.category || 'Charge fixe'} - Mensuel`,
    amount: `-${r.amount}`,
    rawAmount: r.amount,
    type: 'depenses',
    date: new Date(`${filterMonth}-01T00:00:00Z`)
  }));

  const allTransactions = [...mappedTransactions, ...mappedRecurring].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const filteredTransactions = allTransactions.filter((t: DisplayTransaction) => {
    const matchType = filterType === "all" || t.type === filterType;
    return matchType;
  });

  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const displayMonth = monthFormatter.format(new Date(`${filterMonth}-01`));
  const relanceCandidates = statsData?.relanceCandidates || [];
  const relancePotentialRevenue = statsData?.relancePotentialRevenue || 0;
  const relanceBannerText =
    relanceCandidates.length > 0
      ? relanceCandidates.length === 1
        ? `1 cliente n'a pas repris RDV depuis plus de 6 semaines. Une relance personnalisée pourrait récupérer ~${Math.round(relancePotentialRevenue)}EUR de CA.`
        : `${relanceCandidates.length} clientes n'ont pas repris RDV depuis plus de 6 semaines. Une relance personnalisée pourrait récupérer ~${Math.round(relancePotentialRevenue)}EUR de CA.`
      : "Aucune cliente à relancer pour le moment.";

  return (
    <main className={styles.layout}>
      <h1 className={styles.title}>Ma Compta</h1>

      {(isReadOnlyAccess || readOnlyError) && (
        <div className={styles.statusBanner || styles.card} role="alert">
          {readOnlyError || readOnlyMessage}
        </div>
      )}

      {/* Bilan Section Dynamique */}
      <section className={styles.bilanDynamicSection} id="compta-export-container">
        <div className={styles.bilanDynamicHeader} onClick={() => setIsBilanExpanded(!isBilanExpanded)}>
          <div className={styles.bilanDynamicTitleGroup}>
            <h2 className={styles.bilanTitle}>Bilan financier mensuel</h2>
            <span className={styles.bilanSubtitle}>{displayMonth}</span>
          </div>
          <div className={styles.bilanHeaderActions}>
            <button 
              className={`${styles.btnExpand} ${styles.btnDownload}`} 
              data-html2canvas-ignore="true"
              onClick={(e) => {
                e.stopPropagation();
                if (!isBilanExpanded) {
                  setIsBilanExpanded(true);
                  setTimeout(() => {
                    exportElementToPDF('compta-export-container', `bilan_comptable_${displayMonth.replace(' ', '_')}`, 'portrait');
                  }, 200);
                } else {
                  exportElementToPDF('compta-export-container', `bilan_comptable_${displayMonth.replace(' ', '_')}`, 'portrait');
                }
              }}
              title="Télécharger le bilan"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Télécharger
            </button>
            <button className={styles.btnExpand} data-html2canvas-ignore="true">
              {isBilanExpanded ? 'Masquer le bilan' : 'Afficher le bilan détaillé'}
            </button>
          </div>
        </div>

        {isBilanExpanded && (
          <div className={styles.bilanDynamicContent}>
            {/* Ligne Principale : Bénéfice */}
            <div className={styles.bilanDynamicHero}>
              <div className={styles.heroMain}>
                <p>
                  Bénéfice Net (Ce qui va dans ta poche
                  <svg className={styles.heroInlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>)
                </p>
                <h3>{beneficeNet.toFixed(2)} €</h3>
              </div>
              <div className={styles.heroSecondary}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}><svg className={styles.heroStatIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg> CA Brut</span>
                  <strong>{caMois.toFixed(2)} €</strong>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}><svg className={styles.heroStatIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> Total Charges</span>
                  <strong>- {totalCharges.toFixed(2)} €</strong>
                </div>
              </div>
            </div>

            {/* Grille de stats comptables avancées */}
            <div className={styles.bilanDynamicGrid}>
              <div className={styles.bilanDynamicCard}>
                <span className={styles.dynIcon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--tertiary)"}}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></span>
                <div className={styles.dynInfo}>
                  <span className={styles.dynValue}>
                    {caMois > 0 ? ((beneficeNet / caMois) * 100).toFixed(1) : 0} %
                  </span>
                  <span className={styles.dynLabel}>Marge Nette</span>
                </div>
              </div>
              <div className={styles.bilanDynamicCard}>
                <span className={styles.dynIcon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--tertiary)"}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
                <div className={styles.dynInfo}>
                  <span className={styles.dynValue}>
                    {actualAverageBasket > 0 ? Math.ceil(totalCharges / actualAverageBasket) : 0} RDV
                  </span>
                  <span className={styles.dynLabel}>Seuil de rentabilité (RDV pour payer les charges)</span>
                </div>
              </div>
              <div className={styles.bilanDynamicCard}>
                <span className={styles.dynIcon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--tertiary)"}}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg></span>
                <div className={styles.dynInfo}>
                  <span className={styles.dynValue}>
                    {(beneficeNet > 0 ? beneficeNet / 20 : 0).toFixed(2)} €
                  </span>
                  <span className={styles.dynLabel}>Revenu net journalier (sur 20j)</span>
                </div>
              </div>
              <div className={styles.bilanDynamicCard}>
                <span className={styles.dynIcon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--tertiary)"}}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
                <div className={styles.dynInfo}>
                  <span className={styles.dynValue}>{actualAverageBasket.toFixed(2)} €</span>
                  <span className={styles.dynLabel}>Panier Moyen Actuel</span>
                </div>
              </div>
            </div>

            {/* Détail analytique */}
            <div className={styles.bilanDynamicDetails}>
              <h4>Détail Analytique</h4>
              <div className={styles.dynDetailsGrid}>
                <div className={styles.dynDetailCol}>
                  <h5>Répartition des Charges</h5>
                  <div className={styles.dynRow}>
                    <span>Frais Fixes (Loyer, Assurances...)</span>
                    <span>{chargesRecurrentes.toFixed(2)} €</span>
                  </div>
                  <div className={styles.dynRow}>
                    <span>Matériel & Consommables</span>
                    <span>{chargesMateriels.toFixed(2)} €</span>
                  </div>
                  <div className={styles.dynRow}>
                    <span><strong>Total Charges</strong></span>
                    <span><strong>{totalCharges.toFixed(2)} €</strong></span>
                  </div>
                </div>
                <div className={styles.dynDetailCol}>
                  <h5>Taxes & Prélèvements</h5>
                  <div className={styles.dynRow}>
                    <span>URSSAF (21.2% du CA)</span>
                    <span className={styles.negative}>- {urssafTax.toFixed(2)} €</span>
                  </div>
                  <div className={`${styles.dynRow} ${styles.dynRowResult}`}>
                    <span><strong>Résultat Final</strong></span>
                    <span className={styles.positive}><strong>{beneficeNet.toFixed(2)} €</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'vue' ? styles.tabActive : styles.tabInactive}`}
          onClick={() => setActiveTab('vue')}
        >
          Vue d&apos;ensemble
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : styles.tabInactive}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'simulation' ? styles.tabActive : styles.tabInactive}`}
          onClick={() => setActiveTab('simulation')}
        >
          Simulateur
        </button>
      </div>

      {activeTab === 'stats' && statsData && (
        <>
          <section className={styles.statsGridStats3}>
            {/* Card 1: RDV du mois */}
            <div className={`${styles.statCard} ${styles.caCard}`}>
              <div className={styles.caDecor}>
                <span>- $ -</span>
              </div>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>RDV <span>du mois</span></div>
                  <div className={styles.statSubtitle}>{new Date(filterMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
                </div>
              </div>
              <div className={styles.statBigText}>
                {statsData.rdvThisMonth} <span className={styles.statTrend}>{statsData.rdvTrendStr} SUR LE MOIS DERNIER</span>
              </div>
            </div>

            {/* Card 2: Top prestations */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitle}>Top prestations</div>
              </div>
              <div className={styles.statList}>
                {statsData.topPrestations.map((p: StatAmountItem, i: number) => (
                  <div className={styles.statListItem} key={i}>
                    <span className={styles.statListLabel}>{p.name} :</span>
                    <div className={styles.statListBar}>
                      <div className={styles.statListBarFill} style={{ width: `${(p.amount / statsData.maxPrestationAmount) * 100}%` }}></div>
                    </div>
                    <span className={styles.statListValue}>{p.amount} €</span>
                  </div>
                ))}
                {statsData.topPrestations.length === 0 && (
                  <div className={styles.statListItem}>
                    <span className={styles.statListLabel}>Aucune donnée</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Top clients */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitle}>Top clients</div>
              </div>
              <div className={styles.statList}>
                {statsData.topClients.map((c: StatAmountItem, i: number) => (
                  <div className={styles.statListItem} key={i}>
                    <span className={styles.statListLabel}>{c.name}</span>
                    <div className={styles.statListBar}>
                      <div className={styles.statListBarFill} style={{ width: `${(c.amount / statsData.maxClientAmount) * 100}%` }}></div>
                    </div>
                    <span className={styles.statListValue}>{c.amount} €</span>
                  </div>
                ))}
                {statsData.topClients.length === 0 && (
                  <div className={styles.statListItem}>
                    <span className={styles.statListLabel}>Aucune donnée</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.statsGridStats2}>
            {/* Card 4: Meilleure semaine */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Meilleure <span>semaine</span></div>
                  <div className={styles.statSubtitle}>{statsData.meilleureSemaine.label} - {statsData.meilleureSemaine.amount}</div>
                </div>
              </div>
              <div className={`${styles.chartContainer} ${styles.bestWeekChart}`}>
                <SparkBarChart data={statsData.meilleureSemaine.chartData} color="#FCD7D1" />
              </div>
            </div>

            {/* Card 5: Revenu a l'heure */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Revenu &agrave; l&apos;heure</div>
                  <div className={styles.statSubtitle}>RDV termin&eacute;s encaiss&eacute;s</div>
                </div>
              </div>
              <div className={styles.statBigText}>
                {actualRevenuePerHour.toFixed(2)} <span>&euro;/h</span>
              </div>
              <div className={styles.hourlyDetails}>
                {revenuePerHourHours > 0 ? (
                  <>
                    <span>{revenuePerHourRevenue.toFixed(2)} &euro; encaiss&eacute;s</span>
                    <span>{revenuePerHourHours.toFixed(1)} h termin&eacute;es</span>
                    <span>{revenuePerHourAppointments} RDV termin&eacute;s</span>
                  </>
                ) : (
                  <span>Aucun RDV termin&eacute; sur ce mois</span>
                )}
              </div>
            </div>
          </section>

          {/* Card 6: Meilleur jour de la semaine */}
          <section className={styles.statsGridWide}>
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitle}>Meilleur jour de la semaine</div>
              </div>
              <div className={styles.dayBlocksContainer}>
                {statsData.daysData.map((d: DayStat, index: number) => (
                  <div key={index} className={styles.dayColumn}>
                    <div 
                      className={`${styles.dayBlock} ${styles[d.level]}`}
                      title={`${d.count} RDV`}
                    >
                    </div>
                    <span className={styles.dayLabel}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div className={styles.heatmapLegend}>
                <span className={styles.legendText}>Moins</span>
                <div className={`${styles.legendBox} ${styles.empty}`}></div>
                <div className={`${styles.legendBox} ${styles.low}`}></div>
                <div className={`${styles.legendBox} ${styles.medium}`}></div>
                <div className={`${styles.legendBox} ${styles.high}`}></div>
                <span className={styles.legendText}>Plus de RDV</span>
              </div>
            </div>
          </section>

          {/* Alert Banner */}
          <section className={styles.alertBanner}>
            <div className={styles.alertText}>{relanceBannerText}</div>
            <button
              type="button"
              className={styles.alertLink}
              onClick={() => setRelanceModalOpen(true)}
              disabled={relanceCandidates.length === 0}
            >
              Relancer les clients concernés ↗
            </button>
          </section>
        </>
      )}

      {activeTab === 'simulation' && (
        <section className={styles.simulatorSection}>
          
          {/* Bloc 1: Objectif */}
          <div className={styles.simBlockCard}>
            <h3 className={styles.simBlockTitle}>MON OBJECTIF</h3>
            <div className={styles.simInputGroup}>
              <label className={styles.simLabel}>Revenu net visé (après URSSAF et charges)</label>
              <div className={styles.simInputWrapper}>
                <input 
                  type="number" 
                  className={styles.simInput} 
                  value={simObjRevenu}
                  onChange={(e) => setSimObjRevenu(e.target.value)}
                />
                <span className={styles.simInputSuffix}>€/mois</span>
              </div>
            </div>
            <div className={styles.simInputGroup}>
              <label className={styles.simLabel}>Charges fixes mensuelles</label>
              <div className={styles.simInputWrapper}>
                <input 
                  type="number" 
                  className={styles.simInput} 
                  value={simObjCharges}
                  onChange={(e) => setSimObjCharges(e.target.value)}
                />
                <span className={styles.simInputSuffix}>€/mois</span>
              </div>
            </div>
          </div>

          {/* Bloc 2: Message d'alerte dynamique */}
          <div className={styles.simMessageBanner}>
            Pour atteindre {simObjRevenu}€ net, il te faut {requiredRdv} RDV/mois à ton panier actuel de {simTarif}€. Tu en as {simRdv} — ajuste le mix ou augmente tes tarifs.
          </div>

          {/* Bloc 3: Sliders */}
          <div className={`${styles.simBlockCard} ${styles.simDecorBg}`}>
            <h3 className={styles.simBlockTitle}>ET SI JE MODIFIAIS MON ACTIVITÉ ?</h3>
            
            <div className={styles.simSliderRow}>
              <label className={styles.simLabel}>Tarif moyen par RDV</label>
              <div className={styles.simSliderWrapper}>
                <input 
                  type="range" 
                  min="30" max="150" 
                  className={styles.simSlider} 
                  value={simTarif}
                  onChange={(e) => setSimTarif(Number(e.target.value))}
                />
                <span className={styles.simSliderValue}>{simTarif}€</span>
              </div>
            </div>

            <div className={styles.simSliderRow}>
              <label className={styles.simLabel}>RDV par mois</label>
              <div className={styles.simSliderWrapper}>
                <input 
                  type="range" 
                  min="10" max={simRdvMax}
                  className={styles.simSlider} 
                  value={simRdv}
                  onChange={(e) => setSimRdv(Number(e.target.value))}
                />
                <span className={styles.simSliderValue}>{simRdv}</span>
              </div>
            </div>

            <div className={styles.simSliderRow}>
              <label className={styles.simLabel}>Charges mensuelles</label>
              <div className={styles.simSliderWrapper}>
                <input 
                  type="range" 
                  min="100" max="2000" 
                  className={styles.simSlider} 
                  value={simCharges}
                  onChange={(e) => setSimCharges(Number(e.target.value))}
                />
                <span className={styles.simSliderValue}>{simCharges}€</span>
              </div>
            </div>
          </div>

          {/* Bloc 4: Résultat Simulé */}
          <div className={styles.simResultCard}>
            <h2 className={styles.simResultTitle}>Résultat simulé</h2>
            <div className={styles.simResultTable}>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>C.A. mensuel</span>
                <span className={styles.simResultValue}>{simulatedCA}€</span>
              </div>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>Charges</span>
                <span className={`${styles.simResultValue} ${styles.valRed}`}>-{simCharges}€</span>
              </div>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>Bénéfice brut</span>
                <span className={styles.simResultValue}>{simulatedBeneficeBrut}€</span>
              </div>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>URSSAF (-21.2%)</span>
                <span className={`${styles.simResultValue} ${styles.valRed}`}>-{Math.round(simulatedUrssaf)}€</span>
              </div>
              <div className={`${styles.simResultRow} ${styles.simResultRowNet}`}>
                <span className={styles.simResultLabelBold}>Bénéfice Net dans ta poche</span>
                <span className={styles.simResultValueBig}>{Math.round(simulatedNet)}€</span>
              </div>
            </div>
          </div>

        </section>
      )}

      {activeTab === 'vue' && (
        <>
          {/* Filter Bar */}
          <section className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <Image src="/icones/agenda.svg" alt="Calendar" width={40} height={40} className={styles.filterIcon} />
              <input 
                type="month" 
                className={styles.dateInput} 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
              <select 
                className={styles.typeFilter}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Toutes les transactions</option>
                <option value="revenus">Revenus uniquement</option>
                <option value="depenses">Dépenses uniquement</option>
              </select>
            </div>
            <div className={styles.filterActions}>
              <button
                className={styles.btnGreen}
                onClick={() => {
                  if (isReadOnlyAccess) {
                    setReadOnlyError(readOnlyMessage);
                    return;
                  }
                  setIsTransactionModalOpen(true);
                }}
                disabled={isReadOnlyAccess}
              >
                Nouvelle transaction
              </button>
              <button
                className={styles.btnDarkRed}
                onClick={() => {
                  if (isReadOnlyAccess) {
                    setReadOnlyError(readOnlyMessage);
                    return;
                  }
                  setIsChargeModalOpen(true);
                }}
                disabled={isReadOnlyAccess}
              >
                Nouvelle charge
              </button>
            </div>
          </section>

          {/* Stats Grid */}
          <section className={styles.statsGrid}>
            {/* Card 1: CA */}
            <div className={`${styles.statCard} ${styles.caCard}`}>
              <div className={styles.caDecor}>
                <span>- $ -</span>
              </div>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>C.A. <span>du mois</span></div>
                  <div className={styles.statSubtitle}>{filterMonth}</div>
                </div>
              </div>
              <div className={styles.statBigValue}>
                {caMois.toFixed(2)} € <span className={styles.statTrend}>{caTrendStr} SUR LE MOIS DERNIER</span>
              </div>
            </div>

            {/* Card 2: Charges récurrentes */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Charges</div>
                  <div className={styles.statTitle}>récurrentes</div>
                </div>
                <div className={styles.statTopValue}>- {chargesRecurrentes.toFixed(2)} €</div>
              </div>
              <div className={styles.statList}>
                {data.recurringExpenses.slice(0, 3).map((r: RecurringExpenseItem, idx: number) => (
                  <div className={styles.statListItem} key={idx}>
                    <span className={styles.statListLabel}>{r.label} :</span>
                    <div className={styles.statListBar}>
                      <div className={styles.statListBarFill} style={{ width: `${Math.min(100, (r.amount / recurringChargesMax) * 100)}%` }}></div>
                    </div>
                    <span className={styles.statListValue}>{r.amount.toFixed(2)} €</span>
                  </div>
                ))}
                {data.recurringExpenses.length === 0 && (
                  <div className={styles.emptyHint}>Aucune charge récurrente</div>
                )}
              </div>
            </div>

            {/* Card 3: Charges matériels */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Charges</div>
                </div>
                <div className={styles.statTopValue}>- {chargesMateriels.toFixed(2)} €</div>
              </div>
              <div className={styles.statList}>
                {data.transactions
                  .filter((t: TransactionItem) => t.type === "EXPENSE")
                  .slice(0, 3)
                  .map((t: TransactionItem, idx: number) => (
                  <div className={styles.statListItem} key={idx}>
                    <span className={styles.statListLabel}>{t.label || t.category || "Dépense"} :</span>
                    <div className={styles.statListBar}>
                      <div className={styles.statListBarFill} style={{ width: `${Math.min(100, (t.amount / materialChargesMax) * 100)}%` }}></div>
                    </div>
                    <span className={styles.statListValue}>{t.amount.toFixed(2)} €</span>
                  </div>
                ))}
                {data.transactions.filter((t: TransactionItem) => t.type === "EXPENSE").length === 0 && (
                  <div className={styles.emptyHint}>Aucune charge ponctuelle</div>
                )}
              </div>
            </div>

            {/* Card 4: Bénéfices */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Bénéfices</div>
                  <div className={styles.statSubtitle}>-21.2% URSSAF</div>
                </div>
                <div className={styles.statTopValue}>{benefitTopValue >= 0 ? '+' : ''}{benefitTopValue.toFixed(2)} €</div>
              </div>
              <div className={styles.chartContainer}>
                <SparkBarChart data={chartData1} color="#FCD7D1" />
              </div>
            </div>

            {/* Card 5: Nouveaux clients */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Nouveaux <span>clients</span></div>
                  <div className={styles.statSubtitle}>{new Date(filterMonth + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase()}</div>
                </div>
                <div className={styles.statTopValue}>+{newClientsCount}</div>
              </div>
              <div className={styles.statTextList}>
                {newClients.length > 0 ? (
                  newClients.map((client) => (
                    <div className={styles.statTextItem} key={client.id}>
                      <span className={styles.statTextLabel}>{client.name} :</span>
                      <span className={styles.statTextValue}>{client.firstService}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.statTextItem}>
                    <span className={styles.statTextLabel}>Aucune donnée</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 6: Panier moyen */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Panier moyen</div>
                </div>
                <div className={styles.statTopValue}>{actualAverageBasket.toFixed(2)} €</div>
              </div>
              <div className={styles.chartContainer}>
                <SparkBarChart data={chartData2} color="#FCD7D1" />
              </div>
            </div>
          </section>

          {/* Revenus Section */}
          <section className={styles.revenusSection}>
            <h2 className={styles.revenusTitle}>Mes Transactions</h2>
            <div className={styles.transactionsWrapper}>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction: DisplayTransaction) => (
                  <div key={transaction.id} className={styles.transactionItem}>
                    <div className={styles.transLeft}>
                      <div className={transaction.type === 'revenus' ? styles.transIcon : styles.transIconRed}>
                        {transaction.type === 'revenus' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M19 12l-7 7-7-7"/>
                          </svg>
                        )}
                      </div>
                      <div className={styles.transDetails}>
                        <div className={styles.transName}>{transaction.name}</div>
                        <div className={styles.transSub}>{transaction.details}</div>
                      </div>
                    </div>
                    <div className={transaction.type === 'revenus' ? styles.transAmount : styles.transAmountRed}>
                      {transaction.amount} €
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyTransactions}>
                  Aucune transaction trouvée pour ces critères.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Modal Nouvelle Transaction */}
      {isTransactionModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsTransactionModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderText}>
                <span className={styles.modalEyebrow}>Comptabilite Glowea</span>
                <h2 className={styles.modalTitle}>Nouvelle Transaction</h2>
                <p className={styles.modalSubtitle}>
                  Ajoutez un revenu ou une depense ponctuelle pour garder un suivi propre de votre activite.
                </p>
              </div>
              <button className={styles.modalClose} onClick={() => setIsTransactionModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTransaction} className={styles.modalBody}>
              <div className={styles.modalIntroCard}>
                <div className={styles.modalIntroIcon}>
                  {transType === "INCOME" ? "EUR" : "DEP"}
                </div>
                <div className={styles.modalIntroText}>
                  <strong>{transType === "INCOME" ? "Enregistrer un revenu" : "Enregistrer une depense ponctuelle"}</strong>
                  <span>
                    {transType === "INCOME"
                      ? "Ideal pour ajouter une prestation, une vente ou un encaissement manuel."
                      : "Ideal pour une depense materiel, un achat ponctuel ou un frais exceptionnel."}
                  </span>
                </div>
              </div>

              <div className={styles.modalFormGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Type</label>
                  <select
                    className={styles.formField}
                    value={transType}
                    onChange={(e) => setTransType(e.target.value as 'INCOME' | 'EXPENSE')}
                    required
                  >
                    <option value="INCOME">Revenu</option>
                    <option value="EXPENSE">Depense ponctuelle</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Date</label>
                  <input
                    className={styles.formField}
                    type="date"
                    value={transDate}
                    onChange={(e) => setTransDate(e.target.value)}
                    required
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.fieldLabel}>Libelle</label>
                  <input
                    className={styles.formField}
                    type="text"
                    value={transLabel}
                    onChange={(e) => setTransLabel(e.target.value)}
                    required
                    placeholder="Ex: Prestation cils"
                  />
                  <span className={styles.fieldHint}>Donnez un nom clair pour retrouver facilement cette transaction.</span>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Montant (EUR)</label>
                  <input
                    className={styles.formField}
                    type="number"
                    step="0.01"
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                    required
                    placeholder="Ex: 50.00"
                  />
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Impact</span>
                    <strong className={styles.metricValue}>{transType === "INCOME" ? "Ajout au chiffre d'affaires" : "Ajout aux charges ponctuelles"}</strong>
                    <span className={styles.metricHint}>La transaction apparaitra dans votre vue d&apos;ensemble du mois selectionne.</span>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnWhite} onClick={() => setIsTransactionModalOpen(false)}>Annuler</button>
                <button type="submit" className={styles.btnGreen} disabled={isSubmitting || isReadOnlyAccess}>
                  {isSubmitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Charge */}
      {isChargeModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsChargeModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderText}>
                <span className={styles.modalEyebrow}>Comptabilite Glowea</span>
                <h2 className={styles.modalTitle}>Nouvelle Charge</h2>
                <p className={styles.modalSubtitle}>
                  Centralisez vos frais fixes et ponctuels pour mieux visualiser votre rentabilite.
                </p>
              </div>
              <button className={styles.modalClose} onClick={() => setIsChargeModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCharge} className={styles.modalBody}>
              <div className={styles.modalIntroCard}>
                <div className={`${styles.modalIntroIcon} ${styles.modalIntroIconMuted}`}>FIXE</div>
                <div className={styles.modalIntroText}>
                  <strong>{chargeIsRecurring ? "Configurer une charge recurrente" : "Ajouter une charge ponctuelle"}</strong>
                  <span>
                    {chargeIsRecurring
                      ? "Parfait pour le loyer, les outils logiciels, les assurances ou tout autre frais regulier."
                      : "Ajoutez un achat exceptionnel ou une dépense unique sans alourdir votre comptabilité."}
                  </span>
                </div>
              </div>

              <div className={styles.modalFormGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.fieldLabel}>Libelle de la charge</label>
                  <input
                    className={styles.formField}
                    type="text"
                    value={chargeLabel}
                    onChange={(e) => setChargeLabel(e.target.value)}
                    required
                    placeholder="Ex: Loyer, Assurance..."
                  />
                  <span className={styles.fieldHint}>Choisissez un libelle simple et reconnaissable dans votre historique.</span>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Montant (EUR)</label>
                  <input
                    className={styles.formField}
                    type="number"
                    step="0.01"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    required
                    placeholder="Ex: 600.00"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Date ou début</label>
                  <input
                    className={styles.formField}
                    type="date"
                    value={chargeDate}
                    onChange={(e) => setChargeDate(e.target.value)}
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label htmlFor="isRecurring" className={styles.toggleCard}>
                    <div className={styles.toggleCardContent}>
                      <span className={styles.toggleLabel}>Charge recurrente</span>
                      <span className={styles.toggleHint}>Activez cette option si cette charge revient automatiquement.</span>
                    </div>
                    <div className={styles.toggleControl}>
                      <input
                        className={styles.checkboxInput}
                        type="checkbox"
                        id="isRecurring"
                        checked={chargeIsRecurring}
                        onChange={(e) => setChargeIsRecurring(e.target.checked)}
                      />
                      <span className={styles.toggleVisual} aria-hidden="true">
                        <span className={styles.toggleThumb} />
                      </span>
                    </div>
                  </label>
                </div>

                {chargeIsRecurring && (
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.fieldLabel}>Periodicite</label>
                    <select
                      className={styles.formField}
                      value={chargeFrequency}
                      onChange={(e) =>
                        setChargeFrequency(
                          e.target.value as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
                        )
                      }
                      required
                    >
                      <option value="WEEKLY">Hebdomadaire</option>
                      <option value="MONTHLY">Mensuelle</option>
                      <option value="QUARTERLY">Trimestrielle</option>
                      <option value="YEARLY">Annuelle</option>
                    </select>
                    <span className={styles.fieldHint}>Cette charge sera prise en compte comme un frais fixe dans vos analyses.</span>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnWhite} onClick={() => setIsChargeModalOpen(false)}>Annuler</button>
                <button type="submit" className={styles.btnDarkRed} disabled={isSubmitting || isReadOnlyAccess}>
                  {isSubmitting ? 'Création...' : 'Créer la charge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SendClientTemplateModal
        isOpen={isRelanceModalOpen}
        onClose={() => setRelanceModalOpen(false)}
        selectedClients={relanceCandidates}
      />
    </main>
  );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart, Bar, AreaChart, Area, ResponsiveContainer } from 'recharts';
import styles from "../dashboard/dashboard.module.css";
import RevenueChart from "./RevenueChart";
import StockPie from "./StockPie";
import SessionModal from "./SessionModal";
import PaymentModal from "./PaymentModal";
import NewAppointmentModal from "./NewAppointmentModal";
import NewClientModal from "./NewClientModal";
import SendPromoModal from "./SendPromoModal";
import WeeklyBriefModal from "./WeeklyBriefModal";
import InstallAppModal from "./InstallAppModal";

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type InsightAction = "promo" | "brief" | "stock" | "appointment";

type SmartInsight = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  action: InsightAction;
};

type ClientOption = {
  id: string;
  name: string;
};

type ServiceOption = {
  id: string;
  name: string;
  price: string | number;
  durationMin: number;
  color?: string | null;
};

type DashboardAppointment = {
  id: string;
  clientId: string;
  serviceId?: string | null;
  scheduledAt: string;
  notes?: string | null;
  time: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  servicePrice?: number;
  serviceDurationMin?: number;
  documentUrl?: string;
  hasDocument?: boolean;
  status?: string;
  isTomorrow?: boolean;
  client: ClientOption;
  service: ServiceOption;
};

type EditableAppointment = {
  id: string;
  scheduledAt: string;
  notes?: string | null;
  client?: ClientOption | null;
  service?: ServiceOption | null;
};

type TopClient = {
  id: string;
  name: string;
  visits: number;
  totalAmount: number;
};

type DashboardProduct = {
  id: string;
  name: string;
  currentQuantity: number;
  idealQuantity: number;
};

type WeeklyBriefData = {
  goal: {
    lastWeekRevenue: number;
    recommendedGoal: number;
  };
  birthdays: Array<{
    id: string;
    name: string;
    date: string;
  }>;
  refills: Array<{
    id: string;
    name: string;
    lastVisit: string;
    serviceName: string;
  }>;
};

export default function DashboardClientWrapper({ 
  firstName, 
  lastName,
  stats = { appointmentsMonth: 0, revenuesMonth: 0, objectiveCurrent: 0, objectiveTotal: 34, apptTrend: [], revTrend: [], revenueTrendPercent: null },
  appointments = [],
  topClients = [],
  clients = [],
  services = [],
  weeklyBriefData,
  products = [],
  insights = [],
}: { 
  firstName: string; 
  lastName: string;
  stats?: { 
    appointmentsMonth: number; 
    revenuesMonth: number; 
    objectiveCurrent: number; 
    objectiveTotal: number;
    apptTrend?: { name: string; val: number }[];
    revTrend?: { name: string; val: number }[];
    revenueTrendPercent?: number | null;
  };
  appointments?: DashboardAppointment[];
  topClients?: TopClient[];
  clients?: ClientOption[];
  services?: ServiceOption[];
  weeklyBriefData?: WeeklyBriefData;
  products?: DashboardProduct[];
  insights?: SmartInsight[];
}) {
  const router = useRouter();
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<DashboardAppointment | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<EditableAppointment | null>(null);
  const [appointmentActionMessage, setAppointmentActionMessage] = useState<string | null>(null);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAppointmentData, setPaymentAppointmentData] = useState<DashboardAppointment | null>(null);

  const [isNewAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [isNewClientModalOpen, setNewClientModalOpen] = useState(false);
  const [isSendPromoModalOpen, setSendPromoModalOpen] = useState(false);
  const [isWeeklyBriefOpen, setWeeklyBriefOpen] = useState(false);
  const [isInstallModalOpen, setInstallModalOpen] = useState(false);

  // Vérifier si on est Lundi et afficher la popup (une fois par jour)
  React.useEffect(() => {
    if (!weeklyBriefData) return;
    
    const today = new Date();
    const isMonday = today.getDay() === 1; // 1 = Lundi
    const todayStr = today.toISOString().split('T')[0];
    
    const lastSeen = localStorage.getItem('weeklyBriefLastSeen');
    
    if (isMonday && lastSeen !== todayStr) {
      setWeeklyBriefOpen(true);
      localStorage.setItem('weeklyBriefLastSeen', todayStr);
    }
  }, [weeklyBriefData]);
  
  // Vérifier s'il faut afficher la modale d'installation (mobile/tablette, 1ère visite)
  React.useEffect(() => {
    const checkInstallModal = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || "";
      // RegEx simple pour détecter mobile/tablette
      const isMobileTablet = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth <= 1024;
      
      if (isMobileTablet || isSmallScreen) {
        const hasSeenInstallModal = localStorage.getItem('hasSeenInstallModal');
        
        // Si c'est la première fois, on affiche la modale après 2 secondes
        if (!hasSeenInstallModal) {
          setTimeout(() => {
            setInstallModalOpen(true);
            localStorage.setItem('hasSeenInstallModal', 'true');
          }, 2000);
        }
      }
    };
    
    // S'assurer qu'on est côté client avant de vérifier
    if (typeof window !== 'undefined') {
      checkInstallModal();
    }
  }, []);

  // Use data from props, or fallback to mock
  const mockApptTrend = stats.apptTrend?.length ? stats.apptTrend : [
    { name: 'J1', val: 0 }, { name: 'J2', val: 0 }, { name: 'J3', val: 0 }, { name: 'J4', val: 0 }, { name: 'J5', val: 0 }
  ];

  const mockRevTrend = stats.revTrend?.length ? stats.revTrend : [
    { name: 'J1', val: 0 }, { name: 'J2', val: 0 }, { name: 'J3', val: 0 }, { name: 'J4', val: 0 }, { name: 'J5', val: 0 }
  ];

  const objectivePercent = Math.min(100, Math.round((stats.objectiveCurrent / stats.objectiveTotal) * 100)) || 0;
  const revenueTrendLabel = stats.revenueTrendPercent === null || stats.revenueTrendPercent === undefined
    ? "Aucune donnee le mois dernier"
    : `${stats.revenueTrendPercent > 0 ? '+' : ''}${stats.revenueTrendPercent}% sur le mois dernier`;
  const revenueTrendClassName = stats.revenueTrendPercent !== null && stats.revenueTrendPercent !== undefined && stats.revenueTrendPercent < 0
    ? `${styles.statCardTrend} ${styles.negativeTrend}`
    : styles.statCardTrend;
  const primaryInsight = insights[0] || {
    id: "empty",
    title: "Activite stable",
    description: "Ton dashboard ne montre pas d'alerte prioritaire aujourd'hui.",
    actionLabel: "Voir le brief",
    action: "brief" as InsightAction,
  };
  const secondaryInsights = insights.slice(1, 4);
  const handleInsightAction = (action: InsightAction) => {
    if (action === "promo") {
      setSendPromoModalOpen(true);
      return;
    }
    if (action === "brief") {
      setWeeklyBriefOpen(true);
      return;
    }
    if (action === "appointment") {
      setNewAppointmentModalOpen(true);
      return;
    }
    router.push("/dashboard/stock");
  };

  const clearAppointmentActionMessage = () => {
    if (appointmentActionMessage) setAppointmentActionMessage(null);
  };

  const handleContactClient = (appointment: DashboardAppointment) => {
    clearAppointmentActionMessage();
    const clientName = appointment.clientName || "votre cliente";
    const subject = encodeURIComponent(`Rendez-vous Glowea - ${appointment.time}`);
    const body = encodeURIComponent(
      `Bonjour ${clientName},\n\nJe vous contacte au sujet de votre rendez-vous ${appointment.serviceName} prevu a ${appointment.time}.\n\nA bientot.`
    );

    if (appointment.clientEmail) {
      window.open(`mailto:${appointment.clientEmail}?subject=${subject}&body=${body}`, "_self");
      return;
    }

    if (appointment.clientPhone) {
      window.open(`sms:${appointment.clientPhone}?body=${body}`, "_self");
      return;
    }

    setAppointmentActionMessage(`Aucun email ni telephone renseigne pour ${clientName}.`);
  };

  const handleOpenDocument = (appointment: DashboardAppointment) => {
    clearAppointmentActionMessage();

    if (appointment.documentUrl) {
      window.open(appointment.documentUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setAppointmentActionMessage("Aucun document genere pour ce rendez-vous. Ouverture de la fiche cliente.");
    router.push(`/dashboard/clients?clientId=${appointment.clientId}&tab=consentement`);
  };

  const handleEditAppointment = (appointment: DashboardAppointment) => {
    clearAppointmentActionMessage();
    setAppointmentToEdit({
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      notes: appointment.notes || "",
      client: appointment.client,
      service: appointment.service,
    });
    setNewAppointmentModalOpen(true);
  };

  return (
    <main className={styles.layout}>
      {/* Welcome Section */}
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>Bienvenue {firstName} {lastName}</h1>
          <p>AUJOURD&apos;HUI - {appointments.length} RENDEZ-VOUS</p>
        </div>
        <div className={styles.actionButtons}>
          <button className={styles.actionBtn} onClick={() => setWeeklyBriefOpen(true)} title="Point de la semaine">
            <Image src="/icones/dash_lumiere.svg" alt="Brief" width={24} height={24} />
          </button>
          <button className={styles.actionBtn} onClick={() => setNewAppointmentModalOpen(true)} title="Nouveau RDV">
            <Image src="/icones/dash_plus.svg" alt="RDV" width={24} height={24} />
          </button>
          <button className={styles.actionBtn} onClick={() => setNewClientModalOpen(true)} title="Nouveau client">
            <Image src="/icones/dash_clients.svg" alt="Clients" width={24} height={24} />
          </button>
          <button className={styles.actionBtn} onClick={() => setSendPromoModalOpen(true)} title="Envoyer une promo">
            <Image src="/icones/dash_promo.svg" alt="Promo" width={24} height={24} />
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        {/* Card 1: Rendez-vous */}
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <Image src="/icones/agenda.svg" alt="Rendez-vous" width={40} height={40} />
          </div>
          <div className={styles.statCardInfo}>
            <div className={styles.statCardTitle}>Rendez-vous <span>du mois</span></div>
            <div className={styles.statCardValue}>{stats.appointmentsMonth}</div>
          </div>
          <div className={styles.statCardChart}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={mockApptTrend}>
                <Bar dataKey="val" fill="var(--tertiary)" radius={[2, 2, 0, 0]} barSize={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Revenus */}
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <Image src="/icones/transaction.svg" alt="Revenus" width={40} height={40} />
          </div>
          <div className={styles.statCardInfo}>
            <div className={styles.statCardTitle}>Revenus <span>du mois</span></div>
            <div className={styles.statCardValue}>{currencyFormatter.format(stats.revenuesMonth)}</div>
          </div>
          <div className={styles.statCardChart}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={mockRevTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--tertiary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--tertiary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="var(--tertiary)" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={revenueTrendClassName}>{revenueTrendLabel}</div>
        </div>

        {/* Card 3: Objectif */}
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <Image src="/icones/objectif.svg" alt="Objectif" width={40} height={40} />
          </div>
          <div className={styles.statCardInfo}>
            <div className={styles.statCardTitle}>Objectif <span>du mois</span></div>
            <div className={styles.statCardValue}>{stats.objectiveCurrent} / {stats.objectiveTotal}</div>
            <div style={{ marginTop: '5px', background: '#f0f0f0', height: '6px', borderRadius: '3px', width: '100%', overflow: 'hidden' }}>
              <div style={{ background: 'var(--tertiary)', height: '100%', width: `${objectivePercent}%`, borderRadius: '3px', transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className={styles.mainGrid}>
        {/* Appointments */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Prochains <span>Rendez-vous</span></h2>
          <div className={styles.appointmentList}>
            {appointmentActionMessage && (
              <div className={styles.appointmentNotice} role="status">
                {appointmentActionMessage}
              </div>
            )}
            {appointments.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Aucun rendez-vous prévu</p>
                <button className={styles.emptyStateBtn} onClick={() => setNewAppointmentModalOpen(true)}>
                  Créer un premier rendez-vous
                </button>
              </div>
            ) : (
              appointments.map((app) => (
                <div key={app.id} className={styles.appointmentItem} onClick={() => { setSelectedAppointment(app); setSessionModalOpen(true); }}>
                  <div className={styles.appointmentTime}>
                    {app.time}
                  </div>
                  <div className={styles.appointmentDetails}>
                    <div className={styles.appointmentName}>{app.clientName.toUpperCase()}</div>
                    <div className={styles.appointmentType}>{app.serviceName}</div>
                  </div>
                  <div className={styles.appointmentTags}>
                    {!app.isTomorrow && <span className={styles.tagDemain} style={{ background: 'var(--tertiary)' }}>AUJOURD&apos;HUI</span>}
                    <div className={styles.appointmentActions}>
                      <button
                        type="button"
                        className={styles.actionIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactClient(app);
                        }}
                        title="Contacter la cliente"
                        aria-label={`Contacter ${app.clientName}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.actionIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDocument(app);
                        }}
                        title={app.hasDocument ? "Ouvrir le document" : "Voir la fiche cliente"}
                        aria-label={app.hasDocument ? `Ouvrir le document de ${app.clientName}` : `Voir la fiche de ${app.clientName}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.actionIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAppointment(app);
                        }}
                        title="Modifier le rendez-vous"
                        aria-label={`Modifier le rendez-vous de ${app.clientName}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    </div>
                    <button 
                      className={styles.playButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(app);
                        setSessionModalOpen(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 4L20 12L6 20V4Z" fill="white"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue Stats */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Statistique <span>des Revenus</span></h2>
          <div style={{ height: '200px', width: '100%', minHeight: 0, minWidth: 0 }}>
            <RevenueChart data={mockRevTrend} />
          </div>
        </div>

        {/* Stock */}
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>Mon <span>stock</span></h2>
            <a href="/dashboard/stock" style={{ fontSize: '0.85rem', color: 'var(--tertiary)', textDecoration: 'none', fontWeight: 600 }}>Gérer &rarr;</a>
          </div>
          <div className={styles.stockDonutsContainer} style={{ flex: 1 }}>
            {products.length === 0 ? (
              <div className={styles.emptyState} style={{ width: '100%', margin: '0 auto' }}>
                <p>Votre stock est vide</p>
                <a href="/dashboard/stock" style={{ textDecoration: 'none' }}>
                  <button className={styles.emptyStateBtn}>
                    Ajouter du stock
                  </button>
                </a>
              </div>
            ) : (
              <>
                {products.slice(0, 3).map((prod) => (
                  <StockPie 
                    key={prod.id} 
                    current={prod.currentQuantity || 0} 
                    total={prod.idealQuantity || Math.max(prod.currentQuantity, 10)} 
                    label={prod.name} 
                    color="var(--tertiary)" 
                    emptyColor="var(--secondary)" 
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Top Clientes */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Top <span>clientes</span></h2>
          <div className={styles.topClientList}>
            {topClients.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Aucune cliente enregistrée</p>
                <button className={styles.emptyStateBtn} onClick={() => setNewClientModalOpen(true)}>
                  Ajouter une première cliente
                </button>
              </div>
            ) : (
              topClients.map((client, index) => (
                <div key={client.id} className={styles.topClientItem}>
                  <div className={styles.topClientRank}>#{index + 1}</div>
                  <div className={styles.topClientInfo}>
                    <div className={styles.topClientName}>{client.name}</div>
                    <div className={styles.topClientDetail}>{client.visits} visites au total</div>
                  </div>
                  <div className={styles.topClientAmount}>{client.totalAmount}€</div>
                </div>
              ))
            )}
          </div>
          <div className={styles.topClientActions}>
            <button className={styles.btnFideliser}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              Fidéliser avec une offre
            </button>
          </div>
        </div>
      </section>

      {/* Insight Banner */}
      <section className={styles.insightBanner}>
        <div className={styles.insightContent}>
          <div className={styles.insightIcon}>
            <Image src="/icones/dash_lumiere.svg" alt="Idea" width={40} height={40} />
          </div>
          <div className={styles.insightText}>
            <div className={styles.insightTitle}>Insight du jour</div>
            <h3 className={styles.insightHeadline}>{primaryInsight.title}</h3>
            <p className={styles.insightDesc}>{primaryInsight.description}</p>
            <button className={styles.insightBtn} onClick={() => handleInsightAction(primaryInsight.action)}>
              {primaryInsight.actionLabel}
            </button>
            {secondaryInsights.length > 0 && (
              <div className={styles.suggestionList}>
                {secondaryInsights.map((insight) => (
                  <button
                    key={insight.id}
                    className={styles.suggestionItem}
                    onClick={() => handleInsightAction(insight.action)}
                  >
                    <span>{insight.title}</span>
                    <small>{insight.description}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <SessionModal 
        isOpen={isSessionModalOpen} 
        onClose={() => { setSessionModalOpen(false); setSelectedAppointment(null); }} 
        clientName={selectedAppointment?.clientName}
        time={selectedAppointment?.time}
        category={selectedAppointment?.serviceName}
        appointmentId={selectedAppointment?.id}
        clientId={selectedAppointment?.clientId}
        serviceId={selectedAppointment?.serviceId || undefined}
        onPaymentRequest={() => {
          setPaymentAppointmentData(selectedAppointment);
          setSessionModalOpen(false);
          setSelectedAppointment(null);
          setPaymentModalOpen(true);
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPaymentAppointmentData(null); }}
        appointmentId={paymentAppointmentData?.id || ""}
        clientId={paymentAppointmentData?.clientId || ""}
        clientName={paymentAppointmentData?.clientName || ""}
        serviceName={paymentAppointmentData?.serviceName || ""}
        defaultAmount={paymentAppointmentData?.servicePrice ? Number(paymentAppointmentData.servicePrice) : 0}
      />

      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => {
          setNewAppointmentModalOpen(false);
          setAppointmentToEdit(null);
        }}
        clients={clients}
        services={services}
        initialData={appointmentToEdit}
      />

      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        onSave={(client) => {
          console.log("Nouveau client créé depuis le Dashboard:", client);
        }}
      />

      <SendPromoModal
        isOpen={isSendPromoModalOpen}
        onClose={() => setSendPromoModalOpen(false)}
      />

      {weeklyBriefData && (
        <WeeklyBriefModal 
          isOpen={isWeeklyBriefOpen}
          onClose={() => setWeeklyBriefOpen(false)}
          data={weeklyBriefData}
        />
      )}

      {/* Modale Installation App (Mobile/Tablette) */}
      <InstallAppModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
      />
    </main>
  );
}

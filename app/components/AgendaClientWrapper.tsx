"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "../dashboard/agenda/agenda.module.css";
import SessionModal from "./SessionModal";
import PaymentModal from "./PaymentModal";
import NewAppointmentModal from "./NewAppointmentModal";
import { deleteAppointment, updateAppointmentStatus } from "../actions/appointmentActions";
import {
  getAppointmentFinancialSummary,
  getAppointmentPaymentLabel,
} from "../../lib/appointmentFinance";

import { exportElementToPDF } from "../../lib/exportUtils";
import { useRouter, useSearchParams } from "next/navigation";

type AppointmentStatusValue = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "NO_SHOW";

type AgendaClient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

type AgendaService = {
  id: string;
  name: string;
  durationMin: number;
  price: number | string;
  color?: string | null;
};

type AgendaAppointment = {
  id: string;
  scheduledAt: string;
  endAt: string;
  status: AppointmentStatusValue;
  paymentStatus: string;
  price?: number | null;
  depositAmount?: number | null;
  depositPaidAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  paymentMethod?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  notes?: string;
  clientId: string;
  serviceId: string;
  client: AgendaClient;
  service: AgendaService;
};

const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 18;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 36;

type PaymentSettings = {
  stripeConnected: boolean;
  stripeOnboardingComplete: boolean;
  paymentsEnabled: boolean;
  defaultDepositAmount: number;
  defaultDepositType: "fixed" | "percent";
};

export default function AgendaClientWrapper({ 
  appointments = [],
  clients = [],
  services = [],
  paymentSettings = {
    stripeConnected: false,
    stripeOnboardingComplete: false,
    paymentsEnabled: false,
    defaultDepositAmount: 0,
    defaultDepositType: "fixed",
  },
}: { 
  appointments?: AgendaAppointment[];
  clients?: AgendaClient[];
  services?: AgendaService[];
  paymentSettings?: PaymentSettings;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
 const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSessionAppointment, setSelectedSessionAppointment] = useState<AgendaAppointment | null>(null);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAppointmentData, setPaymentAppointmentData] = useState<AgendaAppointment | null>(null);

  const [isNewAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<AgendaAppointment | null>(null);
  const [initialAppointmentSlot, setInitialAppointmentSlot] = useState<Date | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionAppointmentId, setActionAppointmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mettre à jour l'heure toutes les minutes pour la ligne rouge
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;

    const refreshToken =
      searchParams.get("session_id") ||
      searchParams.get("appointmentId") ||
      "stripe-payment-success";
    const storageKey = `agenda-stripe-refresh:${refreshToken}`;

    if (window.sessionStorage.getItem(storageKey) === "done") return;

    window.sessionStorage.setItem(storageKey, "done");
    router.refresh();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("payment");
    nextUrl.searchParams.delete("session_id");
    nextUrl.searchParams.delete("appointmentId");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
  }, [router, searchParams]);

  // Obtenir le lundi de la semaine courante
  const [isHistoryView, setIsHistoryView] = useState(false);

  // Pagination pour l'historique
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;
  const canUseStripePayments =
    paymentSettings.stripeConnected &&
    paymentSettings.stripeOnboardingComplete &&
    paymentSettings.paymentsEnabled;

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [activeFilter, setActiveFilter] = useState("Aujourd'hui");

  const calendarSlots = Array.from({ length: ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / SLOT_MINUTES + 2 }).map((_, index) => {
    const totalMinutes = CALENDAR_START_HOUR * 60 + index * SLOT_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return {
      hour,
      minute,
      label: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    };
  });

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
    setActiveFilter(""); // Désactive le filtre si on navigue manuellement
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    const today = new Date();
    if (filter === "Aujourd'hui" || filter === "Cette semaine" || filter === "Ce mois") {
      setCurrentWeekStart(getStartOfWeek(today));
    } else if (filter === "Demain") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCurrentWeekStart(getStartOfWeek(tomorrow));
    }
  };

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentWeek = () => {
    const now = new Date();
    const startOfThisWeek = getStartOfWeek(now);
    return startOfThisWeek.getTime() === currentWeekStart.getTime();
  };

  const getRedLinePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    if (hours < CALENDAR_START_HOUR) return 0;
    if (hours > CALENDAR_END_HOUR || (hours === CALENDAR_END_HOUR && minutes > SLOT_MINUTES)) {
      return calendarSlots.length * SLOT_HEIGHT;
    }

    return (((hours - CALENDAR_START_HOUR) * 60) + minutes) * (SLOT_HEIGHT / SLOT_MINUTES);
  };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const formatMonthYear = () => {
    return `${monthNames[currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]}`;
    } else {
      return `${start.getDate()} ${monthNames[start.getMonth()].substring(0, 3)}. - ${end.getDate()} ${monthNames[end.getMonth()]}`;
    }
  };

  const getFilteredAppointments = () => {
    if (isHistoryView) {
      // Pour l'historique : uniquement les rendez-vous passés
      const now = new Date();
      return appointments
        .filter(app => new Date(app.scheduledAt).getTime() < now.getTime())
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()); // Plus récent au plus ancien
    }

    return appointments.filter(app => {
      const appDate = new Date(app.scheduledAt);
      appDate.setHours(0, 0, 0, 0);

      if (activeFilter === "Aujourd'hui") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appDate.getTime() === today.getTime();
      } else if (activeFilter === "Demain") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return appDate.getTime() === tomorrow.getTime();
      } else if (activeFilter === "Cette semaine") {
        const weekStart = getStartOfWeek(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return appDate >= weekStart && appDate <= weekEnd;
      } else if (activeFilter === "Ce mois") {
        const today = new Date();
        return appDate.getMonth() === today.getMonth() && appDate.getFullYear() === today.getFullYear();
      }
      
      // Default / No specific string filter, just match current week
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      return appDate >= currentWeekStart && appDate <= weekEnd;
    }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  const filteredAppointments = getFilteredAppointments();
  const weeklyAppointments = appointments
    .filter((app) => {
      const appDate = new Date(app.scheduledAt);
      appDate.setHours(0, 0, 0, 0);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      return appDate >= currentWeekStart && appDate <= weekEnd;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const getTodaySubtitle = () => {
    if (isHistoryView) return "HISTORIQUE DES RENDEZ-VOUS PASSÉS";
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('fr-FR', options).toUpperCase();
    const todayCount = appointments.filter(app => {
      const appDate = new Date(app.scheduledAt);
      return appDate.toDateString() === today.toDateString();
    }).length;
    return `${dateStr} - ${todayCount} RENDEZ-VOUS AUJOURD'HUI`;
  };

  const statusLabels: Record<string, string> = {
    SCHEDULED: "Planifie",
    CONFIRMED: "Confirme",
    IN_PROGRESS: "En cours",
    COMPLETED: "Termine",
    CANCELED: "Annule",
    NO_SHOW: "No-show",
  };

  const formatMoneyFromCents = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount / 100);
  };

  const handleStatusChange = async (appointmentId: string, nextStatus: AppointmentStatusValue) => {
    setActionAppointmentId(appointmentId);
    setActionError(null);
    try {
      const res = await updateAppointmentStatus(appointmentId, nextStatus);
      if (!res.success) {
        setActionError(res.error || "Impossible de changer le statut.");
        return;
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Une erreur inattendue est survenue.");
    } finally {
      setActionAppointmentId(null);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) return;

    setActionAppointmentId(appointmentId);
    setActionError(null);
    try {
      const res = await deleteAppointment(appointmentId);
      if (!res.success) {
        setActionError(res.error || "Impossible de supprimer ce rendez-vous.");
        return;
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Une erreur inattendue est survenue.");
    } finally {
      setActionAppointmentId(null);
    }
  };

  const openCreateAppointmentAt = (day: Date, hour: number, minute: number) => {
    const scheduledAt = new Date(day);
    scheduledAt.setHours(hour, minute, 0, 0);
    setAppointmentToEdit(null);
    setInitialAppointmentSlot(scheduledAt);
    setNewAppointmentModalOpen(true);
  };

  const openEditAppointment = (appointment: AgendaAppointment) => {
    setInitialAppointmentSlot(null);
    setAppointmentToEdit(appointment);
    setNewAppointmentModalOpen(true);
  };

  const showSavedToast = () => {
    setToastMessage("Rendez-vous enregistre");
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreatePaymentLink = async (appointmentId: string, paymentType: "deposit" | "full") => {
    if (!canUseStripePayments) {
      router.push("/settings/payments");
      return;
    }

    setActionAppointmentId(appointmentId);
    setActionError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/create-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setActionError(data.error || "Impossible de creer le lien de paiement.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      setActionError("Une erreur inattendue est survenue.");
    } finally {
      setActionAppointmentId(null);
    }
  };

  return (
    <main className={styles.layout}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{isHistoryView ? "Historique" : "Mon Agenda"}</h1>
          <p className={styles.subtitle}>{getTodaySubtitle()}</p>
        </div>
        {toastMessage && <div className={styles.toastMessage}>{toastMessage}</div>}
        <div className={styles.headerActions}>
          {!isHistoryView && (
            <button
              className={styles.btnPrimary}
              onClick={() => {
                setAppointmentToEdit(null);
                setInitialAppointmentSlot(null);
                setNewAppointmentModalOpen(true);
              }}
            >
              + Nouveau RDV
            </button>
          )}
          <button 
            className={isHistoryView ? styles.btnPrimary : styles.btnSecondary} 
            onClick={() => setIsHistoryView(!isHistoryView)}
          >
            {isHistoryView ? "Retour à l'agenda" : "Historique des RDV"}
          </button>
        </div>
      </header>

      {!isHistoryView && (
        <section className={styles.filterCard}>
          <div className={styles.filterIcon}>
            <Image src="/icones/agenda.svg" alt="Calendrier" width={70} height={70} />
          </div>
          <div className={styles.filterControls}>
            <div className={styles.datePickerWrapper}>
              <input type="text" value={formatMonthYear()} className={styles.dateInput} readOnly />
              <Image src="/icones/agenda.svg" alt="Calendar Icon" width={20} height={20} className={styles.dateIcon} />
            </div>
            <div className={styles.filterPills}>
              {["Aujourd'hui", "Demain", "Cette semaine", "Ce mois"].map((filter) => (
                <button 
                  key={filter}
                  className={`${styles.pill} ${activeFilter === filter ? styles.active : ''}`}
                  onClick={() => handleFilterClick(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Liste des rendez-vous */}
      <section className={styles.listCard}>
        {actionError && (
          <div className={styles.errorAlert}>
            {actionError}
          </div>
        )}
        {filteredAppointments.length === 0 && (
          <div className={styles.emptyState}>
            Aucun rendez-vous {isHistoryView ? "dans l'historique" : "pour cette période"}
          </div>
        )}
        {(isHistoryView 
          ? filteredAppointments.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage) 
          : filteredAppointments
        ).map((app) => {
          const appDate = new Date(app.scheduledAt);
          const timeString = appDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const dateString = appDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          const finance = getAppointmentFinancialSummary(app);
          const paymentLabel = getAppointmentPaymentLabel(finance.paymentStatus);
          const paymentStatus = finance.paymentStatus;
          const priceCents = finance.priceCents;
          const depositPaidCents = finance.depositPaidAmountCents;
          const remainingCents = finance.remainingAmountCents;
          
          return (
            <div key={app.id} className={styles.appointmentItem}>
              {/* Bloc Temps */}
              <div className={styles.timeBlock}>
                <div className={styles.timeText}>{timeString}</div>
                <div className={styles.dateText}>{dateString}</div>
              </div>

              {/* Bloc Détails */}
              <div className={styles.detailsBlock}>
                <div className={styles.clientInfo}>
                  <div className={styles.clientName}>{app.client.name.toUpperCase()}</div>
                  <div className={styles.clientContact}>
                    {app.client.email} &nbsp;&nbsp; {app.client.phone}
                  </div>
                  <div className={styles.tags}>
                    <span className={styles.tag}>{app.service.name}</span>
                    <select
                      className={styles.statusSelect}
                      value={app.status}
                      disabled={actionAppointmentId === app.id}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as AppointmentStatusValue)}
                      title="Changer le statut"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <span className={styles.paymentBadge}>{paymentLabel}</span>
                  </div>
                  <div className={styles.paymentSummary}>
                    <span>
                      Total : {formatMoneyFromCents(priceCents)} · Arrhes encaissé : {formatMoneyFromCents(depositPaidCents)} · Reste : {formatMoneyFromCents(remainingCents)}
                    </span>
                  </div>
                  {app.notes && (
                    <div className={styles.appointmentNote}>
                      {app.notes}
                    </div>
                  )}
                </div>

                {/* Bloc Actions */}
                <div className={styles.actionsBlock}>
                  <div className={styles.topActions}>
                    <button className={styles.btnPlay} onClick={() => { setSelectedSessionAppointment(app); setSessionModalOpen(true); }}>
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="20" fill="#8B4B54"/>
                        <path d="M26 20L16 26V14L26 20Z" fill="white"/>
                      </svg>
                    </button>
                    <button
                      className={styles.btnAfficher}
                      onClick={() => router.push(`/dashboard/clients?clientId=${encodeURIComponent(app.clientId)}&tab=infos`)}
                    >
                      AFFICHER
                    </button>
                  </div>
                  <div className={styles.paymentActions}>
                    <button
                      className={styles.paymentButton}
                      onClick={() => handleCreatePaymentLink(app.id, "deposit")}
                      disabled={actionAppointmentId === app.id || paymentStatus === "paid" || paymentStatus === "paid_offline" || paymentStatus === "deposit_paid"}
                    >
                      Demander les arrhes
                    </button>
                    <button
                      className={styles.paymentButtonSecondary}
                      onClick={() => handleCreatePaymentLink(app.id, "full")}
                      disabled={actionAppointmentId === app.id || paymentStatus === "paid" || paymentStatus === "paid_offline"}
                    >
                      Paiement complet
                    </button>
                  </div>
                  <div className={styles.bottomIcons}>
                    <button className={styles.iconBtn}>
                      <Image src="/icones/mail.svg" alt="Email" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn}
                      onClick={() => router.push(`/dashboard/clients?clientId=${app.clientId}&tab=consentement`)}
                      title="Gérer les consentements"
                    >
                      <Image src="/icones/doc.svg" alt="Doc" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn} 
                      onClick={() => openEditAppointment(app)}
                      title="Modifier"
                    >
                      <Image src="/icones/edit.svg" alt="Edit" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn} 
                      onClick={async () => {
                        await handleDeleteAppointment(app.id);
                      }}
                      disabled={actionAppointmentId === app.id}
                      title="Supprimer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination pour l'historique */}
        {isHistoryView && filteredAppointments.length > itemsPerPage && (
          <div className={styles.pagination}>
            <button 
              className={styles.btnSecondary} 
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => p - 1)}
            >
              Précédent
            </button>
            <span className={styles.pageIndicator}>
              Page {historyPage} / {Math.ceil(filteredAppointments.length / itemsPerPage)}
            </span>
            <button 
              className={styles.btnSecondary} 
              disabled={historyPage === Math.ceil(filteredAppointments.length / itemsPerPage)}
              onClick={() => setHistoryPage(p => p + 1)}
            >
              Suivant
            </button>
          </div>
        )}
      </section>

      {/* Calendar Section */}
      {!isHistoryView && (
        <section className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <h2 className={styles.calendarTitle}>Planning de la semaine</h2>
            <div className={styles.calendarActions}>
              <div className={styles.calendarNav}>
                <button className={styles.navBtn} onClick={() => changeWeek(-1)}>&lt;</button>
                <div className={styles.currentDate}>{formatWeekRange()}</div>
                <button className={styles.navBtn} onClick={() => changeWeek(1)}>&gt;</button>
              </div>
              <span className={styles.downloadText} onClick={() => exportElementToPDF('calendar-grid-export', 'planning_semaine', 'landscape')}>Télécharger</span>
              <button 
                className={styles.downloadBtn} 
                onClick={() => exportElementToPDF('calendar-grid-export', 'planning_semaine', 'landscape')}
                title="Télécharger le planning"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.calendarScroller}>
            <div className={styles.calendarGrid} id="calendar-grid-export">
              {/* Header des jours */}
              <div className={styles.daysRow}>
                <div className={styles.timeLabel}></div>
                {weekDays.map((day, index) => (
                  <div key={index} className={`${styles.dayHeader} ${isToday(day) ? styles.today : ''}`}>
                    <span className={styles.dayName}>{dayNames[index]}</span>
                    <span className={styles.dayNumber}>{day.getDate()}</span>
                  </div>
                ))}
              </div>
              
              {/* Corps du calendrier scrollable */}
              <div className={styles.gridBody}>
                {/* Ligne indiquant l'heure actuelle */}
                {isCurrentWeek() && (
                  <div className={styles.currentTimeLine} style={{ top: `${getRedLinePosition()}px` }}></div>
                )}

                {/* Génération des créneaux de 30 minutes */}
                {calendarSlots.map((slot) => (
                  <div key={slot.label} className={styles.timeRow}>
                    <div className={styles.timeLabel}>{slot.label}</div>
                    {weekDays.map((day, dayIndex) => {
                      const dayAppointments = weeklyAppointments.filter(app => {
                        const appDate = new Date(app.scheduledAt);
                        const appSlotMinute = Math.floor(appDate.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES;
                        return appDate.getDate() === day.getDate() && 
                               appDate.getMonth() === day.getMonth() &&
                               appDate.getHours() === slot.hour &&
                               appSlotMinute === slot.minute;
                      });

                      return (
                        <div
                          key={dayIndex}
                          className={styles.timeCell}
                          onClick={() => openCreateAppointmentAt(day, slot.hour, slot.minute)}
                          title={`Creer un rendez-vous ${slot.label}`}
                        >
                          {dayAppointments.map((app, appIndex) => {
                            const appDate = new Date(app.scheduledAt);
                            const endAt = new Date(app.endAt);
                            const durationMinutes = (endAt.getTime() - appDate.getTime()) / 60000;
                            const topOffset = ((appDate.getMinutes() - slot.minute) / SLOT_MINUTES) * SLOT_HEIGHT;
                            const height = Math.max(28, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT);
                            const styleClass = appIndex % 3 === 0 ? styles.event1 : (appIndex % 3 === 1 ? styles.event2 : styles.event3);

                            return (
                              <div 
                                key={app.id} 
                                className={`${styles.eventBlock} ${styleClass}`} 
                                style={{ top: `${topOffset}px`, height: `${height}px` }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditAppointment(app);
                                }}
                                title={`Modifier ${app.client.name}`}
                              >
                                <div className={styles.eventTitle}>{app.client.name.toUpperCase()}</div>
                                <div className={styles.eventTime}>
                                  {appDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - 
                                  {endAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
      </section>
      )}

      <SessionModal 
        isOpen={isSessionModalOpen} 
        onClose={() => { setSessionModalOpen(false); setSelectedSessionAppointment(null); }} 
        clientName={selectedSessionAppointment?.client.name}
        time={selectedSessionAppointment ? new Date(selectedSessionAppointment.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined}
        category={selectedSessionAppointment?.service.name}
        appointmentId={selectedSessionAppointment?.id}
        clientId={selectedSessionAppointment?.client.id}
        serviceId={selectedSessionAppointment?.service.id}
        onPaymentRequest={() => {
          setPaymentAppointmentData(selectedSessionAppointment);
          setSessionModalOpen(false);
          setSelectedSessionAppointment(null);
          setPaymentModalOpen(true);
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPaymentAppointmentData(null); }}
        appointmentId={paymentAppointmentData?.id || ""}
        clientId={paymentAppointmentData?.client?.id || ""}
        clientName={paymentAppointmentData?.client?.name || ""}
        serviceName={paymentAppointmentData?.service?.name || ""}
        defaultAmount={paymentAppointmentData?.service?.price ? Number(paymentAppointmentData.service.price) : 0}
        price={paymentAppointmentData?.price}
        depositAmount={paymentAppointmentData?.depositAmount}
        depositPaidAmount={paymentAppointmentData?.depositPaidAmount}
        paidAmount={paymentAppointmentData?.paidAmount}
        remainingAmount={paymentAppointmentData?.remainingAmount}
        paymentMethod={paymentAppointmentData?.paymentMethod}
        paymentStatus={paymentAppointmentData?.paymentStatus || "none"}
        paymentsEnabled={canUseStripePayments}
        mode="closeout"
      />

      <NewAppointmentModal 
        isOpen={isNewAppointmentModalOpen} 
        onClose={() => {
          setNewAppointmentModalOpen(false);
          setAppointmentToEdit(null);
          setInitialAppointmentSlot(null);
        }}
        clients={clients}
        services={services}
        initialData={appointmentToEdit}
        initialScheduledAt={initialAppointmentSlot}
        onSaved={showSavedToast}
      />

    </main>
  );
}

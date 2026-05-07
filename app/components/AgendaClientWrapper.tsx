"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "../dashboard/agenda/agenda.module.css";
import SessionModal from "./SessionModal";
import PaymentModal from "./PaymentModal";
import NewAppointmentModal from "./NewAppointmentModal";
import { deleteAppointment } from "../actions/appointmentActions";

import { exportElementToPDF } from "../../lib/exportUtils";
import { useRouter } from "next/navigation";

export default function AgendaClientWrapper({ 
  appointments = [],
  clients = [],
  services = []
}: { 
  appointments?: any[];
  clients?: any[];
  services?: any[];
}) {
  const router = useRouter();
 const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSessionAppointment, setSelectedSessionAppointment] = useState<any>(null);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAppointmentData, setPaymentAppointmentData] = useState<any>(null);

  const [isNewAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mettre à jour l'heure toutes les minutes pour la ligne rouge
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Obtenir le lundi de la semaine courante
  const [isHistoryView, setIsHistoryView] = useState(false);

  // Pagination pour l'historique
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [activeFilter, setActiveFilter] = useState("Aujourd'hui");

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
    
    // Le calendrier commence à 8:00
    if (hours < 8) return 0;
    if (hours > 18) return (18 - 8 + 1) * 60; // Max (11 heures * 60px)

    // 1 heure = 60px, donc 1 minute = 1px
    return ((hours - 8) * 60) + minutes;
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

  return (
    <main className={styles.layout}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{isHistoryView ? "Historique" : "Mon Agenda"}</h1>
          <p className={styles.subtitle}>{getTodaySubtitle()}</p>
        </div>
        <div className={styles.headerActions}>
          {!isHistoryView && (
            <button className={styles.btnPrimary} onClick={() => setNewAppointmentModalOpen(true)}>+ Nouveau RDV</button>
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
        {filteredAppointments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
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
                    <span className={styles.tag}>{app.paymentStatus === 'PAID' ? 'Payé' : 'Non-payé'}</span>
                  </div>
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
                    <button className={styles.btnAfficher}>AFFICHER</button>
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
                      onClick={() => {
                        setAppointmentToEdit(app);
                        setNewAppointmentModalOpen(true);
                      }}
                      title="Modifier"
                    >
                      <Image src="/icones/edit.svg" alt="Edit" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn} 
                      onClick={async () => {
                        if (confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) {
                          await deleteAppointment(app.id);
                        }
                      }}
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
          <div className={styles.pagination} style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
            <button 
              className={styles.btnSecondary} 
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => p - 1)}
            >
              Précédent
            </button>
            <span style={{ alignSelf: 'center', fontWeight: '500' }}>
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
            <span className={styles.downloadText} style={{ cursor: 'pointer' }} onClick={() => exportElementToPDF('calendar-grid-export', 'planning_semaine', 'landscape')}>Télécharger</span>
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

            {/* Génération des heures de 8h à 18h */}
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => (
              <div key={hour} className={styles.timeRow}>
                <div className={styles.timeLabel}>{hour}:00</div>
                {weekDays.map((day, dayIndex) => {
                  // Find appointments for this day and hour
                  const dayAppointments = filteredAppointments.filter(app => {
                    const appDate = new Date(app.scheduledAt);
                    return appDate.getDate() === day.getDate() && 
                           appDate.getMonth() === day.getMonth() &&
                           appDate.getHours() === hour;
                  });

                  return (
                    <div key={dayIndex} className={styles.timeCell}>
                      {dayAppointments.map((app, appIndex) => {
                        const appDate = new Date(app.scheduledAt);
                        const endAt = new Date(app.endAt);
                        const durationMinutes = (endAt.getTime() - appDate.getTime()) / 60000;
                        const topOffset = (appDate.getMinutes() / 60) * 60; // 60px per hour
                        const height = (durationMinutes / 60) * 60;

                        // Alternate styles for demo
                        const styleClass = appIndex % 3 === 0 ? styles.event1 : (appIndex % 3 === 1 ? styles.event2 : styles.event3);

                        return (
                          <div 
                            key={app.id} 
                            className={`${styles.eventBlock} ${styleClass}`} 
                            style={{ top: `${topOffset}px`, height: `${height}px` }}
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
        appointmentId={paymentAppointmentData?.id}
        clientId={paymentAppointmentData?.client?.id}
        clientName={paymentAppointmentData?.client?.name}
        serviceName={paymentAppointmentData?.service?.name}
        defaultAmount={paymentAppointmentData?.service?.price ? Number(paymentAppointmentData.service.price) : 0}
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

    </main>
  );
}

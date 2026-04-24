"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./agenda.module.css";
import SessionModal from "../../components/SessionModal";
import NewAppointmentModal from "../../components/NewAppointmentModal";

export default function AgendaPage() {
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mettre à jour l'heure toutes les minutes pour la ligne rouge
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Obtenir le lundi de la semaine courante
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

  return (
    <main className={styles.layout}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Mon Agenda</h1>
          <p className={styles.subtitle}>JEUDI 26 MARS - 3 RENDEZ-VOUS AUJOURD'HUI</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setNewAppointmentModalOpen(true)}>+ Nouveau RDV</button>
          <button className={styles.btnSecondary}>Historique des RDV</button>
        </div>
      </header>

      {/* Filter Section */}
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

      {/* Liste des rendez-vous */}
      <section className={styles.listCard}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.appointmentItem}>
            {/* Bloc Temps */}
            <div className={styles.timeBlock}>
              <div className={styles.timeText}>8:00</div>
              <div className={styles.dateText}>24/12</div>
            </div>

            {/* Bloc Détails */}
            <div className={styles.detailsBlock}>
              <div className={styles.clientInfo}>
                <div className={styles.clientName}>JOHNNY DOUG</div>
                <div className={styles.clientContact}>johnny.doug@outlook.fr &nbsp;&nbsp; 06 00 00 00 00</div>
                <div className={styles.tags}>
                  <span className={styles.tag}>Remplissage</span>
                  <span className={styles.tag}>Non-payé</span>
                </div>
              </div>

              {/* Bloc Actions */}
              <div className={styles.actionsBlock}>
                <div className={styles.topActions}>
                  <button className={styles.btnPlay} onClick={() => setSessionModalOpen(true)}>
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
                  <button className={styles.iconBtn}>
                    <Image src="/icones/doc.svg" alt="Doc" width={16} height={16} />
                  </button>
                  <button className={styles.iconBtn}>
                    <Image src="/icones/edit.svg" alt="Edit" width={16} height={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Calendar Section */}
      <section className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <h2 className={styles.calendarTitle}>Planning de la semaine</h2>
          <div className={styles.calendarActions}>
            <div className={styles.calendarNav}>
              <button className={styles.navBtn} onClick={() => changeWeek(-1)}>&lt;</button>
              <div className={styles.currentDate}>{formatWeekRange()}</div>
              <button className={styles.navBtn} onClick={() => changeWeek(1)}>&gt;</button>
            </div>
            <span className={styles.downloadText}>Télécharger</span>
            <button className={styles.downloadBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.calendarGrid}>
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
                <div className={styles.timeCell}></div>
                <div className={styles.timeCell}></div>
                <div className={styles.timeCell}></div>
                
                {/* Cellule de Jeudi avec des événements */}
                <div className={styles.timeCell}>
                  {hour === 8 && (
                    <div className={`${styles.eventBlock} ${styles.event1}`} style={{ top: '0', height: '110px' }}>
                      <div className={styles.eventTitle}>JOHNNY DOUG</div>
                      <div className={styles.eventTime}>08:00 - 09:50</div>
                    </div>
                  )}
                  {hour === 14 && (
                    <div className={`${styles.eventBlock} ${styles.event2}`} style={{ top: '30px', height: '80px' }}>
                      <div className={styles.eventTitle}>MARIE L.</div>
                      <div className={styles.eventTime}>14:30 - 15:50</div>
                    </div>
                  )}
                </div>
                
                <div className={styles.timeCell}>
                  {hour === 10 && (
                    <div className={`${styles.eventBlock} ${styles.event3}`} style={{ top: '0', height: '50px' }}>
                      <div className={styles.eventTitle}>SOPHIE M.</div>
                      <div className={styles.eventTime}>10:00 - 10:50</div>
                    </div>
                  )}
                </div>
                <div className={styles.timeCell}></div>
                <div className={styles.timeCell}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SessionModal 
        isOpen={isSessionModalOpen} 
        onClose={() => setSessionModalOpen(false)} 
        clientName="JOHNNY DOUG"
        time="08:00"
        category="Cils"
      />

      <NewAppointmentModal 
        isOpen={isNewAppointmentModalOpen} 
        onClose={() => setNewAppointmentModalOpen(false)} 
      />

    </main>
  );
}

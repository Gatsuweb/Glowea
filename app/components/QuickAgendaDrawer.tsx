"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AgendaClientWrapper, { type AgendaClientWrapperProps } from "./AgendaClientWrapper";
import { markOnlineBookingNotificationsRead } from "../actions/appointmentActions";
import styles from "../dashboard/layout.module.css";

type QuickAgendaDrawerProps = {
  agendaData: AgendaClientWrapperProps & {
    onlineBookingUnreadCount?: number;
  };
};

export default function QuickAgendaDrawer({ agendaData }: QuickAgendaDrawerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(agendaData.onlineBookingUnreadCount || 0);
  const [isMarkingRead, startMarkingRead] = useTransition();
  const { onlineBookingUnreadCount = 0, ...agendaProps } = agendaData;

  useEffect(() => {
    setBadgeCount(onlineBookingUnreadCount);
  }, [onlineBookingUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openDrawer = () => {
    setIsOpen(true);

    if (badgeCount <= 0 || isMarkingRead) return;

    startMarkingRead(async () => {
      const result = await markOnlineBookingNotificationsRead();
      if (result.success) {
        setBadgeCount(0);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={styles.quickAgendaTab}
        onClick={openDrawer}
        aria-label="Ouvrir le planning rapide"
        aria-expanded={isOpen}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 2v4"></path>
          <path d="M16 2v4"></path>
          <rect x="3" y="4" width="18" height="18" rx="2"></rect>
          <path d="M3 10h18"></path>
          <path d="M11 14h1"></path>
          <path d="M16 14h1"></path>
          <path d="M7 18h1"></path>
        </svg>
        {badgeCount > 0 && (
          <span className={styles.quickAgendaBadge}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      <div
        className={`${styles.quickAgendaOverlay} ${isOpen ? styles.quickAgendaOverlayOpen : ""}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <aside
        className={`${styles.quickAgendaPanel} ${isOpen ? styles.quickAgendaPanelOpen : ""}`}
        aria-hidden={!isOpen}
        aria-label="Planning rapide"
      >
        <div className={styles.quickAgendaPanelHeader}>
          <div>
            <span>Planning</span>
            <strong>Semaine en cours</strong>
          </div>
          <button
            type="button"
            className={styles.quickAgendaClose}
            onClick={() => setIsOpen(false)}
            aria-label="Fermer le planning rapide"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>
        <div className={styles.quickAgendaPanelBody}>
          <AgendaClientWrapper {...agendaProps} displayMode="panel" />
        </div>
      </aside>
    </>
  );
}

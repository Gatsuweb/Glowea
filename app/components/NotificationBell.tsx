"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import styles from "./GlobalHeader.module.css";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.notificationWrapper} ref={dropdownRef}>
      <button className={styles.notificationBtn} onClick={() => setIsOpen(!isOpen)}>
        <Image src="/icones/notifications.svg" alt="Notifications" width={20} height={20} />
        <span className={styles.notificationBadge}>2</span>
      </button>

      {isOpen && (
        <div className={styles.notificationDropdown}>
          <div className={styles.notificationDropdownHeader}>
            <h3>Notifications</h3>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className={styles.notificationList}>
            <div className={styles.notificationItem}>
              <div className={styles.notificationDot}></div>
              <div className={styles.notificationContent}>
                <p>Nouveau rendez-vous avec <strong>Marie L.</strong></p>
                <span>Aujourd'hui à 14h30</span>
              </div>
            </div>
            <div className={styles.notificationItem}>
              <div className={styles.notificationDot}></div>
              <div className={styles.notificationContent}>
                <p><strong>Julie D.</strong> a modifié sa réservation</p>
                <span>Il y a 30 min</span>
              </div>
            </div>
            <div className={styles.notificationItem}>
              <div className={styles.notificationDot} style={{ backgroundColor: 'transparent' }}></div>
              <div className={styles.notificationContent}>
                <p style={{ color: '#888' }}>Campagne "Promo Été" envoyée</p>
                <span>Hier</span>
              </div>
            </div>
          </div>
          <div className={styles.notificationFooter}>
            <button>Marquer tout comme lu</button>
          </div>
        </div>
      )}
    </div>
  );
}

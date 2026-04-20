'use client';

import { useEffect } from 'react';
import styles from './NewAppointmentModal.module.css';

interface NewAppointmentModalProps {
  onClose: () => void;
}

export default function NewAppointmentModal({ onClose }: NewAppointmentModalProps) {
  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        
        {/* Header de la modale */}
        <div className={styles.headerCard}>
          <button className={styles.backButton} onClick={onClose} aria-label="Retour">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <h2 className={styles.title}>Nouveau Rendez-vous</h2>

          <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Section CLIENT */}
        <div className={`${styles.sectionCard} ${styles.texturedCard}`}>
          <h3 className={styles.sectionTitle}>CLIENT</h3>
          <div className={styles.clientRow}>
            <div className={styles.inputPill}></div>
            <button className={styles.plusBtn}>+</button>
          </div>
        </div>

        {/* Section DATE & HEURES */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>DATE & HEURES</h3>
          <div className={styles.datePill}></div>
          <div className={styles.hoursRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={styles.hourPill}></div>
            ))}
          </div>
        </div>

        {/* Section CATÉGORIE */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>CATÉGORIE</h3>
          <div className={styles.categoryRow}>
            <button className={styles.catBtn}>ONGLES</button>
            <button className={styles.catBtn}>CILS</button>
          </div>
        </div>

        {/* Section PRESTATION */}
        <div className={`${styles.sectionCard} ${styles.texturedCard}`}>
          <h3 className={styles.sectionTitle}>PRESTATION</h3>
          <button className={styles.subLink}>Refaire dernière prestation : Remplissage ↗</button>
          <div className={styles.prestationRow}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.prestationCard}></div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

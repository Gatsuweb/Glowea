'use client';

import { useEffect } from 'react';
import styles from './NewClientModal.module.css';

interface NewClientModalProps {
  onClose: () => void;
}

export default function NewClientModal({ onClose }: NewClientModalProps) {
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
          
          <h2 className={styles.title}>Nouveau Client</h2>

          <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Section INFORMATIONS PERSONNELLES */}
        <div className={`${styles.sectionCard} ${styles.texturedCard}`}>
          <h3 className={styles.sectionTitle}>INFORMATIONS PERSONNELLES</h3>
          <div className={styles.formGrid}>
            <input type="text" className={styles.inputPill} placeholder="Nom" />
            <input type="text" className={styles.inputPill} placeholder="Prénom" />
            <input type="tel" className={styles.inputPill} placeholder="Téléphone" />
            <input type="email" className={styles.inputPill} placeholder="Email" />
          </div>
        </div>

        {/* Section NOTES / PRÉFÉRENCES */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>NOTES / PRÉFÉRENCES</h3>
          <textarea 
            className={styles.textareaPill} 
            placeholder="Allergies, habitudes, type de pose favorite..."
          ></textarea>
        </div>

        {/* Bouton d'action */}
        <button className={styles.saveButton} onClick={onClose}>
          ENREGISTRER LE CLIENT
        </button>

      </div>
    </div>
  );
}

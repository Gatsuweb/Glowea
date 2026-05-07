"use client";

import { useState } from 'react';
import styles from './NewAppointmentModal.module.css'; // On réutilise le même style

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromoModal({ isOpen, onClose }: PromoModalProps) {
  const [promoName, setPromoName] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    // Logique d'envoi de la promo
    console.log("Promo envoyée:", { promoName, discountType, discountValue, message });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className={styles.title}>Nouveau Template</h1>
        </div>

        {/* DÉTAILS DE L'OFFRE */}
        <div className={styles.sectionPink} style={{ padding: '20px' }}>
          <div className={styles.sectionTitle}>TEMPLATE</div>
          
          <input 
            type="text" 
            className={styles.clientInput} 
            placeholder="Nom de la promotion (ex: Offre Printemps)" 
            value={promoName}
            onChange={(e) => setPromoName(e.target.value)}
            style={{ marginBottom: '15px' }}
          />

          <div className={styles.categoryTabs} style={{ marginBottom: '15px' }}>
            <button 
              className={`${styles.categoryBtn} ${discountType === 'PERCENT' ? styles.active : ''}`}
              onClick={() => setDiscountType('PERCENT')}
              style={{ flex: 1 }}
            >
              Pourcentage (%)
            </button>
            <button 
              className={`${styles.categoryBtn} ${discountType === 'FIXED' ? styles.active : ''}`}
              onClick={() => setDiscountType('FIXED')}
              style={{ flex: 1 }}
            >
              Montant Fixe (€)
            </button>
          </div>

          <input 
            type="number" 
            className={styles.clientInput} 
            placeholder={discountType === 'PERCENT' ? "Valeur (ex: 20)" : "Valeur (ex: 15)"} 
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>

        {/* MESSAGE */}
        <div className={styles.sectionWhite} style={{ padding: '20px' }}>
          <div className={styles.sectionTitle}>MESSAGE (SMS / EMAIL)</div>
          <textarea 
            className={styles.notesInput} 
            placeholder="Rédigez le message qui accompagnera la promotion..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ minHeight: '120px' }}
          ></textarea>
        </div>

        {/* VALIDATION */}
        <button className={styles.submitBtn} onClick={handleSend}>
          Enregistrer le template
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </button>

      </div>
    </div>
  );
}

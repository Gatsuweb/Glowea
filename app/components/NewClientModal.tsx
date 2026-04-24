"use client";

import React, { useState } from 'react';
import styles from './NewAppointmentModal.module.css'; // On réutilise le même style

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientName: string) => void;
}

export default function NewClientModal({ isOpen, onClose, onSave }: NewClientModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [recommendedBy, setRecommendedBy] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    // Logique de sauvegarde ici
    const fullName = `${firstName} ${lastName}`.trim() || "Nouveau Client";
    onSave(fullName);
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
          <h1 className={styles.title}>Nouveau Client</h1>
        </div>

        {/* INFORMATIONS CLIENT */}
        <div className={styles.sectionPink}>
          <div className={styles.sectionTitle}>INFORMATIONS PERSONNELLES</div>
          
          <div className={styles.newClientForm}>
            <div className={styles.newClientRow}>
              <input 
                type="text" 
                className={styles.clientInput} 
                placeholder="Prénom" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ flex: 1 }} 
              />
              <input 
                type="text" 
                className={styles.clientInput} 
                placeholder="Nom" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ flex: 1 }} 
              />
            </div>
            
            <input 
              type="tel" 
              className={styles.clientInput} 
              placeholder="Téléphone" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            
            <input 
              type="email" 
              className={styles.clientInput} 
              placeholder="Adresse e-mail (optionnel)" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <div className={styles.newClientRow}>
              <input 
                type="text" 
                className={styles.clientInput} 
                placeholder="Pseudo Instagram (optionnel)" 
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                style={{ flex: 1 }} 
              />
              <input 
                type="text" 
                className={styles.clientInput} 
                placeholder="Date de naissance (ex: 25/03/1995)" 
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                style={{ flex: 1 }} 
              />
            </div>

            <input 
              type="text" 
              className={styles.clientInput} 
              placeholder="Recommandé(e) par :" 
              value={recommendedBy}
              onChange={(e) => setRecommendedBy(e.target.value)}
            />
          </div>
        </div>

        {/* VALIDATION */}
        <button className={styles.submitBtn} onClick={handleSave}>
          Enregistrer le client
        </button>

      </div>
    </div>
  );
}

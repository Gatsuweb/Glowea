"use client";

import React, { useState } from 'react';
import styles from './NewAppointmentModal.module.css'; // On réutilise le même style
import { useRouter } from 'next/navigation';
import { schedule24hRemindersForUpcomingAppointments } from '../actions/appointmentActions';

interface SendPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SendPromoModal({ isOpen, onClose }: SendPromoModalProps) {
  const router = useRouter();
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'TOP' | 'INACTIVE'>('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const templates = [
    {
      id: "t1",
      name: "Confirmation de Rendez-vous",
      desc: "Envoyé immédiatement après une réservation",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
    },
    {
      id: "t2",
      name: "Offre Printemps -20%",
      desc: "Promotion spéciale sur les poses complètes",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8l4 4-4 4M8 12h8"></path></svg>
    },
    {
      id: "t3",
      name: "Rappel 24h Avant",
      desc: "Pour éviter les no-shows",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    }
  ];

  const handleSend = async () => {
    if (!selectedTemplate) {
      alert("Veuillez sélectionner un template");
      return;
    }
    setIsSending(true);
    try {
      if (selectedTemplate === "t3") {
        const res = await schedule24hRemindersForUpcomingAppointments();
        if (!res?.success) {
          alert("Impossible d'activer le rappel 24h avant.");
          return;
        }
        alert(`Rappel 24h avant activé : ${res.remindersScheduled} rendez-vous planifié(s).`);
        onClose();
        return;
      }

      console.log("Envoi de la promo:", { targetAudience, templateId: selectedTemplate });
      alert("Campagne envoyée (démo).");
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateNewTemplate = () => {
    onClose();
    router.push('/dashboard/profil');
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
          <h1 className={styles.title}>Envoyer une Campagne</h1>
        </div>

        {/* AUDIENCE */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>1. SÉLECTIONNER LA CIBLE</div>
          <div className={styles.categoryTabs}>
            <button 
              className={`${styles.categoryBtn} ${targetAudience === 'ALL' ? styles.active : ''}`}
              onClick={() => setTargetAudience('ALL')}
              style={{ padding: '10px 15px', flex: 1 }}
            >
              Toutes
            </button>
            <button 
              className={`${styles.categoryBtn} ${targetAudience === 'TOP' ? styles.active : ''}`}
              onClick={() => setTargetAudience('TOP')}
              style={{ padding: '10px 15px', flex: 1 }}
            >
              Top Clientes
            </button>
            <button 
              className={`${styles.categoryBtn} ${targetAudience === 'INACTIVE' ? styles.active : ''}`}
              onClick={() => setTargetAudience('INACTIVE')}
              style={{ padding: '10px 15px', flex: 1 }}
            >
              Inactives
            </button>
          </div>
        </div>

        {/* SÉLECTION TEMPLATE */}
        <div className={styles.sectionPink} style={{ padding: '20px' }}>
          <div className={styles.sectionTitle}>2. SÉLECTIONNER UN TEMPLATE</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {templates.map(t => (
              <div 
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: 'white',
                  borderRadius: '12px',
                  border: `2px solid ${selectedTemplate === t.id ? 'var(--tertiary)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: 'var(--secondary)', display: 'flex', 
                  justifyContent: 'center', alignItems: 'center', color: 'var(--tertiary)'
                }}>
                  {t.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#333' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{t.desc}</div>
                </div>
                <div style={{ 
                  width: '20px', height: '20px', borderRadius: '50%', 
                  border: `2px solid ${selectedTemplate === t.id ? 'var(--tertiary)' : '#CCC'}`,
                  background: selectedTemplate === t.id ? 'var(--tertiary)' : 'transparent',
                  display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                  {selectedTemplate === t.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
              </div>
            ))}

            {/* BOUTON CRÉER NOUVEAU TEMPLATE */}
            <div 
              onClick={handleCreateNewTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '15px',
                background: 'transparent',
                borderRadius: '12px',
                border: '2px dashed var(--tertiary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: '10px'
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'rgba(139, 75, 84, 0.1)', display: 'flex', 
                justifyContent: 'center', alignItems: 'center', color: 'var(--tertiary)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--tertiary)' }}>Créer un nouveau template</div>
              </div>
            </div>
          </div>
        </div>

        {/* VALIDATION */}
        <button 
          className={styles.submitBtn} 
          onClick={handleSend}
          disabled={isSending}
        >
          {isSending ? "Envoi..." : "Envoyer la campagne"}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>

      </div>
    </div>
  );
}

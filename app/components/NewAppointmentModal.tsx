"use client";

import React, { useState } from 'react';
import styles from './NewAppointmentModal.module.css';
import NewClientModal from './NewClientModal';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewAppointmentModal({ isOpen, onClose }: NewAppointmentModalProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [category, setCategory] = useState<'ONGLES' | 'CILS' | null>(null);
  const [selectedPrestation, setSelectedPrestation] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Mock list of clients
  const clientsList = [
    "Sophie Doe",
    "Laura Croft",
    "Emma L.",
    "Marie Dupont",
    "Julie Martin"
  ];

  const filteredClients = clientsList.filter(client => 
    client.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (!isOpen) return null;

  const timeSlots = ["8:00", "9:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  
  const prestationsCils = [
    { id: 'pose_complete', title: 'Pose Complète', price: '60€', time: '2h00' },
    { id: 'remplissage_2', title: 'Remplissage 2 sem', price: '40€', time: '1h15' },
    { id: 'remplissage_3', title: 'Remplissage 3 sem', price: '50€', time: '1h30' },
  ];

  const prestationsOngles = [
    { id: 'pose_chablon', title: 'Pose Chablons', price: '55€', time: '1h45' },
    { id: 'remplissage_ongles', title: 'Remplissage', price: '45€', time: '1h15' },
    { id: 'semi_permanent', title: 'Semi-Permanent', price: '35€', time: '1h00' },
  ];

  // Si on n'a pas sélectionné de catégorie, on affiche par défaut celles des cils (ou rien, mais pour l'UX c'est bien d'en avoir)
  const currentPrestations = category === 'ONGLES' ? prestationsOngles : prestationsCils;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => {
        e.stopPropagation();
        setDropdownOpen(false); // Ferme le menu si on clique ailleurs dans la modale
      }}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className={styles.title}>Nouveau Rendez-vous</h1>
        </div>

        {/* CLIENT SECTION */}
        <div className={styles.sectionPink}>
          <div className={styles.sectionTitle}>CLIENT</div>
          
          <div className={styles.clientRow}>
            <div className={styles.clientInputWrapper} onClick={(e) => e.stopPropagation()}>
              <input 
                type="text" 
                className={styles.clientInput} 
                placeholder="Rechercher un client..." 
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
              />
              
              {isDropdownOpen && (
                <div className={styles.clientDropdown}>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client, index) => (
                      <div 
                        key={index} 
                        className={styles.clientDropdownItem}
                        onClick={() => {
                          setClientSearch(client);
                          setDropdownOpen(false);
                        }}
                      >
                        {client}
                      </div>
                    ))
                  ) : (
                    <div className={styles.clientDropdownEmpty}>
                      Aucun client trouvé avec ce nom.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button 
              className={styles.clientAddBtn}
              onClick={() => {
                setIsCreatingClient(true);
                setDropdownOpen(false);
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* DATE & HEURES */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>DATE & HEURES</div>
          <input 
            type="text" 
            className={styles.timeInput} 
            placeholder="Sélectionner l'horaire" 
            value={selectedTime ? selectedTime : ''} 
            readOnly 
          />
          <div className={styles.timeSlots}>
            {timeSlots.map((time) => (
              <button 
                key={time} 
                className={`${styles.timeSlot} ${selectedTime === time ? styles.active : ''}`}
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* CATÉGORIE */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>CATÉGORIE</div>
          <div className={styles.categoryTabs}>
            <button 
              className={`${styles.categoryBtn} ${category === 'ONGLES' ? styles.active : ''}`}
              onClick={() => setCategory('ONGLES')}
            >
              ONGLES
            </button>
            <button 
              className={`${styles.categoryBtn} ${category === 'CILS' ? styles.active : ''}`}
              onClick={() => setCategory('CILS')}
            >
              CILS
            </button>
          </div>
        </div>

        {/* PRESTATION */}
        <div className={styles.sectionPink}>
          <div className={styles.prestationHeader}>
            <div className={styles.sectionTitle} style={{ marginBottom: '5px' }}>PRESTATION</div>
            <a className={styles.prestationLink}>
              Refaire dernière prestation : Remplissage 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          </div>
          
          <div className={styles.prestationCards}>
            {currentPrestations.map((prest) => (
              <div 
                key={prest.id} 
                className={`${styles.prestationCard} ${selectedPrestation === prest.id ? styles.active : ''}`}
                onClick={() => setSelectedPrestation(prest.id)}
              >
                <span className={styles.prestationTitle}>{prest.title}</span>
                <span className={styles.prestationPrice}>{prest.price}</span>
                <span className={styles.prestationTime}>{prest.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NOTES ADDITIONNELLES */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>NOTES ADDITIONNELLES</div>
          <textarea 
            className={styles.notesInput} 
            placeholder="Ajouter une note ou une demande spécifique..."
          ></textarea>
        </div>

        {/* VALIDATION */}
        <button className={styles.submitBtn}>
          Confirmer le rendez-vous
        </button>

      </div>

      {/* Modal Nouveau Client par dessus */}
      <NewClientModal 
        isOpen={isCreatingClient} 
        onClose={() => setIsCreatingClient(false)} 
        onSave={(clientName) => {
          setClientSearch(clientName);
        }}
      />
    </div>
  );
}

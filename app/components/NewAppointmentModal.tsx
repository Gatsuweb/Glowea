"use client";

import React, { useState, useEffect } from 'react';
import styles from './NewAppointmentModal.module.css';
import NewClientModal from './NewClientModal';
import NewServiceModal from './NewServiceModal';
import { createAppointment, updateAppointment } from '../actions/appointmentActions';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients?: any[];
  services?: any[];
  initialData?: any;
}

export default function NewAppointmentModal({ 
  isOpen, 
  onClose, 
  clients = [], 
  services = [],
  initialData = null
}: NewAppointmentModalProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPrestation, setSelectedPrestation] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localServices, setLocalServices] = useState(services);

  useEffect(() => {
    setLocalServices(services);
  }, [services]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Pre-fill for edit
        const date = new Date(initialData.scheduledAt);
        setSelectedDate(date.toISOString().split('T')[0]);
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ':');
        // Keep timeStr as HH:mm to match timeSlots and input type="time"
        setSelectedTime(timeStr);
        setClientSearch(initialData.client?.name || '');
        setSelectedClientId(initialData.client?.id || null);
        setSelectedPrestation(initialData.service?.id || null);
        // Notes aren't in initialData yet, but could be added later
      } else {
        // Reset for new
        setSelectedTime(null);
        setSelectedDate(new Date().toISOString().split('T')[0]);
        setSelectedPrestation(null);
        setClientSearch('');
        setSelectedClientId(null);
        setNotes('');
      }
    }
  }, [isOpen, initialData]);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (!isOpen) return null;

  // We generate timeslots from 8:00 to 18:00 (toutes les heures)
  const timeSlots = [];
  for (let i = 8; i <= 18; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  }

  // Filter services by category if needed, here we just show all services
  const currentPrestations = localServices;

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedPrestation || !selectedTime || !selectedDate) {
      alert("Veuillez remplir tous les champs obligatoires (Client, Date, Heure, Prestation)");
      return;
    }

    setIsSubmitting(true);

    const [hours, minutes] = selectedTime.split(':');
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const appointmentData = {
      clientId: selectedClientId,
      serviceId: selectedPrestation,
      scheduledAt,
      notes,
    };

    try {
      if (initialData) {
        await updateAppointment(initialData.id, appointmentData);
      } else {
        await createAppointment(appointmentData);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => {
        e.stopPropagation();
        setDropdownOpen(false);
      }}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className={styles.title}>{initialData ? 'Modifier Rendez-vous' : 'Nouveau Rendez-vous'}</h1>
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
                  setSelectedClientId(null);
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
                          setClientSearch(client.name);
                          setSelectedClientId(client.id);
                          setDropdownOpen(false);
                        }}
                      >
                        {client.name}
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input 
              type="time" 
              className={styles.dateInput}
              value={selectedTime || ''}
              onChange={(e) => setSelectedTime(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>
          <div className={styles.timeSlots} style={{ maxHeight: '150px', overflowY: 'auto' }}>
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

        {/* PRESTATION */}
        <div className={styles.sectionPink}>
          <div className={styles.prestationHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className={styles.sectionTitle} style={{ marginBottom: '0' }}>PRESTATION</div>
            <button 
              className={styles.addServiceBtn} 
              onClick={(e) => {
                e.stopPropagation();
                setIsCreatingService(true);
              }}
            >
              + Nouvelle prestation
            </button>
          </div>
          
          {currentPrestations.length > 0 ? (
            <div className={styles.prestationCards} style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {currentPrestations.map((prest) => (
                <div 
                  key={prest.id} 
                  className={`${styles.prestationCard} ${selectedPrestation === prest.id ? styles.active : ''}`}
                  onClick={() => setSelectedPrestation(prest.id)}
                >
                  <span className={styles.prestationTitle}>{prest.name}</span>
                  <span className={styles.prestationPrice}>{prest.price}€</span>
                  <span className={styles.prestationTime}>{prest.durationMin}min</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontStyle: 'italic', background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
              Aucune prestation disponible.<br />
              <span style={{ fontSize: '0.85rem' }}>Cliquez sur "+ Nouvelle prestation" pour en ajouter une.</span>
            </div>
          )}
        </div>

        {/* NOTES ADDITIONNELLES */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>NOTES ADDITIONNELLES</div>
          <textarea 
            className={styles.notesInput} 
            placeholder="Ajouter une note ou une demande spécifique..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        {/* VALIDATION */}
        <button 
          className={styles.submitBtn} 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enregistrement...' : (initialData ? 'Enregistrer les modifications' : 'Confirmer le rendez-vous')}
        </button>

      </div>

      {/* Modal Nouveau Client par dessus */}
      <NewClientModal 
        isOpen={isCreatingClient} 
        onClose={() => setIsCreatingClient(false)} 
        onSave={(client) => {
          setClientSearch(client.fullName || client.firstName);
          setSelectedClientId(client.id);
        }}
      />
      {/* Modal Nouvelle Prestation par dessus */}
      <NewServiceModal 
        isOpen={isCreatingService} 
        onClose={() => setIsCreatingService(false)} 
        onSave={(service) => {
          setLocalServices(prev => [...prev, service]);
          setSelectedPrestation(service.id);
        }}
      />
    </div>
  );
}
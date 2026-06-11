"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './NewAppointmentModal.module.css';
import NewClientModal from './NewClientModal';
import NewServiceModal from './NewServiceModal';
import { createAppointment, updateAppointment } from '../actions/appointmentActions';
import { useRouter } from 'next/navigation';

type ClientOption = {
  id: string;
  name: string;
  fullName?: string;
  firstName?: string;
};

type ServiceOption = {
  id: string;
  name: string;
  price: string | number;
  durationMin: number;
  color?: string | null;
};

type AppointmentInitialData = {
  id: string;
  scheduledAt: string | Date;
  endAt?: string | Date | null;
  status?: "SCHEDULED" | "PENDING_PAYMENT" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "EXPIRED" | "NO_SHOW";
  price?: number | null;
  notes?: string | null;
  client?: ClientOption | null;
  service?: ServiceOption | null;
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function addMinutesToTime(time: string | null, minutesToAdd: number) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd, 0, 0);
  return formatTimeInput(date);
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients?: ClientOption[];
  services?: ServiceOption[];
  initialData?: AppointmentInitialData | null;
  initialScheduledAt?: string | Date | null;
  initialEndAt?: string | Date | null;
  onSaved?: () => void;
}

export default function NewAppointmentModal({ 
  isOpen, 
  onClose, 
  clients = [], 
  services = [],
  initialData = null,
  initialScheduledAt = null,
  initialEndAt = null,
  onSaved,
}: NewAppointmentModalProps) {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateInput(new Date()));
  const [selectedPrestation, setSelectedPrestation] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [notes, setNotes] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [endTime, setEndTime] = useState('');
  const [priceEuros, setPriceEuros] = useState('0');
  const [status, setStatus] = useState<"SCHEDULED" | "PENDING_PAYMENT" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "EXPIRED" | "NO_SHOW">("SCHEDULED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localServices, setLocalServices] = useState(services);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setLocalServices(services);
  }, [services]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Pre-fill for edit
        const date = new Date(initialData.scheduledAt);
        setSelectedDate(formatDateInput(date));
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ':');
        // Keep timeStr as HH:mm to match timeSlots and input type="time"
        setSelectedTime(timeStr);
        setClientSearch(initialData.client?.name || '');
        setSelectedClientId(initialData.client?.id || null);
        setSelectedPrestation(initialData.service?.id || null);
        setNotes(initialData.notes || '');
        const endAt = initialData.endAt ? new Date(initialData.endAt) : null;
        const computedDuration = endAt && endAt > date
          ? Math.round((endAt.getTime() - date.getTime()) / 60000)
          : Number(initialData.service?.durationMin || 60);
        setDurationMin(String(computedDuration || 60));
        setEndTime(endAt && endAt > date ? formatTimeInput(endAt) : addMinutesToTime(timeStr, computedDuration || 60));
        setPriceEuros(initialData.price !== null && initialData.price !== undefined
          ? String(initialData.price / 100)
          : String(initialData.service?.price || 0));
        setStatus(initialData.status || "SCHEDULED");
        setError(null);
      } else {
        // Reset for new
        const slotDate = initialScheduledAt ? new Date(initialScheduledAt) : null;
        const slotEndDate = initialEndAt ? new Date(initialEndAt) : null;
        const selectedDuration = slotDate && slotEndDate && slotEndDate > slotDate
          ? Math.round((slotEndDate.getTime() - slotDate.getTime()) / 60000)
          : 60;
        setSelectedTime(slotDate ? slotDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null);
        setSelectedDate(slotDate ? formatDateInput(slotDate) : formatDateInput(new Date()));
        setSelectedPrestation(null);
        setClientSearch('');
        setSelectedClientId(null);
        setNotes('');
        setDurationMin(String(selectedDuration));
        setEndTime(slotDate ? addMinutesToTime(formatTimeInput(slotDate), selectedDuration) : "");
        setPriceEuros('0');
        setStatus("SCHEDULED");
        setError(null);
      }
    }
  }, [isOpen, initialData, initialScheduledAt, initialEndAt]);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (!isOpen || !isMounted) return null;

  // We generate timeslots from 8:00 to 18:30 in 30-minute increments.
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // Filter services by category if needed, here we just show all services
  const currentPrestations = localServices;
  const preservesCalendarSelection = Boolean(!initialData && initialScheduledAt && initialEndAt);

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedPrestation || !selectedTime || !selectedDate) {
      setError("Veuillez remplir tous les champs obligatoires (client, date, heure, prestation).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const [hours, minutes] = selectedTime.split(':');
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const selectedService = currentPrestations.find((service) => service.id === selectedPrestation);
    const finalDuration = Math.min(480, Math.max(15, Math.round(Number(durationMin) || Number(selectedService?.durationMin) || 60)));
    const finalPriceEuros = Number(priceEuros.replace(",", "."));
    const endAt = new Date(scheduledAt.getTime() + finalDuration * 60000);

    const appointmentData = {
      clientId: selectedClientId,
      serviceId: selectedPrestation,
      scheduledAt,
      endAt,
      price: Number.isFinite(finalPriceEuros) && finalPriceEuros >= 0 ? Math.round(finalPriceEuros * 100) : 0,
      notes,
    };

    try {
      const response = initialData
        ? await updateAppointment(initialData.id, { ...appointmentData, status })
        : await createAppointment(appointmentData);

      if (!response.success) {
        setError(response.error || "Impossible d'enregistrer ce rendez-vous.");
        return;
      }

      router.refresh();
      if (initialData) {
        setError(null);
      } else {
        setError(null);
      }
      onClose();
      onSaved?.();
    } catch (error) {
      console.error(error);
      setError("Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modal = (
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
              aria-label="Heure de debut"
              value={selectedTime || ''}
              onChange={(e) => {
                setSelectedTime(e.target.value);
                setEndTime(addMinutesToTime(e.target.value, Number(durationMin) || 60));
              }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input
              type="time"
              className={styles.dateInput}
              aria-label="Heure de fin"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                if (!selectedTime) return;
                const [startHours, startMinutes] = selectedTime.split(":").map(Number);
                const [endHours, endMinutes] = e.target.value.split(":").map(Number);
                const nextDuration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                if (Number.isFinite(nextDuration) && nextDuration > 0) {
                  setDurationMin(String(nextDuration));
                }
              }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              title="Heure de fin"
            />
          </div>
          <div className={styles.timeSlots} style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {timeSlots.map((time) => (
              <button 
                key={time} 
                className={`${styles.timeSlot} ${selectedTime === time ? styles.active : ''}`}
                onClick={() => {
                  setSelectedTime(time);
                  setEndTime(addMinutesToTime(time, Number(durationMin) || 60));
                }}
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
                  onClick={() => {
                    setSelectedPrestation(prest.id);
                    if (!preservesCalendarSelection) {
                      const nextDuration = prest.durationMin || 60;
                      setDurationMin(String(nextDuration));
                      setEndTime(addMinutesToTime(selectedTime, nextDuration));
                    }
                    setPriceEuros(String(prest.price || 0));
                  }}
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
              <span style={{ fontSize: '0.85rem' }}>Cliquez sur &quot;+ Nouvelle prestation&quot; pour en ajouter une.</span>
            </div>
          )}
        </div>

        {/* DETAILS RDV */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>DETAILS DU RENDEZ-VOUS</div>
          <div className={styles.detailsGrid}>
            <label>
              Duree (minutes)
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={durationMin}
                onChange={(e) => {
                  setDurationMin(e.target.value);
                  setEndTime(addMinutesToTime(selectedTime, Number(e.target.value) || 60));
                }}
              />
            </label>
            <label>
              Prix (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceEuros}
                onChange={(e) => setPriceEuros(e.target.value)}
              />
            </label>
            {initialData && (
              <label>
                Statut
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="SCHEDULED">Planifie</option>
                  <option value="PENDING_PAYMENT">Attente paiement</option>
                  <option value="CONFIRMED">Confirme</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Termine</option>
                  <option value="CANCELED">Annule</option>
                  <option value="EXPIRED">Expire</option>
                  <option value="NO_SHOW">No-show</option>
                </select>
              </label>
            )}
          </div>
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
        {error && (
          <div style={{ color: '#8B1E2D', background: '#FFF2F4', border: '1px solid #F0B8C0', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
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
          setClientSearch([client.firstName, client.lastName].filter(Boolean).join(" "));
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
          if (!preservesCalendarSelection) {
            const nextDuration = service.durationMin || 60;
            setDurationMin(String(nextDuration));
            setEndTime(addMinutesToTime(selectedTime, nextDuration));
          }
          setPriceEuros(String(service.price || 0));
        }}
      />
    </div>
  );

  return createPortal(modal, document.body);
}

"use client";

import React, { useState } from 'react';
import styles from './NewAppointmentModal.module.css'; // On réutilise le même style
import { createClient } from '../actions/clientActions';
import { useRouter } from 'next/navigation';

type CreatedClient = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
};

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (client: CreatedClient) => void;
}

export default function NewClientModal({ isOpen, onClose, onSave }: NewClientModalProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [recommendedBy, setRecommendedBy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError('Le prénom est obligatoire');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse birthdate if provided (ex: 25/03/1995 -> Date)
      let parsedDate: Date | undefined;
      if (birthdate) {
        const parts = birthdate.split('/');
        if (parts.length === 3) {
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      const response = await createClient({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        instagram: instagram.trim() || undefined,
        birthDate: parsedDate,
        referredBy: recommendedBy.trim() || undefined,
      });

      if (response.success && response.client) {
        if (onSave) {
          onSave(response.client);
        }
        
        // Reset form
        setFirstName('');
        setLastName('');
        setPhone('');
        setEmail('');
        setInstagram('');
        setBirthdate('');
        setRecommendedBy('');
        
        router.refresh();
        onClose();
      } else {
        setError(response.error || 'Erreur lors de la création du client');
      }
    } catch {
      setError('Une erreur inattendue est survenue');
    } finally {
      setIsLoading(false);
    }
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
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <button className={styles.submitBtn} onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Création en cours...' : 'Enregistrer le client'}
        </button>

      </div>
    </div>
  );
}

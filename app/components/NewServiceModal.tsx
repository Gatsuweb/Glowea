import React, { useState } from 'react';
import styles from './NewAppointmentModal.module.css'; // On réutilise le même style pour la cohérence
import { createService } from '../actions/serviceActions';
import { useRouter } from 'next/navigation';

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (service: any) => void;
}

export default function NewServiceModal({ isOpen, onClose, onSave }: NewServiceModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom de la prestation est obligatoire');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createService({
        name: name.trim(),
        price: price ? parseFloat(price) : undefined,
        durationMin: durationMin ? parseInt(durationMin, 10) : undefined,
      });

      if (response.success) {
        if (onSave) {
          onSave(response.service);
        }
        
        // Reset form
        setName('');
        setPrice('');
        setDurationMin('60');
        
        router.refresh();
        onClose();
      } else {
        setError('Erreur lors de la création de la prestation');
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1100 }}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className={styles.title}>Nouvelle Prestation</h1>
        </div>

        <div className={styles.sectionWhite}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nom de la prestation *</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Ex: Pose cil à cil" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Prix (€)</label>
            <input 
              type="number" 
              className={styles.input} 
              placeholder="Ex: 50" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Durée (minutes)</label>
            <input 
              type="number" 
              className={styles.input} 
              placeholder="Ex: 60" 
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </div>
        </div>

        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <button className={styles.submitBtn} onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Création en cours...' : 'Enregistrer la prestation'}
        </button>

      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./PaymentModal.module.css";
import { processPayment } from "../actions/paymentActions";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  defaultAmount?: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  appointmentId,
  clientId,
  clientName,
  serviceName,
  defaultAmount = 0
}: PaymentModalProps) {
  const [amount, setAmount] = useState<string>(defaultAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "OTHER">("CARD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount.toString());
      setPaymentMethod("CARD");
    }
  }, [isOpen, defaultAmount]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
      alert("Veuillez entrer un montant valide.");
      return;
    }

    setIsSubmitting(true);
    const res = await processPayment({
      appointmentId,
      clientId,
      amount: Number(amount),
      paymentMethod,
      serviceName
    });
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      alert(res.error || "Une erreur est survenue lors du paiement.");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Clôturer le rendez-vous</h2>
            <p>{clientName} • {serviceName}</p>
          </div>
          <button className={styles.btnClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.formGroup}>
            <label>Montant total (€)</label>
            <input 
              type="number" 
              className={styles.inputAmount} 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Moyen de paiement</label>
            <div className={styles.methodsGrid}>
              <button 
                className={`${styles.methodBtn} ${paymentMethod === 'CARD' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <span>Carte Bancaire</span>
              </button>
              <button 
                className={`${styles.methodBtn} ${paymentMethod === 'CASH' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('CASH')}
              >
                <span>Espèces</span>
              </button>
              <button 
                className={`${styles.methodBtn} ${paymentMethod === 'TRANSFER' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('TRANSFER')}
              >
                <span>Virement</span>
              </button>
              <button 
                className={`${styles.methodBtn} ${paymentMethod === 'OTHER' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('OTHER')}
              >
                <span>Autre</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
            Annuler
          </button>
          <button className={styles.btnConfirm} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Traitement..." : "Valider le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}

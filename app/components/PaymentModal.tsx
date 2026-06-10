"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./PaymentModal.module.css";
import {
  formatAppointmentPaymentMethod,
  getAppointmentFinancialSummary,
  getAppointmentPaymentLabel,
} from "../../lib/appointmentFinance";

type PaymentStatusValue =
  | "none"
  | "deposit_pending"
  | "deposit_paid"
  | "partial_paid"
  | "paid"
  | "paid_offline"
  | "refunded"
  | string;

type PaymentMethod = "cash" | "paypal" | "bank_transfer" | "check" | "other";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  defaultAmount?: number;
  price?: number | null;
  depositAmount?: number | null;
  depositPaidAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: PaymentStatusValue;
  paymentsEnabled?: boolean;
  mode?: "payment" | "closeout";
}

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Especes",
  paypal: "PayPal",
  bank_transfer: "Virement",
  check: "Cheque",
  other: "Autre",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function PaymentModal({
  isOpen,
  onClose,
  appointmentId,
  clientName,
  serviceName,
  defaultAmount = 0,
  price,
  depositAmount,
  depositPaidAmount,
  paidAmount,
  remainingAmount,
  paymentMethod,
  paymentStatus = "none",
  paymentsEnabled = false,
  mode = "closeout",
}: PaymentModalProps) {
  const router = useRouter();
  const [offlinePaymentMethod, setOfflinePaymentMethod] = useState<PaymentMethod>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const financialSummary = useMemo(
    () =>
      getAppointmentFinancialSummary({
        price: typeof price === "number" ? price : null,
        depositAmount: typeof depositAmount === "number" ? depositAmount : null,
        depositPaidAmount: typeof depositPaidAmount === "number" ? depositPaidAmount : null,
        paidAmount: typeof paidAmount === "number" ? paidAmount : null,
        remainingAmount: typeof remainingAmount === "number" ? remainingAmount : null,
        paymentStatus,
        paymentMethod,
        Service: { price: defaultAmount },
      }),
    [price, depositAmount, depositPaidAmount, paidAmount, remainingAmount, paymentStatus, paymentMethod, defaultAmount]
  );

  const priceCents = financialSummary.priceCents;
  const paidCents = financialSummary.paidAmountCents;
  const depositPaidCents = financialSummary.depositPaidAmountCents;
  const remainingCents = financialSummary.remainingAmountCents;
  const statusLabel = getAppointmentPaymentLabel(financialSummary.paymentStatus);
  const paymentMethodLabel = formatAppointmentPaymentMethod(offlinePaymentMethod);
  const isPaid = financialSummary.paymentStatus === "paid" || financialSummary.paymentStatus === "paid_offline";
  const canUseStripe = Boolean(paymentsEnabled);

  if (!isOpen) return null;

  async function createPaymentLink(paymentType: "deposit" | "full" | "remaining") {
    if (!canUseStripe) {
      router.push("/settings/payments");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPaymentUrl(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/create-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Impossible de créer le lien de paiement.");
      }

      setPaymentUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markPaidOffline() {
    setIsSubmitting(true);
    setError(null);
    setPaymentUrl(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/mark-paid-offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: offlinePaymentMethod }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Impossible de marquer le rendez-vous comme payé.");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyPaymentLink() {
    if (!paymentUrl) return;
    await navigator.clipboard.writeText(paymentUrl);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>{mode === "closeout" ? "Clôturer le rendez-vous" : "Paiement du rendez-vous"}</h2>
            <p>{clientName} - {serviceName}</p>
          </div>
          <button className={styles.btnClose} onClick={onClose} type="button">x</button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.statusRow}>
            <span>Statut</span>
            <strong>{statusLabel}</strong>
          </div>

          <div className={styles.amountGrid}>
            <div>
              <span>Prix total</span>
              <strong>{formatMoney(priceCents)}</strong>
            </div>
            <div>
              <span>Montant encaiss&eacute;</span>
              <strong>{formatMoney(paidCents)}</strong>
            </div>
            <div>
              <span>Arrhes déjà versées</span>
              <strong>{formatMoney(depositPaidCents)}</strong>
            </div>
            <div>
              <span>Reste à payer</span>
              <strong>{formatMoney(remainingCents)}</strong>
            </div>
          </div>

          {!canUseStripe && (
            <div className={styles.warningBox}>
              Stripe Connect n&apos;est pas encore actif. Les actions Stripe redirigeront vers les paramètres paiements.
            </div>
          )}

          <div className={styles.actionGrid}>
            <button
              className={styles.btnConfirm}
              type="button"
              onClick={() => createPaymentLink("deposit")}
              disabled={isSubmitting || isPaid || paymentStatus === "deposit_paid" || paymentStatus === "partial_paid"}
            >
              Demander des arrhes
            </button>
            <button
              className={styles.btnConfirm}
              type="button"
              onClick={() => createPaymentLink("full")}
              disabled={isSubmitting || isPaid}
            >
              Demander le paiement complet
            </button>
            <button
              className={styles.btnConfirm}
              type="button"
              onClick={() => createPaymentLink("remaining")}
              disabled={isSubmitting || isPaid || remainingCents <= 0}
            >
              Demander le solde restant
            </button>
          </div>

          {paymentUrl && (
            <div className={styles.paymentLinkBox}>
              <label>Lien de paiement</label>
              <input value={paymentUrl} readOnly />
              <div className={styles.linkActions}>
                <button type="button" className={styles.btnCancel} onClick={copyPaymentLink}>
                  Copier
                </button>
                <a className={styles.btnConfirmLink} href={paymentUrl} target="_blank" rel="noreferrer">
                  Ouvrir Stripe
                </a>
              </div>
            </div>
          )}

          {mode === "closeout" && (
            <div className={styles.offlineBox}>
              <label>Moyen hors ligne</label>
              <div className={styles.methodsGrid}>
                {(Object.keys(methodLabels) as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`${styles.methodBtn} ${offlinePaymentMethod === method ? styles.active : ""}`}
                    onClick={() => setOfflinePaymentMethod(method)}
                  >
                    <span>{methodLabels[method]}</span>
                  </button>
                ))}
              </div>
              <div className={styles.statusRow} style={{ marginTop: 12 }}>
                <span>Méthode</span>
                <strong>{paymentMethodLabel}</strong>
              </div>
              <button className={styles.btnOffline} type="button" onClick={markPaidOffline} disabled={isSubmitting || isPaid}>
                Marquer comme payé hors ligne
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting} type="button">
            Fermer sans paiement
          </button>
        </div>
      </div>
    </div>
  );
}

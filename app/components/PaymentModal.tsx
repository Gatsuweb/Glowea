"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

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

function formatEuroInputValue(cents: number) {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
}

function parseEuroInputToCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(amount * 100);
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
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState("");

  const baseFinancialSummary = useMemo(
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

  const customPriceCents = useMemo(() => parseEuroInputToCents(customPriceInput), [customPriceInput]);
  const effectivePriceCents =
    customPriceCents === null
      ? baseFinancialSummary.priceCents
      : Math.max(customPriceCents, baseFinancialSummary.paidAmountCents);

  const financialSummary = useMemo(
    () =>
      getAppointmentFinancialSummary({
        price: effectivePriceCents,
        depositAmount: typeof depositAmount === "number" ? depositAmount : null,
        depositPaidAmount: typeof depositPaidAmount === "number" ? depositPaidAmount : null,
        paidAmount: typeof paidAmount === "number" ? paidAmount : null,
        remainingAmount: typeof remainingAmount === "number" ? remainingAmount : null,
        paymentStatus,
        paymentMethod,
        Service: { price: defaultAmount },
      }),
    [effectivePriceCents, depositAmount, depositPaidAmount, paidAmount, remainingAmount, paymentStatus, paymentMethod, defaultAmount]
  );

  const priceCents = financialSummary.priceCents;
  const paidCents = financialSummary.paidAmountCents;
  const depositPaidCents = financialSummary.depositPaidAmountCents;
  const remainingCents = financialSummary.remainingAmountCents;
  const statusLabel = getAppointmentPaymentLabel(financialSummary.paymentStatus);
  const paymentMethodLabel = formatAppointmentPaymentMethod(offlinePaymentMethod);
  const isPaid = financialSummary.paymentStatus === "paid" || financialSummary.paymentStatus === "paid_offline";
  const canUseStripe = Boolean(paymentsEnabled);
  const inlinePriceError =
    customPriceCents !== null && customPriceCents < baseFinancialSummary.paidAmountCents
      ? `Le prix doit être au moins égal au montant déjà encaissé (${formatMoney(baseFinancialSummary.paidAmountCents)}).`
      : null;

  useEffect(() => {
    if (!isOpen) return;
    setCustomPriceInput(formatEuroInputValue(baseFinancialSummary.priceCents));
    setPaymentUrl(null);
    setIsQrExpanded(false);
    setError(null);
  }, [isOpen, appointmentId, baseFinancialSummary.priceCents]);

  useEffect(() => {
    setPaymentUrl(null);
    setIsQrExpanded(false);
  }, [customPriceInput]);

  if (!isOpen) return null;

  function resolveCustomPriceCents() {
    const resolvedPriceCents = parseEuroInputToCents(customPriceInput);

    if (resolvedPriceCents === null) {
      setError("Saisissez un prix valide.");
      return null;
    }

    if (resolvedPriceCents < baseFinancialSummary.paidAmountCents) {
      setError(`Le prix ne peut pas être inférieur au montant déjà encaissé (${formatMoney(baseFinancialSummary.paidAmountCents)}).`);
      return null;
    }

    return resolvedPriceCents;
  }

  async function createPaymentLink(paymentType: "deposit" | "full" | "remaining") {
    if (!canUseStripe) {
      router.push("/settings/payments");
      return;
    }

    const resolvedPriceCents = resolveCustomPriceCents();
    if (resolvedPriceCents === null) return;

    setIsSubmitting(true);
    setError(null);
    setPaymentUrl(null);
    setIsQrExpanded(false);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/create-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType, customPriceCents: resolvedPriceCents }),
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
    const resolvedPriceCents = resolveCustomPriceCents();
    if (resolvedPriceCents === null) return;

    setIsSubmitting(true);
    setError(null);
    setPaymentUrl(null);
    setIsQrExpanded(false);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/mark-paid-offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: offlinePaymentMethod,
          customPriceCents: resolvedPriceCents,
        }),
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

  async function sharePaymentLink() {
    if (!paymentUrl) return;

    const shareData = {
      title: "Lien de paiement Glowea",
      text: `Bonjour, voici le lien de paiement pour votre rendez-vous ${serviceName}.`,
      url: paymentUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(paymentUrl);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Impossible de partager le lien de paiement.");
    }
  }

  function closeModal() {
    setIsQrExpanded(false);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={closeModal}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>{mode === "closeout" ? "Clôturer le rendez-vous" : "Paiement du rendez-vous"}</h2>
            <p>{clientName} - {serviceName}</p>
          </div>
          <button className={styles.btnClose} onClick={closeModal} type="button">x</button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.statusRow}>
            <span>Statut</span>
            <strong>{statusLabel}</strong>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="payment-total-price">Prix total ajustable</label>
            <input
              id="payment-total-price"
              className={styles.inputAmount}
              type="number"
              inputMode="decimal"
              min={(baseFinancialSummary.paidAmountCents / 100).toFixed(2)}
              step="0.01"
              value={customPriceInput}
              onChange={(event) => setCustomPriceInput(event.target.value)}
              placeholder="0.00"
            />
            <p className={styles.inputHint}>
              Modifiez ce montant pour ajouter un tip ou ajuster le prix au dernier moment.
            </p>
            {inlinePriceError && <p className={styles.inputHint}>{inlinePriceError}</p>}
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
              <div>
                <strong>Stripe Connect n&apos;est pas encore actif.</strong>
                <span>Configurez Stripe et les arrhes avant d&apos;envoyer des liens de paiement.</span>
              </div>
              <button type="button" onClick={() => router.push("/settings/payments")}>
                Configurer Stripe
              </button>
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
                <button type="button" className={styles.btnCancel} onClick={sharePaymentLink}>
                  Envoyer au client
                </button>
                <a className={styles.btnConfirmLink} href={paymentUrl} target="_blank" rel="noreferrer">
                  Ouvrir Stripe
                </a>
              </div>
              <div className={styles.qrCodeBox}>
                <div className={styles.qrCodeHeader}>
                  <div>
                    <strong>Faire scanner le QR code</strong>
                    <p>La cliente scanne ce QR code pour régler depuis son téléphone.</p>
                  </div>
                  <button type="button" className={styles.btnCancel} onClick={() => setIsQrExpanded(true)}>
                    Agrandir
                  </button>
                </div>
                <div className={styles.qrCodeFrame}>
                  <QRCodeSVG value={paymentUrl} size={190} level="M" includeMargin />
                </div>
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
          <button className={styles.btnCancel} onClick={closeModal} disabled={isSubmitting} type="button">
            Fermer sans paiement
          </button>
        </div>

        {paymentUrl && isQrExpanded && (
          <div className={styles.qrExpandedOverlay} onClick={() => setIsQrExpanded(false)}>
            <div className={styles.qrExpandedModal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.qrExpandedHeader}>
                <div>
                  <strong>QR code de paiement</strong>
                  <span>{clientName}</span>
                </div>
                <button className={styles.btnClose} type="button" onClick={() => setIsQrExpanded(false)}>x</button>
              </div>
              <div className={styles.qrExpandedFrame}>
                <QRCodeSVG value={paymentUrl} size={320} level="M" includeMargin />
              </div>
              <p>La cliente scanne ce QR code pour ouvrir Stripe Checkout et régler depuis son téléphone.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

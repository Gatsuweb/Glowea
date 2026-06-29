"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import styles from "./payments.module.css";

type DepositType = "fixed" | "percent";

type PaymentSettings = {
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  paymentsEnabled: boolean;
  defaultDepositAmount: number;
  defaultDepositType: DepositType;
};

type PaymentsApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  url?: string;
  alreadyConfigured?: boolean;
  stripeReconnectRequired?: boolean;
  code?: string;
  user?: Partial<PaymentSettings>;
};

async function readApiResponse(response: Response): Promise<PaymentsApiResponse | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as PaymentsApiResponse;
  } catch {
    return null;
  }
}

export default function PaymentsSettingsClient({
  initialSettings,
}: {
  initialSettings: PaymentSettings;
}) {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState(initialSettings);
  const [depositType, setDepositType] = useState<DepositType>(initialSettings.defaultDepositType);
  const [depositValue, setDepositValue] = useState(() => {
    if (initialSettings.defaultDepositType === "fixed") {
      return (initialSettings.defaultDepositAmount / 100).toString();
    }
    return initialSettings.defaultDepositAmount.toString();
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = useMemo(() => {
    if (settings.paymentsEnabled) return { label: "Paiements actifs", tone: styles.badgeGreen };
    if (settings.stripeAccountId) return { label: "Configuration incomplete", tone: styles.badgeAmber };
    return { label: "Non connecte", tone: styles.badgeNeutral };
  }, [settings.paymentsEnabled, settings.stripeAccountId]);

  function applyReturnedUser(data: PaymentsApiResponse | null) {
    if (!data?.user) return;
    setSettings((prev) => ({ ...prev, ...data.user }));
  }

  async function refreshStatus() {
    if (!settings.stripeAccountId) return;

    setIsRefreshing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/connect/refresh-status", { method: "POST" });
      const data = await readApiResponse(response);

      if (!data) {
        throw new Error("Reponse serveur invalide.");
      }

      if (!response.ok || !data.success) {
        applyReturnedUser(data);
        throw new Error(data.error || "Impossible de rafraichir le statut Stripe.");
      }

      applyReturnedUser(data);
      setMessage(
        data.message ||
          (data.user?.paymentsEnabled
            ? "Votre compte Stripe est déjà configuré."
            : "Configuration Stripe encore incomplete.")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    const stripeReturn = searchParams.get("stripe");
    if (stripeReturn === "return" || stripeReturn === "refresh") {
      void refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startOnboarding() {
    setIsConnecting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/connect/create-account", { method: "POST" });
      const data = await readApiResponse(response);

      if (!data) {
        throw new Error("Reponse serveur invalide.");
      }

      if (data.alreadyConfigured) {
        applyReturnedUser(data);
        setMessage(data.message || "Votre compte Stripe est déjà configuré.");
        return;
      }

      if (!response.ok || !data.success || !data.url) {
        applyReturnedUser(data);
        throw new Error(data.error || "Impossible de creer le lien Stripe.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setIsConnecting(false);
    }
  }

  async function saveDepositSettings() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const rawValue = Number(depositValue.replace(",", "."));
    if (!Number.isFinite(rawValue) || rawValue < 0) {
      setError("Le montant des arrhes est invalide.");
      setIsSaving(false);
      return;
    }

    const defaultDepositAmount =
      depositType === "fixed" ? Math.round(rawValue * 100) : Math.round(rawValue);

    try {
      const response = await fetch("/api/stripe/connect/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultDepositAmount,
          defaultDepositType: depositType,
        }),
      });
      const data = await readApiResponse(response);

      if (!data) {
        throw new Error("Reponse serveur invalide.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Impossible d'enregistrer les arrhes.");
      }

      applyReturnedUser(data);
      setMessage(data.message || "Arrhes par defaut enregistrees.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.layout}>
      <div className={styles.header}>
        <div>
          <Link className={styles.backLink} href="/dashboard">
            Retour au dashboard
          </Link>
          <h1>Parametres paiements</h1>
          <p>Connectez votre compte Stripe Express pour recevoir les arrhes et paiements de vos clientes.</p>
        </div>
        <span className={`${styles.badge} ${status.tone}`}>{status.label}</span>
      </div>

      {(error || message) && (
        <div className={styles.feedbackRow}>
          {error && <div className={styles.errorBox}>{error}</div>}
          {message && <div className={styles.successBox}>{message}</div>}
        </div>
      )}

      <section className={styles.panel}>
        <div>
          <h2>Stripe Connect Express</h2>
          <p>
            Les paiements clients passent par Glowea puis sont transferes vers votre compte Stripe connecte.
          </p>
        </div>

        <div className={styles.statusGrid}>
          <div>
            <span>Compte Stripe</span>
            <strong>{settings.stripeAccountId ? "Connecte" : "A creer"}</strong>
          </div>
          <div>
            <span>Onboarding</span>
            <strong>{settings.stripeOnboardingComplete ? "Complete" : "Incomplet"}</strong>
          </div>
          <div>
            <span>Paiements</span>
            <strong>{settings.paymentsEnabled ? "Actifs" : "Bloques"}</strong>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={startOnboarding} disabled={isConnecting}>
            {settings.stripeAccountId ? "Reprendre la configuration" : "Connecter mon compte Stripe"}
          </button>
          <button
            className={styles.secondaryButton}
            onClick={refreshStatus}
            disabled={!settings.stripeAccountId || isRefreshing}
          >
            {isRefreshing ? "Verification..." : "Rafraichir le statut"}
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div>
          <h2>Arrhes par defaut</h2>
          <p>Ces valeurs seront utilisees si aucun montant d&apos;arrhes specifique n&apos;est defini sur le rendez-vous.</p>
        </div>

        <div className={styles.formGrid}>
          <label>
            Type
            <select value={depositType} onChange={(event) => setDepositType(event.target.value as DepositType)}>
              <option value="fixed">Montant fixe</option>
              <option value="percent">Pourcentage</option>
            </select>
          </label>

          <label>
            {depositType === "fixed" ? "Montant en euros" : "Pourcentage"}
            <input
              type="number"
              min="0"
              max={depositType === "percent" ? "100" : undefined}
              step={depositType === "fixed" ? "0.01" : "1"}
              value={depositValue}
              onChange={(event) => setDepositValue(event.target.value)}
            />
          </label>
        </div>

        <button className={styles.primaryButton} onClick={saveDepositSettings} disabled={isSaving}>
          {isSaving ? "Enregistrement..." : "Enregistrer les arrhes"}
        </button>
      </section>
    </main>
  );
}

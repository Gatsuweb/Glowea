"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  PricingBillingProvider,
  type BillingCycle,
  type PricingPlanKey,
} from "../components/PricingBilling";
import PricingCards from "./PricingCards";
import styles from "./pricing.module.css";

type PrivateOffer = "founder";

export default function PricingCheckoutClient() {
  return (
    <PricingBillingProvider defaultBilling="yearly">
      <PricingCheckoutContent />
    </PricingBillingProvider>
  );
}

function PricingCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";
  const privateOffer: PrivateOffer | null =
    searchParams.get("offer") === "founder" ||
    searchParams.has("founder") ||
    searchParams.has("fondator") ||
    searchParams.has("fondateur") ||
    searchParams.has("fondatrice")
      ? "founder"
      : null;
  const requestedPlan = searchParams.get("plan");
  const highlightedPlan: PricingPlanKey | null =
    requestedPlan === "presence" || requestedPlan === "essential" || requestedPlan === "pro" ? requestedPlan : null;
  const [loadingPlan, setLoadingPlan] = useState<PricingPlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: PricingPlanKey, selectedBilling: BillingCycle, offer?: PrivateOffer) {
    setLoadingPlan(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing: plan === "presence" ? "monthly" : selectedBilling, offer }),
      });

      if (response.status === 401) {
        const redirectParams = new URLSearchParams({ plan });
        if (offer) redirectParams.set("offer", offer);
        router.push(`/sign-up?redirect_url=${encodeURIComponent(`/pricing?${redirectParams.toString()}`)}`);
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Votre session a expire. Connectez-vous pour continuer le paiement.");
      }

      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible de demarrer le paiement.");
      }

      window.location.href = payload.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Erreur de paiement.");
      setLoadingPlan(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <span>Abonnement Glowea</span>
        <h1>Choisissez une formule pour continuer.</h1>
        <p>
          Votre essai Pro donne accès à toutes les fonctionnalités pendant 14 jours.
          Le paiement active ensuite l&apos;abonnement via Stripe.
        </p>
      </section>

      {canceled && (
        <div className={styles.notice} role="status">
          Paiement annulé. Vous pouvez choisir une formule quand vous êtes pretes.
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {privateOffer === "founder" ? (
        <section className={styles.privateOffer}>
          <article className={`${styles.card} ${styles.featured}`}>
            <div className={styles.badge}>Offre bêta fondatrice</div>
            <div className={styles.cardHeader}>
              <h2>Glowea Pro fondatrice</h2>
              <p>Accès Pro complet au tarif bêta reservé aux testeuses invitées.</p>
            </div>
            <div className={styles.price}>
              <strong>39,90 EUR</strong>
              <span>/ mois</span>
              <small className={styles.priceNote}>facture mensuellement</small>
            </div>
            <ul>
              <li>Toutes les fonctionnalités Pro</li>
              <li>Page publique et réservation en ligne</li>
              <li>SMS, emails et campagnes</li>
              <li>Tarif bêta reservé aux testeuses invitées</li>
            </ul>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => startCheckout("pro", "monthly", "founder")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "pro" ? "Redirection..." : "Activer l'offre fondatrice"}
            </button>
          </article>
        </section>
      ) : (
        <>
          <PricingCards
            highlightedPlan={highlightedPlan}
            loadingPlan={loadingPlan}
            onSelectPlan={(plan, selectedBilling) => startCheckout(plan, plan === "presence" ? "monthly" : selectedBilling)}
          />
        </>
      )}
    </main>
  );
}

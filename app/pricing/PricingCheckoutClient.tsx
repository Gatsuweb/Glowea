"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  PlanPriceDisplay,
  PricingBillingProvider,
  PricingBillingToggle,
  type BillingCycle,
  usePricingBilling,
} from "../components/PricingBilling";
import styles from "./pricing.module.css";

type PlanKey = "essential" | "pro";

const plans: Array<{
  key: PlanKey;
  name: string;
  description: string;
  features: string[];
  featured?: boolean;
}> = [
  {
    key: "essential",
    name: "Essentiel",
    description: "Pour gérer vos clientes, rendez-vous, sessions, stock et comptabilité.",
    features: [
      "Agenda et rendez-vous",
      "Fiches clientes completes",
      "Sessions techniques",
      "Stock produits",
      "Suivi revenus et charges",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    description: "Pour garder l'acces complet et automatiser la croissance de votre activite.",
    features: [
      "Tout Essentiel",
      "SMS automatiques",
      "Emails automatiques",
      "Fidelisation clientes",
      "Mini-site et reservation en ligne a venir",
    ],
    featured: true,
  },
];

export default function PricingCheckoutClient() {
  return (
    <PricingBillingProvider defaultBilling="yearly">
      <PricingCheckoutContent />
    </PricingBillingProvider>
  );
}

function PricingCheckoutContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";
  const { billing } = usePricingBilling();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: PlanKey, selectedBilling: BillingCycle) {
    setLoadingPlan(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing: selectedBilling }),
      });

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
          Votre essai Pro donne acces a toutes les fonctionnalites pendant 14 jours.
          Le paiement active ensuite l&apos;abonnement via Stripe.
        </p>
      </section>

      {canceled && (
        <div className={styles.notice} role="status">
          Paiement annule. Vous pouvez choisir une formule quand vous etes prete.
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <PricingBillingToggle
        className={styles.billingToggle}
        optionClassName={styles.billingOption}
        activeClassName={styles.billingOptionActive}
        recommendedClassName={styles.billingOptionRecommended}
        badgeClassName={styles.billingBadge}
      />

      <section className={styles.grid}>
        {plans.map((plan) => (
          <article key={plan.key} className={`${styles.card} ${plan.featured ? styles.featured : ""}`}>
            {plan.featured && <div className={styles.badge}>Acces complet</div>}
            <div className={styles.cardHeader}>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
            </div>
            <PlanPriceDisplay
              plan={plan.key}
              priceClassName={styles.price}
              noteClassName={styles.priceNote}
              savingClassName={styles.savingBadge}
            />
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              className={plan.featured ? styles.primaryButton : styles.secondaryButton}
              onClick={() => startCheckout(plan.key, billing)}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === plan.key ? "Redirection..." : `Choisir ${plan.name}`}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  PlanPriceDisplay,
  PricingBillingToggle,
  type BillingCycle,
  usePricingBilling,
  type PricingPlanKey,
} from "../components/PricingBilling";
import styles from "./pricing.module.css";
import { pricingPlans } from "./pricingPlans";

type Props = {
  highlightedPlan?: PricingPlanKey | null;
  onSelectPlan?: (plan: PricingPlanKey, billing: BillingCycle) => void;
  loadingPlan?: PricingPlanKey | null;
};

export default function PricingCards({ highlightedPlan = null, onSelectPlan, loadingPlan = null }: Props) {
  const router = useRouter();
  const { billing } = usePricingBilling();

  return (
    <>
      <PricingBillingToggle
        className={styles.billingToggle}
        optionClassName={styles.billingOption}
        activeClassName={styles.billingOptionActive}
        recommendedClassName={styles.billingOptionRecommended}
        badgeClassName={styles.billingBadge}
      />
      <section className={styles.grid}>
        {pricingPlans.map((plan) => (
          <article
            key={plan.key}
            id={`plan-${plan.key}`}
            className={[
              styles.card,
              plan.featured ? styles.featured : "",
              highlightedPlan === plan.key ? styles.targetedCard : "",
            ].filter(Boolean).join(" ")}
          >
            {plan.featured && <div className={styles.badge}>Accès complet</div>}
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
            {plan.excludedFeatures?.length ? (
              <div className={styles.excludedBlock}>
                <span>N&apos;inclut pas</span>
                <ul>
                  {plan.excludedFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              className={plan.featured ? styles.primaryButton : styles.secondaryButton}
              onClick={() => {
                if (onSelectPlan) {
                  onSelectPlan(plan.key, billing);
                  return;
                }

                router.push(`/pricing?plan=${plan.key}`);
              }}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === plan.key ? "Redirection..." : plan.key === "presence" ? "Creer ma page" : `Choisir ${plan.name}`}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}

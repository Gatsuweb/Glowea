"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type BillingCycle = "monthly" | "yearly";
export type PricingPlanKey = "presence" | "essential" | "pro";

type BillingContextValue = {
  billing: BillingCycle;
  setBilling: (billing: BillingCycle) => void;
};

type PricingCopy = {
  monthlyPrice: string;
  yearlyMonthlyPrice: string;
  monthlyNote: string;
  yearlyNote: string;
  yearlyBadge?: string;
};

const BillingContext = createContext<BillingContextValue | null>(null);

const pricingCopy: Record<PricingPlanKey, PricingCopy> = {
  presence: {
    monthlyPrice: "14,90 EUR",
    yearlyMonthlyPrice: "14,90 EUR",
    monthlyNote: "facture mensuellement",
    yearlyNote: "facture mensuellement",
  },
  essential: {
    monthlyPrice: "39,90 €",
    yearlyMonthlyPrice: "33,25 €",
    monthlyNote: "facturé mensuellement",
    yearlyNote: "facturé 399 € / an",
    yearlyBadge: "2 mois offerts",
  },
  pro: {
    monthlyPrice: "59,90 €",
    yearlyMonthlyPrice: "49,92 €",
    monthlyNote: "facturé mensuellement",
    yearlyNote: "facturé 599 € / an",
    yearlyBadge: "2 mois offerts",
  },
};

function usePricingBillingContext() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("Pricing billing components must be used inside PricingBillingProvider.");
  }
  return context;
}

export function usePricingBilling() {
  return usePricingBillingContext();
}

export function PricingBillingProvider({
  children,
  defaultBilling = "yearly",
}: {
  children: ReactNode;
  defaultBilling?: BillingCycle;
}) {
  const [billing, setBilling] = useState<BillingCycle>(defaultBilling);
  const value = useMemo(() => ({ billing, setBilling }), [billing]);

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function PricingBillingToggle({
  className,
  optionClassName,
  activeClassName,
  recommendedClassName,
  badgeClassName,
}: {
  className: string;
  optionClassName: string;
  activeClassName: string;
  recommendedClassName?: string;
  badgeClassName?: string;
}) {
  const { billing, setBilling } = usePricingBillingContext();

  const getOptionClassName = (cycle: BillingCycle) => [
    optionClassName,
    billing === cycle ? activeClassName : "",
    cycle === "yearly" ? recommendedClassName || "" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={className} aria-label="Période de facturation" role="group">
      <button
        type="button"
        className={getOptionClassName("monthly")}
        aria-pressed={billing === "monthly"}
        onClick={() => setBilling("monthly")}
      >
        Mensuel
      </button>
      <button
        type="button"
        className={getOptionClassName("yearly")}
        aria-pressed={billing === "yearly"}
        onClick={() => setBilling("yearly")}
      >
        Annuel
        {badgeClassName ? <span className={badgeClassName}>Économisez 2 mois</span> : null}
      </button>
    </div>
  );
}

export function PlanPriceDisplay({
  plan,
  stackClassName,
  priceClassName,
  noteClassName,
  savingClassName,
}: {
  plan: PricingPlanKey;
  stackClassName?: string;
  priceClassName: string;
  noteClassName: string;
  savingClassName?: string;
}) {
  const { billing } = usePricingBillingContext();
  const copy = pricingCopy[plan];
  const isYearly = billing === "yearly";

  return (
    <div className={stackClassName}>
      {isYearly && savingClassName && copy.yearlyBadge ? (
        <div className={savingClassName}>{copy.yearlyBadge}</div>
      ) : null}
      <div className={priceClassName}>
        <strong>{isYearly ? copy.yearlyMonthlyPrice : copy.monthlyPrice}</strong>
        <span>/ mois</span>
        <small className={noteClassName}>{isYearly ? copy.yearlyNote : copy.monthlyNote}</small>
      </div>
    </div>
  );
}

import type { PricingPlanKey } from "../components/PricingBilling";

export type PricingPlanDefinition = {
  key: PricingPlanKey;
  name: string;
  description: string;
  features: string[];
  featured?: boolean;
  excludedFeatures?: string[];
};

export const pricingPlans: PricingPlanDefinition[] = [
  {
    key: "presence",
    name: "Presence",
    description: "Votre page professionnelle beaute, visible et partageable.",
    features: [
      "Page publique premium",
      "Catalogue de prestations",
      "Galerie photos",
      "Coordonnees et liens de contact",
      "Presence dans l'annuaire Glowea",
      "Hebergement inclus",
    ],
    excludedFeatures: [
      "Reservation en ligne",
      "Agenda",
      "Gestion client",
      "Arrhes",
      "SMS automatiques",
    ],
  },
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
    description: "Pour garder l'accès complet et automatiser la croissance de votre activite.",
    features: [
      "Tout Essentiel",
      "SMS automatiques",
      "Emails automatiques",
      "Fidelisation clientes",
      "Mini-site et réservation en ligne a venir",
    ],
    featured: true,
  },
];


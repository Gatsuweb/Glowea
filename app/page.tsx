import Image from "next/image";
import Link from "next/link";
import HeroTabletShowcase from "./components/HeroTabletShowcase";
import LandingNavbar from "./components/LandingNavbar";
import LandingLenis from "./components/LandingLenis";
import ModulesPreviewSection from "./components/ModulesPreviewSection";
import ProblemOrbitSection from "./components/ProblemOrbitSection";
import SolutionConvergenceSection from "./components/SolutionConvergenceSection";
import styles from "./page.module.css";

const metrics = [
  { value: "6", label: "RDV aujourd'hui", type: "appointments" },
  { value: "80 EUR", label: "Acompte encaissé", type: "payment" },
  { value: "SMS", label: "Rappel envoyé", type: "message" },
  { value: "42", label: "Produits suivis", type: "products" },
];

const specialties = [
  {
    title: "Cils",
    text: "Mapping, courbures, longueurs, remplissages et suivi des allergies.",
    image: "/cils.png",
  },
  {
    title: "Sourcils",
    text: "Brow lift, restructuration, teintes et conseils d'entretien.",
    image: "/sourcils.png",
  },
  {
    title: "Ongles",
    text: "Couleurs, nail art, tenue des poses, dépose et techniques utilisées.",
    image: "/ongles.png",
  },
];

type PricingIcon =
  | "calendar"
  | "session"
  | "history"
  | "stock"
  | "compta"
  | "sms"
  | "mail"
  | "deposit"
  | "shield"
  | "loyalty"
  | "site"
  | "booking";

const renderPricingIcon = (icon: PricingIcon) => {
  switch (icon) {
    case "calendar":
      return (
        <>
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M8 2v4M16 2v4M3 10h18" />
        </>
      );
    case "session":
      return (
        <>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v5h5M9 13h6M9 17h6M9 9h1" />
        </>
      );
    case "history":
      return (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5M12 7v5l3 2" />
        </>
      );
    case "stock":
      return (
        <>
          <path d="M21 8.5 12 13 3 8.5 12 4z" />
          <path d="M3 8.5V16l9 4.5 9-4.5V8.5M12 13V20.5" />
        </>
      );
    case "compta":
      return (
        <>
          <path d="M4 19V5" />
          <path d="M10 19V9" />
          <path d="M16 19V11" />
          <path d="M22 19V7" />
        </>
      );
    case "sms":
      return (
        <>
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </>
      );
    case "mail":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      );
    case "deposit":
      return (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
          <path d="M16 12h.01M2.5 10h19" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3 5 6v6c0 5 3.5 7.5 7 9 3.5-1.5 7-4 7-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
    case "loyalty":
      return (
        <>
          <path d="M12 20s-6.5-4.2-8.3-8.1A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.3 5.9C18.5 15.8 12 20 12 20Z" />
        </>
      );
    case "site":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </>
      );
    case "booking":
      return (
        <>
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M8 2v4M16 2v4M3 10h18M12 13v5M9.5 15.5h5" />
        </>
      );
  }
};

const plans = [
  {
    name: "Essentiel",
    monthlyPrice: "39,90 €",
    yearlyPrice: "399 €",
    yearlyNote: "Équivalent à 2 mois offerts",
    positioning: "Pour organiser votre activité au quotidien.",
    text: "Une base claire, élégante et rassurante pour gérer vos rendez-vous, vos clientes et votre suivi sans friction.",
    primaryBenefits: ["Gérez votre activité simplement"],
    metrics: ["+2h économisées chaque semaine", "Vision plus claire de vos journées", "Suivi centralisé en un seul espace"],
    features: [
      {
        icon: "calendar" as PricingIcon,
        title: "Agenda intelligent",
        description: "Visualisez vos journées et gardez chaque rendez-vous sous contrôle.",
      },
      {
        icon: "session" as PricingIcon,
        title: "Sessions techniques avancées",
        description: "Conservez vos notes de pose, paramètres, photos et détails utiles.",
      },
      {
        icon: "history" as PricingIcon,
        title: "Historique complet",
        description: "Retrouvez facilement les habitudes, préférences et rendez-vous passés.",
      },
      {
        icon: "stock" as PricingIcon,
        title: "Stock produits",
        description: "Suivez vos consommables sans tableur ni oublis.",
      },
      {
        icon: "compta" as PricingIcon,
        title: "Comptabilité automatique",
        description: "Gardez un oeil simple sur vos revenus et vos charges.",
      },
    ],
    ctaLabel: "Commencer avec Essentiel",
  },
  {
    name: "Pro",
    monthlyPrice: "59,90 €",
    yearlyPrice: "599 €",
    yearlyNote: "Équivalent à 2 mois offerts",
    positioning: "Pour développer votre activité et sécuriser vos revenus.",
    text: "Le plan pensé pour automatiser vos relances, inspirer confiance et transformer Glowea en moteur de croissance.",
    primaryBenefits: [
      "Réduisez les no-shows",
      "Recevez des réservations en ligne",
      "Fidélisez davantage vos clientes",
    ],
    metrics: ["-35% de rendez-vous oubliés", "24h/24 réservations en ligne", "+1 canal d'acquisition toujours actif"],
    features: [
      {
        icon: "sms" as PricingIcon,
        title: "SMS automatiques",
        description: "Envoyez des rappels au bon moment pour réduire les absences.",
      },
      {
        icon: "mail" as PricingIcon,
        title: "Emails automatiques",
        description: "Automatisez vos confirmations, relances et messages utiles.",
      },
      {
        icon: "deposit" as PricingIcon,
        title: "Gestion des acomptes",
        description: "Sécurisez vos créneaux avec une réservation plus engageante.",
      },
      {
        icon: "shield" as PricingIcon,
        title: "Protection anti no-show",
        description: "Cadrez vos réservations avec des rappels et des règles plus solides.",
      },
      {
        icon: "loyalty" as PricingIcon,
        title: "Fidélisation clientes",
        description: "Gardez le lien et donnez envie de reprendre rendez-vous.",
      },
      {
        icon: "site" as PricingIcon,
        title: "Mini-site professionnel",
        description: "Renforcez votre image avec une vitrine simple, claire et crédible.",
      },
    ],
    proIncludes: [
      { icon: "site" as PricingIcon, label: "Mini-site professionnel" },
      { icon: "booking" as PricingIcon, label: "Réservation en ligne" },
      { icon: "sms" as PricingIcon, label: "SMS automatiques" },
      { icon: "shield" as PricingIcon, label: "Protection anti no-show" },
    ],
    ctaLabel: "Développer mon activité",
    featured: true,
    badgeText: "✨ Le meilleur choix pour développer votre activité",
  },
];

const faqs = [
  {
    question: "Glowea est-il adapté si je travaille seule ?",
    answer:
      "Oui. Glowea est pensé pour les indépendantes, petites équipes et instituts qui veulent une gestion simple.",
  },
  {
    question: "Puis-je suivre mes prestations techniques ?",
    answer:
      "Oui. Les fiches et sessions permettent de garder les notes, produits, préférences et historiques utiles.",
  },
  {
    question: "Les rappels sont-ils inclus ?",
    answer:
      "Les rappels SMS et email font partie de l'offre Pro pour aider à réduire les oublis et no-shows.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <LandingLenis />
      <LandingNavbar />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Pour les pros de la beauté</span>
          <h1>Gérez vos rendez-vous et vos clientes plus simplement.</h1>
          <p>
            Glowea centralise vos rendez-vous, clientes, rappels, paiements,
            stock et sessions techniques dans une interface premium, simple et
            mobile.
          </p>
          <div className={styles.heroActions}>
            <Link href="/sign-up" className={styles.primaryButton}>
              Essayer gratuitement
            </Link>
            <Link href="#fonctionnalites" className={styles.secondaryButton}>
              Voir les outils
            </Link>
          </div>
        </div>
        <HeroTabletShowcase />
      </section>

      <section className={styles.metricsSection} aria-label="Indicateurs Glowea">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={`${styles.metricsCard} ${
              metric.type === "appointments"
                ? styles.metricsAppointments
                : metric.type === "payment"
                  ? styles.metricsPayment
                  : metric.type === "message"
                    ? styles.metricsMessage
                    : styles.metricsProducts
            }`}
          >
            <div className={styles.metricsCardIcon}>
              <span></span>
            </div>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>

            {metric.type === "appointments" ? (
              <div className={styles.metricsMiniAgenda} aria-hidden="true">
                <div>
                  <small>09:00</small>
                  <i></i>
                </div>
                <div>
                  <small>11:00</small>
                  <i></i>
                </div>
                <div>
                  <small>14:00</small>
                  <i></i>
                </div>
              </div>
            ) : null}

            {metric.type === "payment" ? (
              <>
                <div className={styles.metricsPaymentGlow} aria-hidden="true"></div>
                <div className={styles.metricsConfirmBadge} aria-hidden="true">
                  <i></i>
                  <small>Confirmé</small>
                </div>
              </>
            ) : null}

            {metric.type === "message" ? (
              <div className={styles.metricsSmsBubble} aria-hidden="true">
                <p>Bonjour Emma,</p>
                <p>Petit rappel pour votre rendez-vous demain à 14h. ✨</p>
                <small>10:30</small>
              </div>
            ) : null}

            {metric.type === "products" ? (
              <div className={styles.metricsMiniChart} aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <small>+12%</small>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <ProblemOrbitSection />

      <SolutionConvergenceSection />

      <ModulesPreviewSection />

      <section className={styles.sessionSection}>
        <div className={styles.sessionContent}>
          <span className={styles.eyebrow}>Sessions techniques</span>
          <h2>Gardez le d?tail de chaque prestation.</h2>
          <p>
            Pendant un rendez-vous, Glowea vous aide ? noter la technique, les
            produits utilisés, les paramètres importants, les remarques et les
            photos. Vous retrouvez tout au prochain passage de la cliente.
          </p>
          <ul>
            <li>Notes techniques propres et faciles ? relire</li>
            <li>Produits utilises relies au suivi du stock</li>
            <li>Historique clair pour personnaliser chaque rendez-vous</li>
          </ul>
          <Link href="/sign-up" className={styles.secondaryButton}>
            Tester les sessions
          </Link>
        </div>

        <div className={styles.sessionVisual}>
          <Image
            src="/session.png"
            alt="Capture de la session modale Glowea"
            width={980}
            height={760}
            className={styles.sessionImage}
          />
        </div>
      </section>

      <section className={styles.specialtySection} id="specialites">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Vos prestations</span>
          <h2>Adapté à votre façon de travailler.</h2>
        </div>
        <div className={styles.specialtyGrid}>
          {specialties.map((specialty) => (
            <article key={specialty.title}>
              <div className={styles.specialtyImage}>
                <Image src={specialty.image} alt="" width={520} height={620} />
              </div>
              <div>
                <h3>{specialty.title}</h3>
                <p>{specialty.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.pricingSection} id="prix">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Tarifs</span>
          <h2>Choisissez la formule qui vous suffit.</h2>
        </div>
        {/* <div className={styles.billingToggle} aria-label="Période de facturation">
          <span className={`${styles.billingOption} ${styles.billingOptionActive}`}>
            Mensuel
          </span>
          <span className={`${styles.billingOption} ${styles.billingOptionRecommended}`}>
            Annuel
            <span className={styles.billingBadge}>⭐ Économisez 17%</span>
          </span>
        </div> */}
        <div className={styles.pricingGrid}>
          {plans.map((plan) => (
            <article
              className={`${styles.priceCard} ${plan.featured ? styles.priceCardFeatured : ""}`}
              key={plan.name}
            >
              <div className={styles.priceCardAura} aria-hidden="true"></div>
              {plan.featured ? <span className={styles.badge}>{plan.badgeText}</span> : null}
              <div className={styles.priceCardHeader}>
                <div className={styles.priceCardHeading}>
                  <span className={styles.planKicker}>{plan.name}</span>
                  <h3>{plan.name}</h3>
                  <p className={styles.planPositioning}>{plan.positioning}</p>
                  <p className={styles.planSummary}>{plan.text}</p>
                </div>
                <div className={styles.priceStack}>
                  <div className={styles.price}>
                    <strong>{plan.monthlyPrice}</strong>
                    <span>/ mois</span>
                  </div>
                  <div className={styles.priceDivider}>ou</div>
                  <div className={`${styles.price} ${styles.priceYearly}`}>
                    <strong>{plan.yearlyPrice}</strong>
                    <span>/ an</span>
                  </div>
                  <div className={styles.priceSaving}>{plan.yearlyNote}</div>
                </div>
              </div>

              <div className={`${styles.primaryBenefitCard} ${plan.featured ? styles.primaryBenefitCardFeatured : ""}`}>
                <span className={styles.primaryBenefitEyebrow}>Bénéfice principal</span>
                <ul className={styles.primaryBenefitList}>
                  {plan.primaryBenefits.map((benefit) => (
                    <li key={benefit}>
                      <span className={styles.primaryBenefitCheck}>✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.metricsBadgeRow}>
                {plan.metrics.map((metric) => (
                  <span key={metric} className={`${styles.metricBadge} ${plan.featured ? styles.metricBadgeFeatured : ""}`}>
                    {metric}
                  </span>
                ))}
              </div>

              {plan.featured ? (
                <div className={styles.proIncludesBlock}>
                  <span className={styles.proIncludesTitle}>Inclus dans Pro</span>
                  <div className={styles.proIncludesGrid}>
                    {plan.proIncludes.map((item) => (
                      <div key={item.label} className={styles.proIncludeChip}>
                        <span className={styles.proIncludeIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            {renderPricingIcon(item.icon)}
                          </svg>
                        </span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={styles.planFeatureList}>
                {plan.features.map((feature) => (
                  <div key={feature.title} className={styles.planFeatureRow}>
                    <span className={styles.planFeatureIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {renderPricingIcon(feature.icon)}
                      </svg>
                    </span>
                    <div className={styles.planFeatureCopy}>
                      <strong>{feature.title}</strong>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/sign-up" className={plan.featured ? styles.primaryButton : styles.secondaryButton}>
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Questions</span>
          <h2>Avant de vous lancer.</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.eyebrow}>Essayez Glowea</span>
          <h2>Prenez une longueur d&apos;avance sur votre organisation.</h2>
          <p>
            Lancez un espace clair pour vos clientes, vos rendez-vous et votre
            croissance.
          </p>
          <Link href="/sign-up" className={styles.primaryButton}>
            Commencer gratuitement
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>Glowea</strong>
          <p>Le logiciel premium pour les professionnelles de la beauté.</p>
          <span>© 2026 Glowea. Tous droits réservés.</span>
        </div>
        <nav aria-label="Liens footer">
          <Link href="#fonctionnalites">Fonctionnalités</Link>
          <Link href="#specialites">Spécialités</Link>
          <Link href="#prix">Tarifs</Link>
          <Link href="/sign-in">Connexion</Link>
        </nav>
      </footer>
    </main>
  );
}

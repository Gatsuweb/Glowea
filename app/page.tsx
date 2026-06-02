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

const plans = [
  {
    name: "Essentiel",
    price: "39,90 EUR",
    text: "Pour structurer votre activité avec les outils indispensables.",
    items: ["Agenda et clientes", "Historique complet", "Stock produits", "Statistiques simples"],
  },
  {
    name: "Pro",
    price: "49,90 EUR",
    text: "Pour automatiser, sécuriser vos revenus et piloter avec plus de précision.",
    items: ["Tout Essentiel", "Rappels SMS / email", "Acomptes et no-shows", "Sessions techniques avancées"],
    featured: true,
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
          <h2>Gardez le detail de chaque prestation.</h2>
          <p>
            Pendant un rendez-vous, Glowea vous aide a noter la technique, les
            produits utilises, les parametres importants, les remarques et les
            photos. Vous retrouvez tout au prochain passage de la cliente.
          </p>
          <ul>
            <li>Notes techniques propres et faciles a relire</li>
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
        <div className={styles.pricingGrid}>
          {plans.map((plan) => (
            <article
              className={`${styles.priceCard} ${plan.featured ? styles.priceCardFeatured : ""}`}
              key={plan.name}
            >
              {plan.featured ? <span className={styles.badge}>Le plus choisi</span> : null}
              <h3>{plan.name}</h3>
              <p>{plan.text}</p>
              <div className={styles.price}>
                <strong>{plan.price}</strong>
                <span>/ mois</span>
              </div>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/sign-up" className={plan.featured ? styles.primaryButton : styles.secondaryButton}>
                Choisir {plan.name}
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

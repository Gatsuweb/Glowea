import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const metrics = [
  { value: "6", label: "RDV aujourd'hui" },
  { value: "80 EUR", label: "Acompte encaissé" },
  { value: "SMS", label: "Rappel envoyé" },
  { value: "42", label: "Produits suivis" },
];

const pains = [
  "Rendez-vous oubliés et messages dispersés",
  "No-shows qui cassent votre planning",
  "Fiches clientes éparpillées entre notes et photos",
  "Stock difficile à suivre au quotidien",
];

const features = [
  {
    title: "Agenda clair",
    text: "Visualisez vos journées, prestations et disponibilités sans friction.",
  },
  {
    title: "Fiches clientes",
    text: "Historique, préférences, allergies, photos et notes techniques au même endroit.",
  },
  {
    title: "Rappels automatiques",
    text: "SMS et emails pour limiter les oublis et responsabiliser vos clientes.",
  },
  {
    title: "Paiements et acomptes",
    text: "Sécurisez les réservations importantes et réduisez les no-shows.",
  },
  {
    title: "Stock produits",
    text: "Suivez vos indispensables cabine, vos seuils bas et la valeur du stock.",
  },
  {
    title: "Statistiques",
    text: "Gardez une lecture simple de vos revenus, prestations et clientes fidèles.",
  },
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

function AppPreview() {
  return (
    <div className={styles.appPreview} aria-label="Aperçu Glowea">
      <div className={styles.previewTop}>
        <span>Glowea Studio</span>
        <div>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className={styles.previewBody}>
        <aside className={styles.previewNav}>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </aside>
        <div className={styles.previewMain}>
          <div className={styles.previewHeader}>
            <span>Tableau de bord</span>
            <strong>Bonjour, Camille</strong>
          </div>
          <div className={styles.previewStats}>
            <article>
              <span>CA jour</span>
              <strong>320 EUR</strong>
            </article>
            <article>
              <span>RDV</span>
              <strong>6</strong>
            </article>
            <article>
              <span>No-show</span>
              <strong>-42%</strong>
            </article>
          </div>
          <div className={styles.previewGrid}>
            <div className={styles.previewCalendar}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className={styles.previewClient}>
              <span>Cliente</span>
              <strong>Emma L.</strong>
              <p>Lash lift + teinture</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.navbar}>
        <Link href="/" className={styles.logo} aria-label="Glowea accueil">
          <Image src="/logo.svg" alt="Glowea" width={170} height={60} priority />
        </Link>
        <nav aria-label="Navigation principale">
          <Link href="#fonctionnalites">Fonctionnalités</Link>
          <Link href="#specialites">Spécialités</Link>
          <Link href="#prix">Tarifs</Link>
          <Link href="#faq">FAQ</Link>
        </nav>
        <div className={styles.navActions}>
          <Link href="/sign-in">Connexion</Link>
          <Link href="/sign-up" className={styles.navButton}>
            Essayer
          </Link>
        </div>
      </header>

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
        <div className={styles.heroVisual}>
          <AppPreview />
          <div className={`${styles.floatCard} ${styles.floatOne}`}>
            <span>RDV aujourd&apos;hui</span>
            <strong>6</strong>
          </div>
          <div className={`${styles.floatCard} ${styles.floatTwo}`}>
            <span>Acompte</span>
            <strong>80 EUR</strong>
          </div>
          <div className={`${styles.floatCard} ${styles.floatThree}`}>
            <span>Rappel SMS</span>
            <strong>envoyé</strong>
          </div>
        </div>
      </section>

      <section className={styles.metricsSection} aria-label="Indicateurs Glowea">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className={styles.problemSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Ce qui prend du temps</span>
          <h2>Quand tout est éparpillé, vos journées deviennent vite lourdes.</h2>
        </div>
        <div className={styles.painGrid}>
          {pains.map((pain, index) => (
            <article key={pain}>
              <span>0{index + 1}</span>
              <p>{pain}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.solutionSection}>
        <div>
          <span className={styles.eyebrow}>Avec Glowea</span>
          <h2>Vous retrouvez tout au même endroit.</h2>
          <p>
            Glowea rassemble l&apos;essentiel de votre activité pour vous aider à
            gagner du temps, protéger vos revenus et offrir un suivi plus
            professionnel.
          </p>
        </div>
        <AppPreview />
      </section>

      <section className={styles.featuresSection} id="fonctionnalites">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Ce que vous pouvez faire</span>
          <h2>Les outils essentiels pour gérer votre activité.</h2>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.title}>
              <span></span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
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

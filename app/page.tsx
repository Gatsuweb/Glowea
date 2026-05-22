import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    title: "Rendez-vous",
    text: "Planning clair",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M8 13h3M8 16h5" />
      </svg>
    ),
  },
  {
    title: "Clientes",
    text: "Fiches 360 degres",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 19a4 4 0 0 0-8 0" />
        <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M18 10a2.5 2.5 0 0 1 0 5M6 10a2.5 2.5 0 0 0 0 5" />
      </svg>
    ),
  },
  {
    title: "Stock",
    text: "Suivi simple",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 8 8-4 8 4-8 4-8-4Z" />
        <path d="M4 8v8l8 4 8-4V8" />
        <path d="M12 12v8" />
      </svg>
    ),
  },
  {
    title: "Protocoles",
    text: "Seances organisees",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h10a2 2 0 0 1 2 2v12H6V7a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6M9 13h7M9 17h4" />
        <path d="M4 9v10" />
      </svg>
    ),
  },
  {
    title: "Statistiques",
    text: "Donnees lisibles",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V5" />
        <path d="M8 17v-5M13 17V8M18 17v-8" />
        <path d="M4 19h17" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero} aria-label="Glowea">
          <div className={styles.heroHeader}>
            <Link href="/" className={styles.logo}>
              <Image
                src="/logo.svg"
                alt="Glowea logo"
                width={202}
                height={72}
                aria-hidden="true"
              />
            </Link>
            <nav className={styles.nav} aria-label="Navigation principale">
              <Link href="#services">Services</Link>
              <Link href="#fonctionnalites">Fonctionnalites</Link>
              <Link href="#prix">Prix</Link>
              <Link href="#apropos">A propos</Link>
              <Link href="#ressources">Ressources</Link>
            </nav>
            <div className={styles.navActions}>
              <Link href="/sign-in" className={styles.navSignIn}>
                Se connecter
              </Link>
              <Link href="/sign-up" className={styles.navSignUp}>
                S&apos;inscrire
              </Link>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot}></span>
              Votre logiciel beaute tout en un
            </div>
            <h1>
              L&apos;interface
              <span>qui fait grandir votre activite</span>
            </h1>
            <p className={styles.subtitle}>
              Une plateforme pensee pour les techniciennes cils, ongles et
              sourcils.
            </p>
            <p className={styles.description}>
              Gerez vos rendez-vous, sessions, stock, compta, paiements et
              no-shows.
            </p>
            <div className={styles.actions}>
              <Link href="/sign-up" className={styles.primaryButton}>
                Essai gratuit
              </Link>
              <Link href="/sign-in" className={styles.secondaryButton}>
                Voir la demo
              </Link>
            </div>
          </div>

          <div className={styles.visual}>
            <Image
              className={styles.ipad}
              src="/landing/mockup-ipad.png"
              alt=""
              width={826}
              height={660}
              priority
            />
            <Image
              className={styles.fabric}
              src="/landing/tissu.png"
              alt=""
              width={567}
              height={430}
              priority
            />
          </div>

          <div className={styles.brandWatermark} aria-hidden="true">
            GLOWEA
          </div>

          {/* <div className={styles.featureBar}>
            <div className={styles.featureList}>
              {features.map((feature) => (
                <div className={styles.featureItem} key={feature.title}>
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <span>
                    <strong>{feature.title}</strong>
                    <small>{feature.text}</small>
                  </span>
                </div>
              ))}
            </div>
            <Link href="/sign-up" className={styles.watchLink}>
              <span className={styles.playIcon}></span>
              Decouvrir Glowea
            </Link>
          </div> */}
        </section>
      </main>
    </div>
  );
}

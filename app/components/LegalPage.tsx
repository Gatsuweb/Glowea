import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "../legal.module.css";

type LegalPageProps = {
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
};

export default function LegalPage({
  title,
  description,
  updatedAt,
  children,
}: LegalPageProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Accueil Glowea">
          <Image
            src="/logo-glowea-fonce.png"
            alt="Glowea"
            width={125}
            height={40}
            priority
          />
        </Link>
        <nav className={styles.nav} aria-label="Navigation légale">
          <Link href="/politique-de-confidentialite">Confidentialité</Link>
          <Link href="/conditions-utilisation">Conditions</Link>
          <Link href="/suppression-donnees">Suppression des données</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Dernière mise à jour : {updatedAt}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <article className={styles.content}>{children}</article>

      <footer className={styles.footer}>
        <div>
          <strong>Glowea</strong>
          <span>Le logiciel pour les professionnelles de la beauté.</span>
        </div>
        <nav aria-label="Liens légaux">
          <Link href="/politique-de-confidentialite">Politique de confidentialité</Link>
          <Link href="/conditions-utilisation">Conditions d&apos;utilisation</Link>
          <Link href="/suppression-donnees">Suppression des données</Link>
        </nav>
      </footer>
    </main>
  );
}

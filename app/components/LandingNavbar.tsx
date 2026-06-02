"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import styles from "../page.module.css";

const navLinks = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#specialites", label: "Spécialités" },
  { href: "#prix", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <header className={styles.navbar}>
        <Link href="/" className={styles.logo} aria-label="Glowea accueil">
          <Image src="/logo-glowea-fonce.png" alt="Glowea" width={125} height={40} priority />
        </Link>

        <nav className={styles.navDesktop} aria-label="Navigation principale">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.navActions}>
          <Link href="/sign-in">Connexion</Link>
          <Link href="/sign-up" className={styles.navButton}>
            Essayer
          </Link>
        </div>

        <div className={styles.navMobileActions}>
          <Link href="/sign-up" className={styles.navMobileCta}>
            Essayer
          </Link>
          <button
            type="button"
            className={styles.navMenuButton}
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsOpen((open) => !open)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              type="button"
              className={styles.navMobileBackdrop}
              aria-label="Fermer le menu"
              onClick={closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />

            <motion.div
              id="landing-mobile-menu"
              className={styles.navMobilePanel}
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <div className={styles.navMobilePanelTop}>
                <span>Navigation</span>
                <button
                  type="button"
                  className={styles.navCloseButton}
                  aria-label="Fermer le menu"
                  onClick={closeMenu}
                >
                  <span></span>
                  <span></span>
                </button>
              </div>

              <nav className={styles.navMobileLinks} aria-label="Navigation mobile">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={closeMenu}>
                    {link.label}
                  </Link>
                ))}
                <Link href="/sign-in" onClick={closeMenu}>
                  Connexion
                </Link>
              </nav>

              <Link href="/sign-up" className={styles.navMobilePrimaryCta} onClick={closeMenu}>
                Essayer gratuitement
              </Link>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

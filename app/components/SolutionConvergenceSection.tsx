"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import styles from "../page.module.css";

type SolutionCard = {
  id: string;
  title: string;
  eyebrow: string;
  detail: string;
  icon: "appointments" | "clients" | "products" | "photos" | "messages" | "stock" | "goals";
  className: string;
  delay: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
};

const solutionCards: SolutionCard[] = [
  {
    id: "appointments",
    title: "Rendez-vous",
    eyebrow: "Planning",
    detail: "6 confirmations aujourd'hui",
    icon: "appointments",
    className: styles.solutionCardOne,
    delay: 0,
    offsetX: -240,
    offsetY: -150,
    rotate: -7,
  },
  {
    id: "clients",
    title: "Clientes",
    eyebrow: "Fiches",
    detail: "Préférences et historique",
    icon: "clients",
    className: styles.solutionCardTwo,
    delay: 0.08,
    offsetX: 250,
    offsetY: -160,
    rotate: 6,
  },
  {
    id: "products",
    title: "Produits",
    eyebrow: "Conseils",
    detail: "Routine personnalisée prête",
    icon: "products",
    className: styles.solutionCardThree,
    delay: 0.16,
    offsetX: -280,
    offsetY: 12,
    rotate: -5,
  },
  {
    id: "photos",
    title: "Photos",
    eyebrow: "Avant / après",
    detail: "Galerie cliente synchronisée",
    icon: "photos",
    className: styles.solutionCardFour,
    delay: 0.24,
    offsetX: 282,
    offsetY: 10,
    rotate: 5,
  },
  {
    id: "messages",
    title: "Messages",
    eyebrow: "Inbox",
    detail: "Réponses et rappels centralisés",
    icon: "messages",
    className: styles.solutionCardFive,
    delay: 0.32,
    offsetX: -215,
    offsetY: 170,
    rotate: -4,
  },
  {
    id: "stock",
    title: "Stock",
    eyebrow: "Cabine",
    detail: "Seuil bas détecté à temps",
    icon: "stock",
    className: styles.solutionCardSix,
    delay: 0.4,
    offsetX: 228,
    offsetY: 176,
    rotate: 4,
  },
  {
    id: "goals",
    title: "Objectifs",
    eyebrow: "Ce mois-ci",
    detail: "Chiffre, rétention et rythme",
    icon: "goals",
    className: styles.solutionCardSeven,
    delay: 0.48,
    offsetX: 0,
    offsetY: -230,
    rotate: -3,
  },
];

function SolutionIcon({ icon }: Pick<SolutionCard, "icon">) {
  switch (icon) {
    case "appointments":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconAppointments}`}>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      );
    case "clients":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconClients}`}>
          <span></span>
          <span></span>
          <i></i>
        </div>
      );
    case "products":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconProducts}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      );
    case "photos":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconPhotos}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      );
    case "messages":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconMessages}`}>
          <span></span>
          <span></span>
        </div>
      );
    case "stock":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconStock}`}>
          <span></span>
          <div>
            <i></i>
          </div>
        </div>
      );
    case "goals":
      return (
        <div className={`${styles.solutionIcon} ${styles.solutionIconGoals}`}>
          <span></span>
          <span></span>
          <span></span>
          <i></i>
        </div>
      );
    default:
      return null;
  }
}

export default function SolutionConvergenceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const node = sectionRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.solutionSection} ref={sectionRef}>
      <div className={styles.solutionBackdrop} aria-hidden="true">
        <span className={`${styles.solutionGlow} ${styles.solutionGlowOne}`}></span>
        <span className={`${styles.solutionGlow} ${styles.solutionGlowTwo}`}></span>
        <span className={styles.solutionTexture}></span>
      </div>

      <div className={styles.solutionIntro}>
        <span className={styles.eyebrow}>Avec Glowea</span>
        <h2>Vous retrouvez tout au même endroit.</h2>
        <p>
          Glowea rassemble les rendez-vous, clientes, produits, messages, photos
          et objectifs dans un espace clair qui remplace naturellement le chaos.
        </p>
      </div>

      <div className={styles.solutionScene}>
        <motion.div
          className={styles.solutionHalo}
          aria-hidden="true"
          animate={
            shouldReduceMotion
              ? { opacity: 0.82, scale: 1 }
              : isInView
                ? { opacity: 1, scale: 1.08 }
                : { opacity: 0.7, scale: 0.94 }
          }
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className={styles.solutionOrbit} aria-hidden="true">
          {solutionCards.map((card) => (
            <motion.article
              key={card.id}
              className={`${styles.solutionOrbitCardShell} ${card.className}`}
              initial={
                shouldReduceMotion
                  ? { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
                  : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 0.45, scale: 0.92, x: 0, y: 0, rotate: 0 }
                  : isInView
                    ? {
                        opacity: 0.12,
                        scale: 0.72,
                        x: card.offsetX * -0.78,
                        y: card.offsetY * -0.78,
                        rotate: 0,
                      }
                    : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
              }
              transition={{
                duration: shouldReduceMotion ? 0.5 : 1.55,
                delay: shouldReduceMotion ? 0 : card.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <motion.div
                className={styles.solutionOrbitCard}
                animate={
                  shouldReduceMotion || isInView
                    ? { y: 0, rotate: 0 }
                    : { y: [-9, 9, -9], rotate: [card.rotate, card.rotate + 1.4, card.rotate] }
                }
                transition={{
                  duration: 6.4 + card.delay * 4,
                  repeat: shouldReduceMotion || isInView ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className={styles.solutionCardHead}>
                  <span>{card.eyebrow}</span>
                  <SolutionIcon icon={card.icon} />
                </div>
                <strong>{card.title}</strong>
                <p>{card.detail}</p>
              </motion.div>
            </motion.article>
          ))}
        </div>

        <motion.div
          className={styles.solutionDashboard}
          animate={
            shouldReduceMotion
              ? { boxShadow: "0 28px 72px rgba(61, 27, 34, 0.12)" }
              : isInView
                ? {
                    boxShadow:
                      "0 40px 100px rgba(61, 27, 34, 0.14), 0 0 0 1px rgba(255,255,255,0.52), 0 0 42px rgba(244, 198, 208, 0.46)",
                  }
                : {
                    boxShadow:
                      "0 30px 80px rgba(61, 27, 34, 0.1), 0 0 0 1px rgba(255,255,255,0.45), 0 0 0 rgba(244, 198, 208, 0)",
                  }
          }
          transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.solutionDashboardTop}>
            <span>Glowea</span>
            <div>
              <i></i>
              <i></i>
              <i></i>
            </div>
          </div>

          <div className={styles.solutionDashboardBody}>
            <aside className={styles.solutionDashboardSidebar}>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </aside>

            <div className={styles.solutionDashboardMain}>
              <div className={styles.solutionDashboardHero}>
                <span>Tableau de bord central</span>
                  <strong>Toute votre activité se réunit ici</strong>
                  <p>Agenda, clientes, stock, photos et messages avancent ensemble dans le même flux.</p>
              </div>

              <div className={styles.solutionDashboardStats}>
                <article>
                  <span>Rendez-vous</span>
                  <strong>18</strong>
                </article>
                <article>
                  <span>Messages</span>
                  <strong>0 en attente</strong>
                </article>
                <article>
                  <span>Stock</span>
                  <strong>à jour</strong>
                </article>
              </div>

              <div className={styles.solutionDashboardGrid}>
                <div className={styles.solutionDashboardTimeline}>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className={styles.solutionDashboardPanel}>
                  <span>Cliente du jour</span>
                  <strong>Camille R.</strong>
                  <p>Lash lift, photos, recommandations et rappel déjà reliés.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

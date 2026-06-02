"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import styles from "../page.module.css";

type LayoutMode = "desktop" | "tablet" | "mobile";

type ProblemCard = {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone?: "danger" | "accent";
  depth: number;
  duration: number;
  orbitX: number;
  orbitY: number;
  rotate: number;
  className: string;
  icon: "calendar" | "messages" | "badge" | "progress" | "gallery" | "products" | "chart" | "clock";
};

const problemCards: ProblemCard[] = [
  {
    id: "appointments",
    label: "Carte 01",
    title: "Rendez-vous oubliés",
    detail: "petite illustration calendrier",
    depth: 1.2,
    duration: 6.1,
    orbitX: -28,
    orbitY: -18,
    rotate: -3.2,
    className: styles.problemCardOne,
    icon: "calendar",
  },
  {
    id: "messages",
    label: "Carte 02",
    title: "Messages en attente",
    detail: "aperçu conversation",
    depth: 1,
    duration: 8.4,
    orbitX: 24,
    orbitY: -16,
    rotate: 2.6,
    className: styles.problemCardTwo,
    icon: "messages",
  },
  {
    id: "no-shows",
    label: "Carte 03",
    title: "No-shows",
    detail: "petit badge rouge",
    tone: "danger",
    depth: 1.35,
    duration: 5.8,
    orbitX: -34,
    orbitY: 10,
    rotate: -3.8,
    className: styles.problemCardThree,
    icon: "badge",
  },
  {
    id: "stock",
    label: "Carte 04",
    title: "Stock faible",
    detail: "barre de progression",
    depth: 1.4,
    duration: 9.2,
    orbitX: 34,
    orbitY: 8,
    rotate: 3.4,
    className: styles.problemCardFour,
    icon: "progress",
  },
  {
    id: "gallery",
    label: "Carte 05",
    title: "Photos clientes dispersées",
    detail: "mini galerie",
    depth: 1.25,
    duration: 7.3,
    orbitX: -30,
    orbitY: 24,
    rotate: -2.4,
    className: styles.problemCardFive,
    icon: "gallery",
  },
  {
    id: "products",
    label: "Carte 06",
    title: "Produits à recommander",
    detail: "liste de produits",
    depth: 1.15,
    duration: 6.9,
    orbitX: 26,
    orbitY: 28,
    rotate: 2.7,
    className: styles.problemCardSix,
    icon: "products",
  },
  {
    id: "goal",
    label: "Carte 07",
    title: "Objectif du mois",
    detail: "mini graphique",
    tone: "accent",
    depth: 1.5,
    duration: 8.8,
    orbitX: 0,
    orbitY: -22,
    rotate: -2.2,
    className: styles.problemCardSeven,
    icon: "chart",
  },
  {
    id: "reminder",
    label: "Carte 08",
    title: "Rappel demain 9h",
    detail: "horloge",
    depth: 1.55,
    duration: 5.4,
    orbitX: 0,
    orbitY: 26,
    rotate: 2.1,
    className: styles.problemCardEight,
    icon: "clock",
  },
];

function ProblemIcon({ icon, tone }: Pick<ProblemCard, "icon" | "tone">) {
  switch (icon) {
    case "calendar":
      return (
        <div className={`${styles.problemIcon} ${styles.calendarIcon}`}>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      );
    case "messages":
      return (
        <div className={`${styles.problemIcon} ${styles.messagesIcon}`}>
          <span></span>
          <span></span>
        </div>
      );
    case "badge":
      return (
        <div className={`${styles.problemIcon} ${styles.badgeIcon}`}>
          <span className={tone === "danger" ? styles.problemBadgeDanger : ""}>+3</span>
          <small>non confirmés</small>
        </div>
      );
    case "progress":
      return (
        <div className={`${styles.problemIcon} ${styles.progressIcon}`}>
          <span></span>
          <div>
            <i></i>
          </div>
          <small>12%</small>
        </div>
      );
    case "gallery":
      return (
        <div className={`${styles.problemIcon} ${styles.galleryIcon}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      );
    case "products":
      return (
        <div className={`${styles.problemIcon} ${styles.productsIcon}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      );
    case "chart":
      return (
        <div className={`${styles.problemIcon} ${styles.chartIcon}`}>
          <span></span>
          <span></span>
          <span></span>
          <i></i>
        </div>
      );
    case "clock":
      return (
        <div className={`${styles.problemIcon} ${styles.clockIcon}`}>
          <span></span>
          <i></i>
          <b></b>
        </div>
      );
    default:
      return null;
  }
}

type ProblemOrbitCardProps = {
  card: ProblemCard;
  layoutMode: LayoutMode;
  scrollYProgress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
};

function ProblemOrbitCard({
  card,
  layoutMode,
  scrollYProgress,
  pointerX,
  pointerY,
}: ProblemOrbitCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const parallaxFactor = shouldReduceMotion ? 0 : layoutMode === "mobile" ? 0 : layoutMode === "tablet" ? 0.6 : 1;
  const mouseRange = shouldReduceMotion ? 0 : 15 * Math.min(card.depth, 1.5);

  const orbitX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [card.orbitX * -parallaxFactor, 0, card.orbitX * parallaxFactor],
  );
  const orbitY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [card.orbitY * -parallaxFactor, 0, card.orbitY * parallaxFactor],
  );
  const orbitRotate = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [card.rotate * -parallaxFactor, 0, card.rotate * parallaxFactor],
  );
  const followX = useTransform(pointerX, [-1, 1], [-mouseRange, mouseRange]);
  const followY = useTransform(pointerY, [-1, 1], [-mouseRange, mouseRange]);
  const combinedX = useTransform([orbitX, followX], ([a, b]) => a + b);
  const combinedY = useTransform([orbitY, followY], ([a, b]) => a + b);

  return (
    <motion.article
      className={`${styles.problemOrbitCardShell} ${card.className}`}
      style={{
        x: layoutMode === "mobile" ? 0 : combinedX,
        y: layoutMode === "mobile" ? 0 : combinedY,
        rotate: layoutMode === "mobile" ? 0 : orbitRotate,
      }}
    >
      <motion.div
        className={`${styles.problemOrbitCard} ${card.tone === "danger" ? styles.problemOrbitCardDanger : ""} ${
          card.tone === "accent" ? styles.problemOrbitCardAccent : ""
        }`}
        animate={shouldReduceMotion ? undefined : { y: [-10, 10, -10] }}
        transition={{
          duration: card.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className={styles.problemCardTop}>
          <span className={styles.problemCardLabel}>{card.label}</span>
          <ProblemIcon icon={card.icon} tone={card.tone} />
        </div>
        <strong>{card.title}</strong>
        <p>{card.detail}</p>
      </motion.div>
    </motion.article>
  );
}

export default function ProblemOrbitSection() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const sectionRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pointerXSmooth = useSpring(pointerX, { stiffness: 110, damping: 18, mass: 0.8 });
  const pointerYSmooth = useSpring(pointerY, { stiffness: 110, damping: 18, mass: 0.8 });
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    const mediaDesktop = window.matchMedia("(max-width: 1080px)");
    const mediaMobile = window.matchMedia("(max-width: 640px)");

    const updateLayoutMode = () => {
      if (mediaMobile.matches) {
        setLayoutMode("mobile");
        return;
      }

      if (mediaDesktop.matches) {
        setLayoutMode("tablet");
        return;
      }

      setLayoutMode("desktop");
    };

    updateLayoutMode();
    mediaDesktop.addEventListener("change", updateLayoutMode);
    mediaMobile.addEventListener("change", updateLayoutMode);

    return () => {
      mediaDesktop.removeEventListener("change", updateLayoutMode);
      mediaMobile.removeEventListener("change", updateLayoutMode);
    };
  }, []);

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (layoutMode === "mobile" || shouldReduceMotion) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    pointerX.set(nextX);
    pointerY.set(nextY);
  };

  const handleMouseLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section className={styles.problemSection} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className={styles.problemBackdrop} aria-hidden="true">
        <span className={`${styles.problemGlow} ${styles.problemGlowOne}`}></span>
        <span className={`${styles.problemGlow} ${styles.problemGlowTwo}`}></span>
        <span className={styles.problemTexture}></span>
      </div>
      <div className={styles.problemOrbitScene} ref={sectionRef}>
        <div className={styles.problemCenter}>
          <div className={styles.problemCenterHalo} aria-hidden="true"></div>
          <span className={styles.eyebrow}>CE QUI PREND DU TEMPS</span>
          <h2>
            Quand tout est éparpillé,
            <br />
          </h2>
          <p>
            Entre les rendez-vous, les clientes,
            <br />
            les stocks et les messages,
            <br />
            chaque détail demande votre attention.
          </p>
        </div>

        <div className={styles.problemOrbit} aria-hidden="true">
          {problemCards.map((card) => (
            <ProblemOrbitCard
              key={card.id}
              card={card}
              layoutMode={layoutMode}
              scrollYProgress={scrollYProgress}
              pointerX={pointerXSmooth}
              pointerY={pointerYSmooth}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

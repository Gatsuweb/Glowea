"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useState } from "react";

import styles from "../page.module.css";

const heroCards = [
  {
    id: "rdv",
    label: "RDV aujourd'hui",
    value: "6",
    className: styles.heroFloatOne,
    duration: 5.6,
    x: [-3, 3, -3],
  },
  {
    id: "acompte",
    label: "Acompte",
    value: "80 EUR",
    className: styles.heroFloatTwo,
    duration: 6.8,
    x: [3, -3, 3],
  },
  {
    id: "sms",
    label: "Rappel SMS",
    value: "envoyé",
    className: styles.heroFloatThree,
    duration: 6.1,
    x: [-2, 2, -2],
  },
];

const heroParticles = [
  { id: "particle-1", className: styles.heroParticleOne },
  { id: "particle-2", className: styles.heroParticleTwo },
  { id: "particle-3", className: styles.heroParticleThree },
  { id: "particle-4", className: styles.heroParticleFour },
];

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export default function HeroTabletShowcase() {
  const shouldReduceMotion = useReducedMotion();
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const smoothX = useSpring(parallaxX, {
    stiffness: 70,
    damping: 18,
    mass: 0.8,
  });
  const smoothY = useSpring(parallaxY, {
    stiffness: 70,
    damping: 18,
    mass: 0.8,
  });
  const tabletX = useTransform(smoothX, (value) => value * 0.22);
  const tabletY = useTransform(smoothY, (value) => value * 0.22);
  const cardsX = useTransform(smoothX, (value) => value * 0.58);
  const cardsY = useTransform(smoothY, (value) => value * 0.58);
  const particlesX = useTransform(smoothX, (value) => value * 0.95);
  const particlesY = useTransform(smoothY, (value) => value * 0.95);

  useEffect(() => {
    if (shouldReduceMotion) {
      parallaxX.set(0);
      parallaxY.set(0);
      return;
    }

    const updateViewportState = () => {
      const compact = window.innerWidth <= 1024;

      setIsCompactViewport(compact);

      if (!compact) {
        setOrientationEnabled(false);
        parallaxX.set(0);
        parallaxY.set(0);
        return;
      }

      setOrientationEnabled(true);
    };

    updateViewportState();
    window.addEventListener("resize", updateViewportState);

    return () => {
      window.removeEventListener("resize", updateViewportState);
      parallaxX.set(0);
      parallaxY.set(0);
    };
  }, [parallaxX, parallaxY, shouldReduceMotion]);

  useEffect(() => {
    if (
      shouldReduceMotion ||
      !isCompactViewport ||
      !orientationEnabled ||
      typeof window.DeviceOrientationEvent === "undefined"
    ) {
      parallaxX.set(0);
      parallaxY.set(0);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = typeof event.beta === "number" ? event.beta : 0;
      const gamma = typeof event.gamma === "number" ? event.gamma : 0;
      const normalizedX = clamp(gamma / 28, -1, 1);
      const normalizedY = clamp(beta / 30, -1, 1);

      parallaxX.set(normalizedX * 20);
      parallaxY.set(normalizedY * -20);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      parallaxX.set(0);
      parallaxY.set(0);
    };
  }, [
    isCompactViewport,
    orientationEnabled,
    parallaxX,
    parallaxY,
    shouldReduceMotion,
  ]);

  return (
    <div className={styles.heroVisual}>
      <motion.div
        className={styles.heroTabletStage}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className={styles.heroTabletGlow} aria-hidden="true"></div>

        <motion.div
          className={styles.heroParticleLayer}
          style={{ x: particlesX, y: particlesY }}
          aria-hidden="true"
        >
          {heroParticles.map((particle) => (
            <span
              key={particle.id}
              className={`${styles.heroParticle} ${particle.className}`}
            ></span>
          ))}
        </motion.div>

        <motion.div
          className={styles.heroParallaxLayer}
          style={{ x: tabletX, y: tabletY }}
        >
          <motion.div
            className={styles.heroTabletShell}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.08 }}
          >
            <Image
              src="/dashboard.png"
              alt="Tablette affichant le dashboard Glowea"
              width={1712}
              height={1072}
              priority
              className={styles.heroTabletImage}
            />
          </motion.div>
        </motion.div>

        {heroCards.map((card, index) => (
          <motion.div
            key={card.id}
            className={`${styles.heroFloatingCardShell} ${card.className}`}
            style={{ x: cardsX, y: cardsY }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2 + index * 0.14,
            }}
          >
            <motion.div
              className={styles.heroFloatingCard}
              animate={
                shouldReduceMotion
                  ? { y: 0, x: 0 }
                  : { y: [-6, 6, -6], x: card.x }
              }
              transition={{
                duration: card.duration,
                repeat: shouldReduceMotion ? 0 : Infinity,
                ease: "easeInOut",
              }}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

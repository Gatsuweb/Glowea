"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { dismissOnboardingChecklist, type OnboardingState } from "../actions/onboardingActions";
import styles from "./OnboardingChecklist.module.css";

export default function OnboardingChecklist({ onboarding }: { onboarding: OnboardingState }) {
  const [isHidden, setIsHidden] = useState(!onboarding.shouldShow);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const progressPercent = Math.round((onboarding.completedCount / onboarding.totalCount) * 100);

  if (isHidden) return null;

  function dismiss() {
    setIsHidden(true);
    startTransition(async () => {
      await dismissOnboardingChecklist();
    });
  }

  if (onboarding.isCompleted) {
    return (
      <section className={`${styles.card} ${styles.cardCompleted}`} role="status">
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.kicker}>Installation terminée</span>
            <h2>Votre espace Glowea est prêt</h2>
            <p>Vous pouvez maintenant gérer vos clientes, vos prestations et vos rendez-vous.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={dismiss} disabled={isPending} aria-label="Fermer le widget">
            ×
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.kicker}>Bienvenue sur Glowea</span>
          <h2>Guide de demarrage</h2>
          <p>Configurez votre espace en quelques minutes.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            aria-label={isExpanded ? "Replier le guide" : "Deplier le guide"}
          >
            {isExpanded ? "−" : "+"}
          </button>
          <button className={styles.iconButton} type="button" onClick={dismiss} disabled={isPending} aria-label="Masquer le guide">
            ×
          </button>
        </div>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressMeta}>
          <strong>{onboarding.completedCount}/{onboarding.totalCount} etapes terminees</strong>
          <span>{progressPercent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {isExpanded && onboarding.nextStep && (
        <div className={styles.nextBanner}>
          <div>
            <span>Prochaine etape</span>
            <strong>{onboarding.nextStep.title}</strong>
          </div>
          <Link href={onboarding.nextStep.href}>Continuer</Link>
        </div>
      )}

      {isExpanded && (
        <div className={styles.stepList}>
          {onboarding.steps.map((step) => (
            <Link className={styles.stepItem} href={step.href} key={step.id}>
              <span className={step.completed ? styles.checkDone : styles.checkTodo}>
                {step.completed ? "✓" : "○"}
              </span>
              <div className={styles.stepContent}>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
              <span className={step.completed ? styles.badgeDone : styles.badgeTodo}>
                {step.completed ? "Fait" : "A faire"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

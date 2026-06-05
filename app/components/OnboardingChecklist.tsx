"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { dismissOnboardingChecklist, type OnboardingState } from "../actions/onboardingActions";
import styles from "./OnboardingChecklist.module.css";

export default function OnboardingChecklist({ onboarding }: { onboarding: OnboardingState }) {
  const [isHidden, setIsHidden] = useState(!onboarding.shouldShow);
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
      <section className={styles.card} role="status">
        <div className={styles.header}>
          <div>
            <span className={styles.kicker}>Installation terminee</span>
            <h2>Votre espace Glowea est pret.</h2>
            <p>Vous pouvez maintenant gerer vos clientes, vos prestations et vos rendez-vous.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>Bienvenue sur Glowea</span>
          <h2>Configurez votre espace en quelques minutes.</h2>
          <p>Suivez ces premieres etapes pour commencer a gerer vos rendez-vous avec une base solide.</p>
        </div>
        <button className={styles.hideButton} type="button" onClick={dismiss} disabled={isPending}>
          Masquer pour l&apos;instant
        </button>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressMeta}>
          <strong>Progression : {onboarding.completedCount}/{onboarding.totalCount} etapes terminees</strong>
          <span>{progressPercent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {onboarding.nextStep && (
        <div className={styles.nextBanner}>
          <div>
            <span>Prochaine etape</span>
            <strong>{onboarding.nextStep.title}</strong>
          </div>
          <Link href={onboarding.nextStep.href}>Continuer</Link>
        </div>
      )}

      <div className={styles.stepList}>
        {onboarding.steps.map((step) => (
          <Link className={styles.stepItem} href={step.href} key={step.id}>
            <span className={step.completed ? styles.checkDone : styles.checkTodo}>
              {step.completed ? "✓" : "○"}
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
            <span className={step.completed ? styles.badgeDone : styles.badgeTodo}>
              {step.completed ? "Fait" : "A faire"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Image from "next/image";
import styles from "./WeeklyBriefModal.module.css";

interface WeeklyBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    goal: {
      lastWeekRevenue: number;
      recommendedGoal: number;
    };
    birthdays: Array<{
      id: string;
      name: string;
      date: string;
    }>;
    refills: Array<{
      id: string;
      name: string;
      lastVisit: string;
      serviceName: string;
    }>;
  };
}

export default function WeeklyBriefModal({ isOpen, onClose, data }: WeeklyBriefModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Image src="/icones/lumiere.png" alt="Brief" width={40} height={40} />
          </div>
          <h2>Ton Brief de la Semaine</h2>
          <p>Voici un résumé pour booster ton activité cette semaine !</p>
        </div>

        <div className={styles.content}>
          {/* Objectif */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🎯</span>
              <h3>Objectif Recommandé</h3>
            </div>
            <div className={styles.goalCard}>
              <div className={styles.goalInfo}>
                <span className={styles.goalLabel}>Semaine dernière : {data.goal.lastWeekRevenue}€</span>
                <span className={styles.goalValue}>{data.goal.recommendedGoal}€</span>
                <span className={styles.goalDesc}>Objectif cette semaine (+10%)</span>
              </div>
            </div>
          </div>

          {/* Anniversaires */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🎂</span>
              <h3>Anniversaires de la semaine</h3>
            </div>
            {data.birthdays.length > 0 ? (
              <ul className={styles.list}>
                {data.birthdays.map(b => (
                  <li key={b.id} className={styles.listItem}>
                    <span><strong>{b.name}</strong></span>
                    <span className={styles.dateTag}>{b.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyText}>Aucun anniversaire cette semaine.</p>
            )}
          </div>

          {/* Relances Remplissage */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>💅</span>
              <h3>Clientes à relancer (Remplissage)</h3>
            </div>
            <p className={styles.sectionSubtext}>Ces clientes sont venues il y a ~3-4 semaines et n&apos;ont pas repris de RDV.</p>
            {data.refills.length > 0 ? (
              <ul className={styles.list}>
                {data.refills.map(r => (
                  <li key={r.id} className={styles.listItem}>
                    <div className={styles.clientInfo}>
                      <strong>{r.name}</strong>
                      <span className={styles.serviceDetail}>{r.serviceName}</span>
                    </div>
                    <span className={styles.dateTag}>{r.lastVisit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyText}>Toutes tes clientes régulières ont déjà repris RDV !</p>
            )}
          </div>
          
          {/* Conseil de la semaine */}
          <div className={styles.tipCard}>
            <div className={styles.tipHeader}>💡 Conseil de la semaine</div>
            <p>Pense à partager des photos avant/après de tes poses sur Instagram pour attirer de nouvelles clientes !</p>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.actionBtn} onClick={onClose}>C&apos;est parti ! 🚀</button>
        </div>
      </div>
    </div>
  );
}

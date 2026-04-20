'use client';

import { useEffect } from 'react';
import styles from './WidgetModal.module.css';

interface WidgetModalProps {
  onClose: () => void;
}

export default function WidgetModal({ onClose }: WidgetModalProps) {
  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const widgetOptions = [
    {
      id: 1,
      title: "Statistiques Avancées",
      desc: "Affichez plus de détails sur vos revenus et votre croissance.",
      icon: "📈"
    },
    {
      id: 2,
      title: "Derniers Avis Clients",
      desc: "Gardez un œil sur les retours de vos dernières prestations.",
      icon: "⭐"
    },
    {
      id: 3,
      title: "Objectifs du mois",
      desc: "Suivez votre progression vers vos objectifs financiers.",
      icon: "🎯"
    },
    {
      id: 4,
      title: "Raccourcis Rapides",
      desc: "Accédez en un clic à vos actions les plus fréquentes.",
      icon: "⚡"
    },
    {
      id: 5,
      title: "Calendrier Hebdomadaire",
      desc: "Aperçu rapide de votre semaine de rendez-vous.",
      icon: "📅"
    },
    {
      id: 6,
      title: "Tâches à faire",
      desc: "Votre to-do list personnelle pour la gestion du salon.",
      icon: "✅"
    }
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        
        {/* Header de la modale */}
        <div className={styles.headerCard}>
          <button className={styles.backButton} onClick={onClose} aria-label="Retour">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <h2 className={styles.title}>Ajouter un Widget</h2>

          <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className={styles.instructions}>
          Sélectionnez le widget que vous souhaitez ajouter à votre tableau de bord :
        </p>

        {/* Grille des widgets */}
        <div className={styles.widgetsGrid}>
          {widgetOptions.map((widget) => (
            <div 
              key={widget.id} 
              className={styles.widgetOption} 
              onClick={() => {
                // Pour l'instant, on ferme simplement la modale
                onClose();
              }}
            >
              <div className={styles.widgetIconBox}>
                {widget.icon}
              </div>
              <h3 className={styles.widgetTitle}>{widget.title}</h3>
              <p className={styles.widgetDesc}>{widget.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

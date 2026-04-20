import Image from 'next/image';
import styles from './MainDashboardSection.module.css';
import SessionStartButton from './SessionStartButton';

export default function MainDashboardSection() {
  // Données mockées pour le graphique
  const chartData = [50, 35, 75, 45, 25, 85];

  return (
    <section className={styles.container}>
      {/* Carte des prochains rendez-vous */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          Prochains <strong>Rendez-vous</strong>
        </h2>

        <div className={styles.appointmentsList}>
          {/* Un rendez-vous rempli */}
          <div className={styles.appointmentItem}>
            <SessionStartButton className={styles.playButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
              </svg>
            </SessionStartButton>
            
            <div className={styles.appointmentTime}>8:00</div>
            
            <div className={styles.appointmentInfo}>
              <h4 className={styles.clientName}>SOPHIE DOE</h4>
              <p className={styles.serviceName}>Remplissage Cils</p>
            </div>
            
            <div className={styles.appointmentStatus}>DEMAIN</div>
            
            <div className={styles.actionIcons}>
              <Image src="/icones/mail.svg" alt="Mail" width={18} height={18} className={styles.actionIcon} />
              <Image src="/icones/transaction.svg" alt="Payer" width={18} height={18} className={styles.actionIcon} />
              <Image src="/icones/edit.svg" alt="Editer" width={18} height={18} className={styles.actionIcon} />
            </div>
          </div>

          {/* Emplacements vides */}
          <div className={styles.emptySlot}></div>
          <div className={styles.emptySlot}></div>
        </div>
      </div>

      {/* Carte des statistiques de revenus */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <strong>Statistique</strong> <span className={styles.lightText}>des Revenus</span>
        </h2>

        {/* Graphique custom en CSS */}
        <div className={styles.chartContainer}>
          <div className={styles.axes}></div>
          <div className={styles.barsContainer}>
            {chartData.map((value, index) => (
              <div 
                key={index} 
                className={styles.bar} 
                style={{ height: `${value}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

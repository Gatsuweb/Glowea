import Image from 'next/image';
import styles from './SummaryCards.module.css';
import WidgetButton from './WidgetButton';

export default function SummaryCards() {
  return (
    <section className={styles.cardsContainer}>
      {/* Première carte : Rendez-vous du mois */}
      <div className={`${styles.card} ${styles.cardTextured}`}>
        <div className={styles.iconWrapper}>
          <Image src="/icones/agenda.svg" alt="Agenda" width={64} height={64} className={styles.icon} />
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>
            <strong>Rendez-vous</strong> <span className={styles.lightText}>du mois</span>
          </h3>
          <p className={styles.cardValue}>18</p>
        </div>
      </div>

      {/* Deuxième carte : Revenus du mois */}
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Image src="/icones/transaction.svg" alt="Revenus" width={64} height={64} className={styles.icon} />
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>
            <strong>Revenus</strong> <span className={styles.lightText}>du mois</span>
          </h3>
          <div className={styles.valueWrapper}>
            <p className={styles.cardValue}>1754€</p>
            <span className={styles.badgeGreen}>+50% sur le mois dernier</span>
          </div>
        </div>
      </div>

      {/* Troisième carte : Ajouter */}
      <WidgetButton className={`${styles.card} ${styles.cardAdd}`}>
        <span className={styles.plusIcon}>+</span>
      </WidgetButton>
    </section>
  );
}

import styles from "../page.module.css";

const appointments = [
  { time: "09:00", title: "Emma L.", detail: "Lash Lift" },
  { time: "11:00", title: "Pose complète", detail: "Volume russe" },
  { time: "14:00", title: "Brow Lift", detail: "Teinture + soin" },
  { time: "16:30", title: "Contrôle", detail: "Retouche cliente" },
];

const stockItems = [
  { name: "Colle Premium", count: "8 restants", width: "52%" },
  { name: "Patchs silicone", count: "12 restants", width: "68%" },
  { name: "Primer", count: "3 restants", width: "24%" },
];

export default function ModulesPreviewSection() {
  return (
    <section className={styles.modulesSection} id="fonctionnalites">
      <div className={styles.modulesIntro}>
        <span className={styles.eyebrow}>Ce que vous utilisez vraiment</span>
        <h2>Chaque détail de votre activité, au même endroit.</h2>
        <p>
          Agenda, clientes, rappels, paiements, stock et statistiques : Glowea
          rassemble les outils que vous utilisez chaque jour dans une interface
          simple et élégante.
        </p>
      </div>

      <div className={styles.modulesGrid}>
        <article className={`${styles.moduleCard} ${styles.moduleAgendaCard}`}>
          <div className={styles.moduleCardHeader}>
            <div>
              <span className={styles.moduleEyebrow}>Agenda</span>
              <strong>Planning de la semaine</strong>
            </div>
            <div className={styles.moduleCalendarBadge}>
              <span>1 - 7 Juin</span>
            </div>
          </div>

          <div className={styles.moduleAgenda}>
            <div className={styles.moduleAgendaDays}>
              <span>Lun</span>
              <span>Mar</span>
              <span>Mer</span>
              <span>Jeu</span>
            </div>

            <div className={styles.moduleAgendaTimeline}>
              {appointments.map((appointment) => (
                <div className={styles.moduleAgendaRow} key={appointment.time}>
                  <span>{appointment.time}</span>
                  <div>
                    <strong>{appointment.title}</strong>
                    <small>{appointment.detail}</small>
                  </div>
                  <i></i>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className={`${styles.moduleCard} ${styles.moduleClientCard}`}>
          <div className={styles.moduleCardHeader}>
            <div>
              <span className={styles.moduleEyebrow}>Fiche cliente</span>
              <strong>Suivi personnalisé</strong>
            </div>
          </div>

          <div className={styles.moduleClientProfile}>
            <div className={styles.moduleClientAvatar}>E</div>
            <div>
              <strong>Emma L.</strong>
              <span>Lash Lift + Teinture</span>
            </div>
          </div>

          <div className={styles.moduleClientMeta}>
            <article>
              <span>Dernière visite</span>
              <strong>12 mai</strong>
            </article>
            <article>
              <span>Photos</span>
              <strong>8</strong>
            </article>
            <article>
              <span>Historique</span>
              <strong>3 prestations</strong>
            </article>
          </div>

          <div className={styles.moduleClientGallery}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </article>

        <article className={`${styles.moduleCard} ${styles.moduleSmsCard}`}>
          <div className={styles.moduleCardHeader}>
            <div>
              <span className={styles.moduleEyebrow}>Rappels automatiques</span>
              <strong>SMS envoyé par Glowea</strong>
            </div>
          </div>

          <div className={styles.moduleSmsBubble}>
            <span>Glowea ✨</span>
            <p>Bonjour Emma,</p>
            <p>Petit rappel pour votre rendez-vous demain à 14h.</p>
            <p>À bientôt.</p>
          </div>
        </article>

        <article className={`${styles.moduleCard} ${styles.moduleStockCard}`}>
          <div className={styles.moduleCardHeader}>
            <div>
              <span className={styles.moduleEyebrow}>Stock produits</span>
              <strong>Cabine sous contrôle</strong>
            </div>
          </div>

          <div className={styles.moduleStockList}>
            {stockItems.map((item) => (
              <div className={styles.moduleStockRow} key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.count}</span>
                </div>
                <div className={styles.moduleStockBar}>
                  <i style={{ width: item.width }}></i>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.moduleCard} ${styles.moduleStatsCard}`}>
          <div className={styles.moduleCardHeader}>
            <div>
              <span className={styles.moduleEyebrow}>Statistiques</span>
              <strong>CA du mois</strong>
            </div>
            <span className={styles.moduleGrowth}>+18%</span>
          </div>

          <div className={styles.moduleStatsValue}>1 840 EUR</div>

          <div className={styles.moduleChart}>
            <span style={{ height: "32%" }}></span>
            <span style={{ height: "48%" }}></span>
            <span style={{ height: "58%" }}></span>
            <span style={{ height: "74%" }}></span>
            <span style={{ height: "92%" }}></span>
          </div>
        </article>

        <article className={`${styles.moduleCard} ${styles.modulePaymentCard}`}>
          <div className={styles.moduleCardHeader}>
            <div>
              <span className={styles.moduleEyebrow}>Paiements et acomptes</span>
              <strong>Réservation confirmée</strong>
            </div>
          </div>

          <div className={styles.modulePaymentBody}>
            <div className={styles.modulePaymentUser}>
              <div className={styles.modulePaymentAvatar}></div>
              <div>
                <strong>Emma L.</strong>
                <span>Acompte reçu</span>
              </div>
            </div>

            <div className={styles.modulePaymentAmount}>
              <strong>30 EUR</strong>
              <span>✓ Confirmé</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

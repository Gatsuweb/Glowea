"use client";

import React, { useState } from "react";
import Image from "next/image";
import styles from "../dashboard/dashboard.module.css";
import RevenueChart from "./RevenueChart";
import StockPie from "./StockPie";
import SessionModal from "./SessionModal";
import NewAppointmentModal from "./NewAppointmentModal";
import NewClientModal from "./NewClientModal";
import SendPromoModal from "./SendPromoModal";

export default function DashboardClientWrapper({ firstName, lastName }: { firstName: string, lastName: string }) {
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [isNewClientModalOpen, setNewClientModalOpen] = useState(false);
  const [isSendPromoModalOpen, setSendPromoModalOpen] = useState(false);

  return (
    <main className={styles.layout}>
      {/* Welcome Section */}
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>Bienvenue {firstName} {lastName}</h1>
          <p>JEUDI 26 MARS - 3 RENDEZ-VOUS AUJOURD'HUI</p>
        </div>
        <div className={styles.actionButtons}>
          <button className={styles.actionBtn} onClick={() => setNewAppointmentModalOpen(true)}>
            <Image src="/icones/+.svg" alt="RDV" width={18} height={18} />
          </button>
          <button className={styles.actionBtn} onClick={() => setNewClientModalOpen(true)}>
            <Image src="/icones/clients.svg" alt="Clients" width={24} height={24} />
          </button>
          <button className={styles.actionBtn} onClick={() => setSendPromoModalOpen(true)}>
            <Image src="/icones/promo.svg" alt="Promo" width={24} height={24} />
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <Image src="/icones/agenda.svg" alt="Rendez-vous" width={40} height={40} />
          </div>
          <div className={styles.statCardInfo}>
            <div className={styles.statCardTitle}>Rendez-vous <span>du mois</span></div>
            <div className={styles.statCardValue}>18</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <Image src="/icones/transaction.svg" alt="Revenus" width={40} height={40} />
          </div>
          <div className={styles.statCardInfo}>
            <div className={styles.statCardTitle}>Revenus <span>du mois</span></div>
            <div className={styles.statCardValue}>1754€</div>
          </div>
          <div className={styles.statCardTrend}>+5% sur le mois dernier</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <Image src="/icones/objectif.svg" alt="Objectif" width={40} height={40} />
          </div>
          <div className={styles.statCardInfo}>
            <div className={styles.statCardTitle}>Objectif <span>du mois</span></div>
            <div className={styles.statCardValue}>17/34 <span style={{ fontSize: '0.6rem', fontWeight: 400, color: '#888' }}>RDV réalisé</span></div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className={styles.mainGrid}>
        {/* Appointments */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Prochains <span>Rendez-vous</span></h2>
          <div className={styles.appointmentList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.appointmentItem} onClick={() => setSessionModalOpen(true)}>
                <div className={styles.appointmentTime}>
                  08:00
                </div>
                <div className={styles.appointmentDetails}>
                  <div className={styles.appointmentName}>SOPHIE DOE</div>
                  <div className={styles.appointmentType}>Remplissage Cils</div>
                </div>
                <div className={styles.appointmentTags}>
                  <span className={styles.tagDemain}>DEMAIN</span>
                  <div className={styles.appointmentActions}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.actionIcon} onClick={(e) => e.stopPropagation()}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.actionIcon} onClick={(e) => e.stopPropagation()}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.actionIcon} onClick={(e) => e.stopPropagation()}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </div>
                  <button 
                    className={styles.playButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionModalOpen(true);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 4L20 12L6 20V4Z" fill="white"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Stats */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Statistique <span>des Revenus</span></h2>
          <div style={{ height: '200px', width: '100%' }}>
            <RevenueChart />
          </div>
        </div>

        {/* Stock */}
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>Mon <span>stock</span></h2>
            <a href="/dashboard/stock" style={{ fontSize: '0.85rem', color: 'var(--tertiary)', textDecoration: 'none', fontWeight: 600 }}>Gérer &rarr;</a>
          </div>
          <div className={styles.stockDonutsContainer} style={{ flex: 1 }}>
            <StockPie current={5} total={5} label="Colle" color="var(--tertiary)" emptyColor="var(--secondary)" />
            <StockPie current={8} total={16} label="Cils" color="var(--tertiary)" emptyColor="var(--secondary)" />
            <StockPie current={3} total={3} label="Primer" color="var(--tertiary)" emptyColor="var(--secondary)" />
          </div>
        </div>

        {/* Top Clientes */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Top <span>clientes</span></h2>
          <div className={styles.topClientList}>
            <div className={styles.topClientItem}>
              <div className={styles.topClientRank}>1</div>
              <div className={styles.topClientInfo}>
                <div className={styles.topClientName}>Sophie Doe</div>
                <div className={styles.topClientDetail}>8 visites</div>
              </div>
              <div className={styles.topClientAmount}>450 €</div>
            </div>
            <div className={styles.topClientItem}>
              <div className={styles.topClientRank}>2</div>
              <div className={styles.topClientInfo}>
                <div className={styles.topClientName}>Laura Croft</div>
                <div className={styles.topClientDetail}>5 visites</div>
              </div>
              <div className={styles.topClientAmount}>320 €</div>
            </div>
            <div className={styles.topClientItem}>
              <div className={styles.topClientRank}>3</div>
              <div className={styles.topClientInfo}>
                <div className={styles.topClientName}>Emma L.</div>
                <div className={styles.topClientDetail}>4 visites</div>
              </div>
              <div className={styles.topClientAmount}>210 €</div>
            </div>
          </div>
          <div className={styles.topClientActions}>
            <button className={styles.btnFideliser}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              Fidéliser avec une offre
            </button>
          </div>
        </div>
      </section>

      {/* Insight Banner */}
      <section className={styles.insightBanner}>
        <div className={styles.insightContent}>
          <div className={styles.insightIcon}>
            <Image src="/icones/lumiere.png" alt="Idea" width={40} height={40} />
          </div>
          <div className={styles.insightText}>
            <div className={styles.insightTitle}>Insight du jour</div>
            <p className={styles.insightDesc}>Tu n'as que 2 rendez-vous demain.<br/>Pense à envoyer une promo pour<br/>remplir ton planning !</p>
            <button className={styles.insightBtn} onClick={() => setSendPromoModalOpen(true)}>Envoyer une promo</button>
          </div>
        </div>
      </section>

      <SessionModal 
        isOpen={isSessionModalOpen} 
        onClose={() => setSessionModalOpen(false)} 
        clientName="SOPHIE DOE"
        time="08:00"
        category="Cils"
      />

      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setNewAppointmentModalOpen(false)}
      />

      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        onSave={(clientName) => {
          console.log("Nouveau client créé depuis le Dashboard:", clientName);
        }}
      />

      <SendPromoModal
        isOpen={isSendPromoModalOpen}
        onClose={() => setSendPromoModalOpen(false)}
      />
    </main>
  );
}
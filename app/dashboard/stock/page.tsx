"use client";

import React, { useState } from "react";
import styles from "./stock.module.css";

export default function StockPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const products = [
    {
      id: 1,
      name: "Primer",
      desc: "Adhérence pour cils",
      tags: ["Cils", "Dose unique"],
      count: 12,
      status: "EN STOCK",
      statusColor: "Green",
      price: "3,60€",
      expire: "02-05-2026"
    },
    {
      id: 2,
      name: "Primer",
      desc: "Adhérence pour cils",
      tags: ["Cils", "Dose unique"],
      count: 4,
      status: "STOCK BAS",
      statusColor: "Orange",
      price: "3,60€",
      expire: "02-05-2026"
    },
    {
      id: 3,
      name: "Primer",
      desc: "Adhérence pour cils",
      tags: ["Cils", "Dose unique"],
      count: 0,
      status: "RUPTURE",
      statusColor: "Red",
      price: "3,60€",
      expire: "02-05-2026"
    }
  ];

  const movements = [
    {
      id: 1,
      name: "Gel UV nude",
      desc: "Consommé - Pose complète - 14/03",
      amount: "-1",
      type: "out"
    },
    {
      id: 2,
      name: "Colle nano rings",
      desc: "Réassort commande #1023 - 12/03",
      amount: "+10",
      type: "in"
    },
    {
      id: 3,
      name: "Cils volume russe 3D",
      desc: "Consommé - Volume Russe - 12/03",
      amount: "-2",
      type: "out"
    },
    {
      id: 4,
      name: "Shampoing cils",
      desc: "Vente client - 11/03",
      amount: "-1",
      type: "out"
    }
  ];

  return (
    <main className={styles.layout}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mon Stock</h1>
        <button className={styles.btnPrimary}>+ Ajouter une transaction</button>
      </div>

      {/* Search */}
      <section className={styles.searchSection}>
        <div className={styles.searchInputWrapper}>
          <input 
            type="text" 
            placeholder="Rechercher un produit" 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={styles.filterBtn}>Filtrer</button>
      </section>

      {/* Stats Grids */}
      <section className={styles.statsGrid3}>
        <div className={`${styles.statCard} ${styles.statCardPink}`}>
          <div className={styles.statTitle}>Produits</div>
          <div className={styles.statValue}>24</div>
          <div className={styles.statSub}>RÉFÉRENCES ACTIVES</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Alertes</div>
          <div className={styles.statValue}>3</div>
          <div className={styles.statSub}>STOCK FAIBLE</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Ruptures</div>
          <div className={styles.statValue}>1</div>
          <div className={styles.statSub}>À COMMANDER</div>
        </div>
      </section>

      <section className={styles.statsGrid2}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Coût du stock</div>
          <div className={styles.statValue}>240 €</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Consommé ce mois</div>
          <div className={styles.statValue}>88 €</div>
        </div>
      </section>

      {/* Catalogue */}
      <h2 className={styles.sectionTitle}>Catalogue de produit</h2>
      <section className={styles.productsGrid}>
        {products.map(prod => (
          <div key={prod.id} className={styles.productCard}>
            <div className={styles.prodHeader}>
              <div className={styles.prodIconBox}>
                {/* SVG Bottle Icon */}
                <svg width="24" height="32" viewBox="0 0 24 32" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 8h10M9 8V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M6 8h12a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/>
                  <rect x="8" y="14" width="8" height="10" rx="1" fill="#FCD7D1" stroke="none"/>
                </svg>
              </div>
              <div className={styles.prodInfo}>
                <h3 className={styles.prodName}>{prod.name}</h3>
                <p className={styles.prodDesc}>{prod.desc}</p>
                <div className={styles.prodTags}>
                  {prod.tags.map((t, i) => (
                    <span key={i} className={styles.prodTag}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.prodDivider}></div>

            <div className={styles.prodCounter}>
              <button className={styles.counterBtn}>-</button>
              <span className={styles.counterValue}>{prod.count}</span>
              <button className={styles.counterBtn}>+</button>
            </div>

            <div className={styles.prodStatus}>
              <div className={`${styles.statusDot} ${styles[`dot${prod.statusColor}`]}`}></div>
              <span className={styles[`text${prod.statusColor}`]}>{prod.status}</span>
            </div>

            <div className={styles.prodFooter}>
              <span>Prix/u : {prod.price}</span>
              <span>Expire le: {prod.expire}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Mouvements */}
      <h2 className={styles.sectionTitle}>Mouvement du stock</h2>
      <section className={styles.movementsCard}>
        {movements.map(mov => (
          <div key={mov.id} className={styles.movementItem}>
            <div className={styles.movLeft}>
              <div className={`${styles.movIcon} ${mov.type === 'out' ? styles.iconRed : styles.iconGreen}`}>
                {mov.type === 'out' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M19 12l-7 7-7-7"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                )}
              </div>
              <div className={styles.movInfo}>
                <span className={styles.movName}>{mov.name}</span>
                <span className={styles.movSub}>{mov.desc}</span>
              </div>
            </div>
            <div className={`${styles.movAmount} ${mov.type === 'out' ? styles.amountRed : styles.amountGreen}`}>
              {mov.amount}
            </div>
          </div>
        ))}
      </section>

    </main>
  );
}
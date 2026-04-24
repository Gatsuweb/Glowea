"use client";

import React, { useState } from "react";
import Image from "next/image";
import styles from "./compta.module.css";
import SparkBarChart from "../../components/SparkBarChart";

export default function ComptaPage() {
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("2026-03");
  const [activeTab, setActiveTab] = useState("vue"); // "vue", "stats", "simulation"

  // States pour le Simulateur
  const [simObjRevenu, setSimObjRevenu] = useState("2000");
  const [simObjCharges, setSimObjCharges] = useState("640");
  
  // State pour la Modale du Bilan
  const [isBilanModalOpen, setIsBilanModalOpen] = useState(false);

  const [simTarif, setSimTarif] = useState(72);
  const [simRdv, setSimRdv] = useState(34);
  const [simCharges, setSimCharges] = useState(640);

  const urssafRate = 0.212; // 21.2% URSSAF
  const simulatedCA = simTarif * simRdv;
  const simulatedBeneficeBrut = simulatedCA - simCharges;
  const simulatedUrssaf = simulatedCA * urssafRate;
  const simulatedNet = simulatedBeneficeBrut - simulatedUrssaf;

  const chartData1 = [
    { value: 12 }, { value: 18 }, { value: 15 }, { value: 20 }, { value: 10 }, { value: 25 }
  ];
  
  const chartData2 = [
    { value: 15 }, { value: 10 }, { value: 22 }, { value: 18 }, { value: 25 }, { value: 30 }
  ];

  const transactions = [
    { id: 1, name: "Sophie Doe", details: "Cil à cil - 04-03-2026", amount: "+400", type: "revenus", month: "2026-03" },
    { id: 2, name: "Achat Matériel", details: "Fournisseur X - 02-03-2026", amount: "-120", type: "depenses", month: "2026-03" },
    { id: 3, name: "Laura Croft", details: "Remplissage - 28-02-2026", amount: "+150", type: "revenus", month: "2026-02" },
    { id: 4, name: "Electricité", details: "Facture EDF - 15-03-2026", amount: "-122", type: "depenses", month: "2026-03" }
  ];

  const filteredTransactions = transactions.filter(t => {
    const matchType = filterType === "all" || t.type === filterType;
    const matchMonth = t.month === filterMonth;
    return matchType && matchMonth;
  });

  const daysData = [
    { day: "L", count: 2, level: "low" },
    { day: "M", count: 1, level: "low" },
    { day: "M", count: 8, level: "high" },
    { day: "J", count: 3, level: "low" },
    { day: "V", count: 5, level: "medium" },
    { day: "S", count: 6, level: "medium" },
    { day: "D", count: 0, level: "empty" }
  ];

  return (
    <main className={styles.layout}>
      <h1 className={styles.title}>Ma Compta</h1>

      {/* Bilan Card */}
      <section className={styles.bilanCard}>
        <h2 className={styles.bilanTitle}>Bilan financier mensuel</h2>
        <div className={styles.bilanActions}>
          <button className={styles.btnGreen} onClick={() => setIsBilanModalOpen(true)}>Afficher le bilan</button>
          <button className={styles.btnPink}>Télécharger en PDF</button>
          <button className={styles.btnWhite}>Export Excel</button>
        </div>
      </section>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'vue' ? styles.tabActive : styles.tabInactive}`}
          onClick={() => setActiveTab('vue')}
        >
          Vue d'ensemble
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : styles.tabInactive}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'simulation' ? styles.tabActive : styles.tabInactive}`}
          onClick={() => setActiveTab('simulation')}
        >
          Simulateur
        </button>
      </div>

      {activeTab === 'stats' && (
        <>
          <section className={styles.statsGridStats3}>
            {/* Card 1: RDV du mois */}
            <div className={`${styles.statCard} ${styles.caCard}`}>
              <div className={styles.caDecor}>
                <span>- $ -</span>
              </div>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>RDV <span>du mois</span></div>
                  <div className={styles.statSubtitle}>MARS 2026</div>
                </div>
              </div>
              <div className={styles.statBigText}>
                35 <span className={styles.statTrend}>+4 SUR LE MOIS DERNIER</span>
              </div>
            </div>

            {/* Card 2: Top prestations */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitle}>Top prestations</div>
              </div>
              <div className={styles.statList}>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Remplissage :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '80%' }}></div>
                  </div>
                  <span className={styles.statListValue}>350 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Volume russe :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '60%' }}></div>
                  </div>
                  <span className={styles.statListValue}>122 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Pose complète :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '40%' }}></div>
                  </div>
                  <span className={styles.statListValue}>80 €</span>
                </div>
              </div>
            </div>

            {/* Card 3: Top clients */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitle}>Top clients</div>
              </div>
              <div className={styles.statList}>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Client 1</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '80%' }}></div>
                  </div>
                  <span className={styles.statListValue}>44 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Client 2 :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '60%' }}></div>
                  </div>
                  <span className={styles.statListValue}>34 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Client 3 :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '30%' }}></div>
                  </div>
                  <span className={styles.statListValue}>10 €</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.statsGridStats2}>
            {/* Card 4: Meilleure semaine */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Meilleure <span>semaine</span></div>
                </div>
              </div>
              <div className={styles.chartContainer} style={{ height: '100px', marginTop: '20px' }}>
                <SparkBarChart data={chartData1} color="#FCD7D1" />
              </div>
            </div>

            {/* Card 5: Revenu à l'heure */}
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Revenu à l'heure</div>
                </div>
              </div>
              <div className={styles.statBigText}>
                35<span>/h</span>
              </div>
            </div>
          </section>

          {/* Card 6: Meilleure jour de la semaine */}
          <section className={styles.statsGridWide}>
            <div className={styles.statCardLarge}>
              <div className={styles.statHeader}>
                <div className={styles.statTitle}>Meilleure jour de la semaine</div>
              </div>
              <div className={styles.dayBlocksContainer}>
                {daysData.map((d, index) => (
                  <div 
                    key={index} 
                    className={`${styles.dayBlock} ${styles[d.level]}`}
                    title={`${d.count} RDV`}
                  >
                  </div>
                ))}
              </div>
              <div className={styles.heatmapLegend}>
                <span className={styles.legendText}>Moins</span>
                <div className={`${styles.legendBox} ${styles.empty}`}></div>
                <div className={`${styles.legendBox} ${styles.low}`}></div>
                <div className={`${styles.legendBox} ${styles.medium}`}></div>
                <div className={`${styles.legendBox} ${styles.high}`}></div>
                <span className={styles.legendText}>Plus de RDV</span>
              </div>
            </div>
          </section>

          {/* Alert Banner */}
          <section className={styles.alertBanner}>
            <div className={styles.alertText}>
              3 clientes n'ont pas repris RDV depuis plus de 6 semaines. Une relance personnalisée pourrait récupérer ~180€ de CA.
            </div>
            <a className={styles.alertLink}>Relancer les clients concernés ↗</a>
          </section>
        </>
      )}

      {activeTab === 'simulation' && (
        <section className={styles.simulatorSection}>
          
          {/* Bloc 1: Objectif */}
          <div className={styles.simBlockCard}>
            <h3 className={styles.simBlockTitle}>MON OBJECTIF</h3>
            <div className={styles.simInputGroup}>
              <label className={styles.simLabel}>Revenu net visé (après URSSAF et charges)</label>
              <div className={styles.simInputWrapper}>
                <input 
                  type="number" 
                  className={styles.simInput} 
                  value={simObjRevenu}
                  onChange={(e) => setSimObjRevenu(e.target.value)}
                />
                <span className={styles.simInputSuffix}>€/mois</span>
              </div>
            </div>
            <div className={styles.simInputGroup}>
              <label className={styles.simLabel}>Charges fixes mensuelles</label>
              <div className={styles.simInputWrapper}>
                <input 
                  type="number" 
                  className={styles.simInput} 
                  value={simObjCharges}
                  onChange={(e) => setSimObjCharges(e.target.value)}
                />
                <span className={styles.simInputSuffix}>€/mois</span>
              </div>
            </div>
          </div>

          {/* Bloc 2: Message d'alerte dynamique */}
          <div className={styles.simMessageBanner}>
            Pour atteindre {simObjRevenu}€ net, il te faut {Math.ceil((Number(simObjRevenu) + Number(simObjCharges)) / 60)} RDV/mois à ton panier actuel de 60€. Tu en as 34 — ajuste le mix ou augmente tes tarifs.
          </div>

          {/* Bloc 3: Sliders */}
          <div className={`${styles.simBlockCard} ${styles.simDecorBg}`}>
            <h3 className={styles.simBlockTitle}>ET SI JE MODIFIAIS MON ACTIVITÉ ?</h3>
            
            <div className={styles.simSliderRow}>
              <label className={styles.simLabel}>Tarif moyen par RDV</label>
              <div className={styles.simSliderWrapper}>
                <input 
                  type="range" 
                  min="30" max="150" 
                  className={styles.simSlider} 
                  value={simTarif}
                  onChange={(e) => setSimTarif(Number(e.target.value))}
                />
                <span className={styles.simSliderValue}>{simTarif}€</span>
              </div>
            </div>

            <div className={styles.simSliderRow}>
              <label className={styles.simLabel}>RDV par mois</label>
              <div className={styles.simSliderWrapper}>
                <input 
                  type="range" 
                  min="10" max="100" 
                  className={styles.simSlider} 
                  value={simRdv}
                  onChange={(e) => setSimRdv(Number(e.target.value))}
                />
                <span className={styles.simSliderValue}>{simRdv}</span>
              </div>
            </div>

            <div className={styles.simSliderRow}>
              <label className={styles.simLabel}>Charges mensuelles</label>
              <div className={styles.simSliderWrapper}>
                <input 
                  type="range" 
                  min="100" max="2000" 
                  className={styles.simSlider} 
                  value={simCharges}
                  onChange={(e) => setSimCharges(Number(e.target.value))}
                />
                <span className={styles.simSliderValue}>{simCharges}€</span>
              </div>
            </div>
          </div>

          {/* Bloc 4: Résultat Simulé */}
          <div className={styles.simResultCard}>
            <h2 className={styles.simResultTitle}>Résultat simulé</h2>
            <div className={styles.simResultTable}>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>C.A. mensuel</span>
                <span className={styles.simResultValue}>{simulatedCA}€</span>
              </div>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>Charges</span>
                <span className={`${styles.simResultValue} ${styles.valRed}`}>-{simCharges}€</span>
              </div>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>Bénéfice brut</span>
                <span className={styles.simResultValue}>{simulatedBeneficeBrut}€</span>
              </div>
              <div className={styles.simResultRow}>
                <span className={styles.simResultLabel}>URSSAF (-21.2%)</span>
                <span className={`${styles.simResultValue} ${styles.valRed}`}>-{Math.round(simulatedUrssaf)}€</span>
              </div>
              <div className={`${styles.simResultRow} ${styles.simResultRowNet}`}>
                <span className={styles.simResultLabelBold}>Bénéfice Net dans ta poche</span>
                <span className={styles.simResultValueBig}>{Math.round(simulatedNet)}€</span>
              </div>
            </div>
          </div>

        </section>
      )}

      {activeTab === 'vue' && (
        <>
          {/* Filter Bar */}
          <section className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <Image src="/icones/agenda.svg" alt="Calendar" width={40} height={40} className={styles.filterIcon} />
              <input 
                type="month" 
                className={styles.dateInput} 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
              <select 
                className={styles.typeFilter}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Toutes les transactions</option>
                <option value="revenus">Revenus uniquement</option>
                <option value="depenses">Dépenses uniquement</option>
              </select>
            </div>
            <div className={styles.filterActions}>
              <button className={styles.btnGreen}>Nouvelle transaction</button>
              <button className={styles.btnDarkRed}>Nouvelle charge</button>
            </div>
          </section>

          {/* Stats Grid */}
          <section className={styles.statsGrid}>
            {/* Card 1: CA */}
            <div className={`${styles.statCard} ${styles.caCard}`}>
              <div className={styles.caDecor}>
                <span>- $ -</span>
              </div>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>C.A. <span>du mois</span></div>
                  <div className={styles.statSubtitle}>MARS 2026</div>
                </div>
              </div>
              <div className={styles.statBigValue}>
                1976 € <span className={styles.statTrend}>+10% SUR LE MOIS DERNIER</span>
              </div>
            </div>

            {/* Card 2: Charges récurrentes */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Charges</div>
                  <div className={styles.statTitle}>récurrentes</div>
                </div>
                <div className={styles.statTopValue}>- 552 €</div>
              </div>
              <div className={styles.statList}>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Local partagé :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '80%' }}></div>
                  </div>
                  <span className={styles.statListValue}>350 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Electricité :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '40%' }}></div>
                  </div>
                  <span className={styles.statListValue}>122 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Assurance :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '25%' }}></div>
                  </div>
                  <span className={styles.statListValue}>80 €</span>
                </div>
              </div>
            </div>

            {/* Card 3: Charges matériels */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Charges</div>
                </div>
                <div className={styles.statTopValue}>- 88 €</div>
              </div>
              <div className={styles.statList}>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Matériel 1 :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '60%' }}></div>
                  </div>
                  <span className={styles.statListValue}>44 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Matériel 2 :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '45%' }}></div>
                  </div>
                  <span className={styles.statListValue}>34 €</span>
                </div>
                <div className={styles.statListItem}>
                  <span className={styles.statListLabel}>Matériel 3 :</span>
                  <div className={styles.statListBar}>
                    <div className={styles.statListBarFill} style={{ width: '15%' }}></div>
                  </div>
                  <span className={styles.statListValue}>10 €</span>
                </div>
              </div>
            </div>

            {/* Card 4: Bénéfices */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Bénéfices</div>
                  <div className={styles.statSubtitle}>-21.2% URSSAF</div>
                </div>
                <div className={styles.statTopValue}>+1336 €</div>
              </div>
              <div className={styles.chartContainer}>
                <SparkBarChart data={chartData1} color="#FCD7D1" />
              </div>
            </div>

            {/* Card 5: Nouveaux clients */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Nouveaux <span>clients</span></div>
                  <div className={styles.statSubtitle}>MARS 2026</div>
                </div>
                <div className={styles.statTopValue}>+3</div>
              </div>
              <div className={styles.statTextList}>
                <div className={styles.statTextItem}>
                  <span className={styles.statTextLabel}>Mélanie Doe :</span>
                  <span className={styles.statTextValue}>+1 Remplissage</span>
                </div>
                <div className={styles.statTextItem}>
                  <span className={styles.statTextLabel}>Céline Doe :</span>
                  <span className={styles.statTextValue}>+1 Cils à cils</span>
                </div>
                <div className={styles.statTextItem}>
                  <span className={styles.statTextLabel}>Laura Doe :</span>
                  <span className={styles.statTextValue}>+1 Cils à cils</span>
                </div>
              </div>
            </div>

            {/* Card 6: Panier moyen */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statTitleBlock}>
                  <div className={styles.statTitle}>Panier moyen</div>
                </div>
                <div className={styles.statTopValue}>+82 €</div>
              </div>
              <div className={styles.chartContainer}>
                <SparkBarChart data={chartData2} color="#FCD7D1" />
              </div>
            </div>
          </section>

          {/* Revenus Section */}
          <section className={styles.revenusSection}>
            <h2 className={styles.revenusTitle}>Mes Transactions</h2>
            <div className={styles.transactionsWrapper}>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(transaction => (
                  <div key={transaction.id} className={styles.transactionItem}>
                    <div className={styles.transLeft}>
                      <div className={transaction.type === 'revenus' ? styles.transIcon : styles.transIconRed}>
                        {transaction.type === 'revenus' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M19 12l-7 7-7-7"/>
                          </svg>
                        )}
                      </div>
                      <div className={styles.transDetails}>
                        <div className={styles.transName}>{transaction.name}</div>
                        <div className={styles.transSub}>{transaction.details}</div>
                      </div>
                    </div>
                    <div className={transaction.type === 'revenus' ? styles.transAmount : styles.transAmountRed}>
                      {transaction.amount} €
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  Aucune transaction trouvée pour ces critères.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Modal Bilan */}
      {isBilanModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBilanModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Bilan Financier</h2>
              <span className={styles.modalSubtitle}>Mars 2026</span>
              <button className={styles.modalClose} onClick={() => setIsBilanModalOpen(false)}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Section CA */}
              <div className={styles.modalSection}>
                <div className={styles.modalRowMain}>
                  <span className={styles.modalRowLabel}>Chiffre d'Affaires Global</span>
                  <span className={styles.modalRowValuePositive}>+ 1976,00 €</span>
                </div>
                <div className={styles.modalSubRow}>
                  <span>Prestations (35 RDV)</span>
                  <span>1 826,00 €</span>
                </div>
                <div className={styles.modalSubRow}>
                  <span>Vente de produits</span>
                  <span>150,00 €</span>
                </div>
              </div>

              {/* Section Charges */}
              <div className={styles.modalSection}>
                <div className={styles.modalRowMain}>
                  <span className={styles.modalRowLabel}>Charges Totales</span>
                  <span className={styles.modalRowValueNegative}>- 640,00 €</span>
                </div>
                <div className={styles.modalSubRow}>
                  <span>Frais fixes (Local, Assurance...)</span>
                  <span>552,00 €</span>
                </div>
                <div className={styles.modalSubRow}>
                  <span>Matériels & Consommables</span>
                  <span>88,00 €</span>
                </div>
              </div>

              {/* Section Taxes */}
              <div className={styles.modalSection}>
                <div className={styles.modalRowMain}>
                  <span className={styles.modalRowLabel}>Taxes & Cotisations</span>
                  <span className={styles.modalRowValueNegative}>- 418,91 €</span>
                </div>
                <div className={styles.modalSubRow}>
                  <span>URSSAF (21.2% du CA)</span>
                  <span>418,91 €</span>
                </div>
              </div>

              {/* Ligne Résultat Net */}
              <div className={styles.modalDivider}></div>
              <div className={styles.modalResultRow}>
                <div className={styles.modalResultText}>
                  <h3>Bénéfice Net</h3>
                  <p>Montant réel généré ce mois-ci après toutes les charges et taxes.</p>
                </div>
                <div className={styles.modalResultAmount}>
                  + 917,09 €
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnWhite} onClick={() => setIsBilanModalOpen(false)}>Fermer</button>
              <button className={styles.btnPink}>Télécharger le PDF</button>
            </div>
          </div>
        </div>
      )}

    </main>

  );
}

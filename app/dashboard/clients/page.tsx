"use client";

import React, { useState } from "react";
import styles from "./clients.module.css";

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState("infos");

  // Mock des clients pour la liste de gauche
  const clientsList = [
    { id: 1, name: "Johnny Doug", rdv: 8, active: true },
    { id: 2, name: "Johnny Doug", rdv: 8, active: false },
    { id: 3, name: "Johnny Doug", rdv: 8, active: false },
    { id: 4, name: "Johnny Doug", rdv: 8, active: false },
  ];

  // Mock de données pour Historique des RDV
  const historyRdv = [
    { id: 1, date: "25 mars 2025", time: "10:00", client: "Emma L.", presta: "Pose cil à cil", status: "Terminé", amount: "80 €" },
    { id: 2, date: "24 mars 2025", time: "13:30", client: "Laura M.", presta: "Remplissage gel", status: "Terminé", amount: "50 €" },
    { id: 3, date: "24 mars 2025", time: "15:30", client: "Chloé D.", presta: "Dépose + pose", status: "En attente", amount: "70 €" },
    { id: 4, date: "23 mars 2025", time: "17:00", client: "Sofia R.", presta: "Gainage", status: "Terminé", amount: "40 €" },
    { id: 5, date: "22 mars 2025", time: "11:00", client: "Julie T.", presta: "Pose cil volume", status: "Terminé", amount: "90 €" }
  ];

  // Mock de données pour Historique des Prestations
  const historyPresta = [
    { id: 1, name: "Pose cil à cil", cat: "Cils", count: 18, ca: "1 440 €" },
    { id: 2, name: "Remplissage gel", cat: "Ongles", count: 15, ca: "750 €" },
    { id: 3, name: "Pose cil volume", cat: "Cils", count: 8, ca: "720 €" },
    { id: 4, name: "Gainage", cat: "Ongles", count: 12, ca: "480 €" },
    { id: 5, name: "Dépose + pose", cat: "Ongles", count: 10, ca: "700 €" }
  ];

  return (
    <main className={styles.layout}>
      
      {/* SIDEBAR - Répertoire */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>Répertoire</h1>
          <span className={styles.clientCount}>53 clients</span>
        </div>

        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Rechercher un client" 
            className={styles.searchInput} 
          />
        </div>

        <label className={styles.selectAll}>
          <input type="checkbox" />
          Tout sélectionner
        </label>

        <div className={styles.clientList}>
          {clientsList.map(client => (
            <div 
              key={client.id} 
              className={`${styles.clientItem} ${client.active ? styles.clientItemActive : ''}`}
            >
              <div className={styles.clientAvatar}></div>
              <div className={styles.clientInfo}>
                <span className={styles.clientName}>{client.name}</span>
                <span className={styles.clientSub}>{client.rdv} RENDEZ-VOUS</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT - Fiche Client */}
      <section className={styles.mainContent}>
        
        {/* Header Card */}
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div>
              <h2 className={styles.headerTitle}>Johnny Doug</h2>
              <span className={styles.headerSubtitle}>Cliente depuis le 14 mars 2024 - 8 visites</span>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnNewRdv}>+ Nouveau RDV</button>
              <button className={styles.iconBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.headerContact}>
            <div className={styles.contactBlock}>
              <span className={styles.contactLabel}>Email</span>
              <span className={styles.contactValue}>sophie.caramel@gmail.com</span>
            </div>
            <div className={styles.contactBlock}>
              <span className={styles.contactLabel}>Téléphone</span>
              <span className={styles.contactValue}>+33 6 00 00 00 00</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'infos' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setActiveTab('infos')}
          >
            Infos
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'rdv' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setActiveTab('rdv')}
          >
            RDV
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'consentement' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setActiveTab('consentement')}
          >
            Consentement
          </button>
        </div>

        {activeTab === 'infos' && (
          <>
            {/* Coordonnées Card */}
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Coordonnées</h3>
                <div className={styles.cardIcons}>
                  <button className={styles.iconBtn} style={{ borderColor: 'transparent', color: '#F4B8B2' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </button>
                  <button className={styles.iconBtn} style={{ borderColor: 'transparent' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div className={styles.contactGrid}>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Nom complet :</span>
                  <span className={styles.infoValue}>Johnny Doug</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Instagram :</span>
                  <span className={styles.infoValue}>@sophiecaramel_</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Date de naissance :</span>
                  <span className={styles.infoValue}>02/08/2000</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Recommandée par :</span>
                  <span className={styles.infoValue}>Sophie Martin</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>sophie.caramel@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Notes & Allergies Card */}
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Notes & Allergies</h3>
                <div className={styles.cardIcons}>
                  <button className={styles.iconBtn} style={{ borderColor: 'transparent' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div className={styles.infoGrid}>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note 1</span>
                  <span className={styles.infoValue}>Allergie...</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note 4</span>
                  <span className={styles.infoValue}>Allergie...</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note 2</span>
                  <span className={styles.infoValue}>Allergie...</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note 5</span>
                  <span className={styles.infoValue}>Allergie...</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note 3</span>
                  <span className={styles.infoValue}>Allergie...</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note 6</span>
                  <span className={styles.infoValue}>Allergie...</span>
                </div>
              </div>
            </div>

            {/* Galerie des projets */}
            <div className={styles.galerieHeader}>
              <h3 className={styles.galerieTitle}>Galerie des projets</h3>
              <button className={styles.iconBtn} style={{ borderColor: 'transparent' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
            
            <div className={styles.galerieGrid}>
              <div className={styles.galerieMain}></div>
              <div className={styles.galerieItem}></div>
              <div className={styles.galerieItem}></div>
              <div className={styles.galerieItem}></div>
              <div className={styles.galerieItem}></div>
            </div>
          </>
        )}

        {activeTab === 'rdv' && (
          <div className={styles.rdvTabContent}>
            
            {/* Historique des RDV */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Historique des RDV</h3>
                <span className={styles.voirTout}>Voir tout &gt;</span>
              </div>
              
              <div className={styles.tableContainer}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>HEURE</th>
                      <th>CLIENTE</th>
                      <th>PRESTATION</th>
                      <th>STATUT</th>
                      <th>MONTANT</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRdv.map(rdv => (
                      <tr key={rdv.id}>
                        <td>{rdv.date}</td>
                        <td>{rdv.time}</td>
                        <td>
                          <div className={styles.tdClient}>
                            <div className={styles.tdAvatar}></div>
                            <span>{rdv.client}</span>
                          </div>
                        </td>
                        <td>{rdv.presta}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${rdv.status === 'Terminé' ? styles.statusGreen : styles.statusOrange}`}>
                            {rdv.status}
                          </span>
                        </td>
                        <td>{rdv.amount}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className={styles.tdActionBtn}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historique des Prestations */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Historique des Prestations</h3>
                <span className={styles.voirTout}>Voir tout &gt;</span>
              </div>
              
              <div className={styles.tableContainer}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th>PRESTATION</th>
                      <th>CATÉGORIE</th>
                      <th>NOMBRE</th>
                      <th>CHIFFRE D'AFFAIRES</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPresta.map(presta => (
                      <tr key={presta.id}>
                        <td>
                          <div className={styles.tdClient}>
                            <div className={styles.tdAvatarSquare}></div>
                            <span>{presta.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.catBadge}>
                            {presta.cat === 'Cils' ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11h-6V5h6v6z"/><path d="M11 19H5v-6h6v6z"/><path d="M19 19h-6v-6h6v6z"/><path d="M11 11H5V5h6v6z"/></svg>
                            )}
                            {presta.cat}
                          </span>
                        </td>
                        <td>{presta.count}</td>
                        <td>{presta.ca}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className={styles.btnVoirFiche}>
                            Voir la fiche &gt;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'consentement' && (
          <div className={styles.consentTabContent}>
            
            {/* Header Actions */}
            <div className={styles.consentActionsRow}>
              <p className={styles.consentDesc}>
                Gérez les autorisations légales, formulaires de santé et droits à l'image de votre cliente.
              </p>
              <button className={styles.btnNewRdv}>
                + Nouveau formulaire
              </button>
            </div>

            {/* Fiche Santé & Allergies */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div className={styles.consentTitleBox}>
                  <div className={styles.consentIconBoxPink}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </div>
                  <div>
                    <h3 className={styles.tableTitle}>Bilan Santé & Sensibilités</h3>
                    <span className={styles.consentSub}>Requis avant toute prestation (Cils & Ongles)</span>
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusGreen}`}>À jour (25 mars 2024)</span>
              </div>
              
              <div className={styles.consentGrid}>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Port de lentilles de contact</span>
                  <span className={styles.consentValue}>Non</span>
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Allergie Cyanoacrylate (Colle cils)</span>
                  <span className={styles.consentValue}>Aucune connue</span>
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Sensibilité Acrylates (Gels UV)</span>
                  <span className={styles.consentValue}>Légère sensibilité</span>
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Traitement médical en cours</span>
                  <span className={styles.consentValue}>Aucun</span>
                </div>
                <div className={styles.consentItemFull}>
                  <span className={styles.consentLabel}>Signature de la cliente</span>
                  <div className={styles.signatureBox}>
                    <span className={styles.signatureText}>Signé numériquement par Johnny Doug le 14/03/2024 à 10:15</span>
                    <button className={styles.btnOutline}>Voir le document</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Droit à l'image */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div className={styles.consentTitleBox}>
                  <div className={styles.consentIconBoxRed}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </div>
                  <div>
                    <h3 className={styles.tableTitle}>Droit à l'image (Réseaux Sociaux)</h3>
                    <span className={styles.consentSub}>Autorisation de publication avant/après</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.consentList}>
                <div className={styles.consentRow}>
                  <div className={styles.consentRowText}>
                    <h4>Publication sur Instagram / TikTok</h4>
                    <p>Autorise la diffusion de photos ou vidéos du résultat (Cils ou Ongles).</p>
                  </div>
                  <div className={styles.toggleWrapper}>
                    <span className={styles.toggleTextOn}>Autorisé</span>
                    <div className={styles.toggleActive}>
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.consentRow}>
                  <div className={styles.consentRowText}>
                    <h4>Anonymat garanti</h4>
                    <p>Ne souhaite pas que son visage entier soit visible (cadrage rapproché uniquement).</p>
                  </div>
                  <div className={styles.toggleWrapper}>
                    <span className={styles.toggleTextOff}>Refusé</span>
                    <div className={styles.toggleInactive}>
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.consentRow}>
                  <div className={styles.consentRowText}>
                    <h4>Identification (Tag)</h4>
                    <p>Accepte d'être identifiée (@mention) sur les publications.</p>
                  </div>
                  <div className={styles.toggleWrapper}>
                    <span className={styles.toggleTextOn}>Autorisé</span>
                    <div className={styles.toggleActive}>
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historique des consentements */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Historique des documents</h3>
              </div>
              
              <div className={styles.tableContainer}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th>DOCUMENT</th>
                      <th>TYPE</th>
                      <th>DATE</th>
                      <th>STATUT</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className={styles.tdDoc}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                          Mise à jour Fiche Santé
                        </div>
                      </td>
                      <td>Santé</td>
                      <td>25 Mars 2025</td>
                      <td><span className={`${styles.statusBadge} ${styles.statusGreen}`}>Signé</span></td>
                      <td style={{ textAlign: 'right' }}><span className={styles.voirTout}>Télécharger</span></td>
                    </tr>
                    <tr>
                      <td>
                        <div className={styles.tdDoc}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                          Décharge Pose Volume Russe
                        </div>
                      </td>
                      <td>Prestation</td>
                      <td>12 Fév 2025</td>
                      <td><span className={`${styles.statusBadge} ${styles.statusGreen}`}>Signé</span></td>
                      <td style={{ textAlign: 'right' }}><span className={styles.voirTout}>Télécharger</span></td>
                    </tr>
                    <tr>
                      <td>
                        <div className={styles.tdDoc}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                          Droit à l'image
                        </div>
                      </td>
                      <td>Marketing</td>
                      <td>14 Mar 2024</td>
                      <td><span className={`${styles.statusBadge} ${styles.statusOrange}`}>Expiré</span></td>
                      <td style={{ textAlign: 'right' }}><span className={styles.voirTout}>Renouveler</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </section>

    </main>
  );
}
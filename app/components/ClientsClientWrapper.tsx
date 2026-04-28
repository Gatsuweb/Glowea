"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../dashboard/clients/clients.module.css";
import SessionModal from "./SessionModal";
import { getConsent, saveConsent } from "../actions/consentActions";

export default function ClientsClientWrapper({ clients }: { clients: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "infos");
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<any>(null);
  
  // Set initial selected client from URL or first client
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    searchParams.get("clientId") || (clients.length > 0 ? clients[0].id : null)
  );

  useEffect(() => {
    const clientIdParam = searchParams.get("clientId");
    const tabParam = searchParams.get("tab");
    
    if (clientIdParam) {
      setSelectedClientId(clientIdParam);
    }
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");

  const [consentData, setConsentData] = useState<any>({
    lentilles: "Non",
    cyanoacrylate: "Aucune connue",
    acrylates: "Aucune",
    traitement: "Aucun",
    instagram: true,
    anonymat: false,
    dateSigned: null
  });
  const [isEditingConsent, setIsEditingConsent] = useState(false);
  const [isLoadingConsent, setIsLoadingConsent] = useState(false);

  useEffect(() => {
    if (activeTab === "consentement" && selectedClientId) {
      loadConsent();
    }
  }, [activeTab, selectedClientId]);

  const loadConsent = async () => {
    setIsLoadingConsent(true);
    try {
      const consent = await getConsent(selectedClientId!);
      if (consent && consent.snapshotJson) {
        setConsentData({ ...consentData, ...(consent.snapshotJson as any), dateSigned: consent.signedAt });
      } else {
        setConsentData({
          lentilles: "Non",
          cyanoacrylate: "Aucune connue",
          acrylates: "Aucune",
          traitement: "Aucun",
          instagram: true,
          anonymat: false,
          dateSigned: null
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingConsent(false);
    }
  };

  const handleSaveConsent = async () => {
    setIsLoadingConsent(true);
    try {
      const res = await saveConsent(selectedClientId!, consentData);
      if (res.success) {
        setIsEditingConsent(false);
        setConsentData({ ...consentData, dateSigned: res.consent?.signedAt });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingConsent(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Calculs pour le client sélectionné
  const clientAppointments = selectedClient?.Appointment || [];
  
  const historyRdv = clientAppointments.map((app: any) => {
      const date = new Date(app.scheduledAt);
      return {
        id: app.id,
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        client: `${selectedClient.firstName} ${selectedClient.lastName || ''}`.trim(),
        presta: app.Service?.name || "Inconnu",
        status: app.status === "COMPLETED" ? "Terminé" : app.status === "CANCELED" ? "Annulé" : "En attente",
        amount: app.Service?.price ? `${app.Service.price} €` : "-",
        serviceCat: app.Service?.ServiceCategory?.name || "Prestation",
        hasSession: !!app.Session,
        originalApp: app
      };
    });

  const historyPresta = clientAppointments.reduce((acc: any[], app: any) => {
    if (app.Service && app.status === "COMPLETED") {
      const existing = acc.find(p => p.id === app.Service.id);
      if (existing) {
        existing.count += 1;
        existing.ca += Number(app.Service.price || 0);
      } else {
        acc.push({
          id: app.Service.id,
          name: app.Service.name,
          cat: app.Service.ServiceCategory?.name || "Prestation",
          count: 1,
          ca: Number(app.Service.price || 0)
        });
      }
    }
    return acc;
  }, []).map((p: any) => ({ ...p, ca: `${p.ca} €` }));

  return (
    <main className={styles.layout}>
      
      {/* SIDEBAR - Répertoire */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>Répertoire</h1>
          <span className={styles.clientCount}>{clients.length} clients</span>
        </div>

        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Rechercher un client" 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <label className={styles.selectAll}>
          <input type="checkbox" />
          Tout sélectionner
        </label>

        <div className={styles.clientList}>
          {filteredClients.map(client => (
            <div 
              key={client.id} 
              className={`${styles.clientItem} ${client.id === selectedClientId ? styles.clientItemActive : ''}`}
              onClick={() => setSelectedClientId(client.id)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.clientAvatar}>
                {client.firstName.charAt(0).toUpperCase()}
              </div>
              <div className={styles.clientInfo}>
                <span className={styles.clientName}>{client.firstName} {client.lastName || ''}</span>
                <span className={styles.clientSub}>{client.Appointment?.length || 0} RENDEZ-VOUS</span>
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
              <h2 className={styles.headerTitle}>
                {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName || ''}` : 'Aucun client sélectionné'}
              </h2>
              <span className={styles.headerSubtitle}>
                {selectedClient?.createdAt ? `Cliente depuis le ${new Date(selectedClient.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''} - {selectedClient?.Appointment?.length || 0} visites
              </span>
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
              <span className={styles.contactValue}>{selectedClient?.email || 'Non renseigné'}</span>
            </div>
            <div className={styles.contactBlock}>
              <span className={styles.contactLabel}>Téléphone</span>
              <span className={styles.contactValue}>{selectedClient?.phone || 'Non renseigné'}</span>
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
                  <span className={styles.infoValue}>{selectedClient?.firstName} {selectedClient?.lastName || ''}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Instagram :</span>
                  <span className={styles.infoValue}>{selectedClient?.instagram ? `@${selectedClient.instagram}` : 'Non renseigné'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Date de naissance :</span>
                  <span className={styles.infoValue}>{selectedClient?.birthDate ? new Date(selectedClient.birthDate).toLocaleDateString('fr-FR') : 'Non renseigné'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Recommandée par :</span>
                  <span className={styles.infoValue}>{selectedClient?.referredBy || 'Non renseigné'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Email :</span>
                  <span className={styles.infoValue}>{selectedClient?.email || 'Non renseigné'}</span>
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
                {selectedClient?.ClientAllergy && selectedClient.ClientAllergy.length > 0 ? (
                  selectedClient.ClientAllergy.map((allergy: any, index: number) => (
                    <div className={styles.infoBlock} key={allergy.id}>
                      <span className={styles.infoLabel}>Allergie {index + 1}</span>
                      <span className={styles.infoValue}>{allergy.label} {allergy.notes ? `(${allergy.notes})` : ''}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.infoBlock}>
                    <span className={styles.infoValue}>Aucune allergie ou note enregistrée.</span>
                  </div>
                )}
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
                    {historyRdv.length > 0 ? (
                      historyRdv.map((rdv: any) => (
                        <tr key={rdv.id}>
                          <td>{rdv.date}</td>
                          <td>{rdv.time}</td>
                          <td>
                            <div className={styles.tdClient}>
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
                            {rdv.hasSession && (
                              <button 
                                className={styles.btnVoirFiche}
                                onClick={() => {
                                  setSelectedRdv(rdv);
                                  setSessionModalOpen(true);
                                }}
                                title="Voir la fiche"
                              >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Aucun rendez-vous trouvé</td>
                      </tr>
                    )}
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
                    </tr>
                  </thead>
                  <tbody>
                    {historyPresta.length > 0 ? (
                      historyPresta.map((presta: any) => (
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Aucune prestation terminée</td>
                      </tr>
                    )}
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
              {!isEditingConsent ? (
                <button className={styles.btnNewRdv} onClick={() => setIsEditingConsent(true)}>
                  Modifier
                </button>
              ) : (
                <button className={styles.btnNewRdv} onClick={handleSaveConsent} disabled={isLoadingConsent}>
                  {isLoadingConsent ? "Enregistrement..." : "Sauvegarder"}
                </button>
              )}
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
                {consentData.dateSigned ? (
                  <span className={`${styles.statusBadge} ${styles.statusGreen}`}>À jour ({new Date(consentData.dateSigned).toLocaleDateString()})</span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.statusRed}`}>Non rempli</span>
                )}
              </div>
              
              <div className={styles.consentGrid}>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Port de lentilles de contact</span>
                  {isEditingConsent ? (
                    <select 
                      className={styles.modalSelect} 
                      value={consentData.lentilles} 
                      onChange={(e) => setConsentData({...consentData, lentilles: e.target.value})}
                    >
                      <option value="Oui">Oui</option>
                      <option value="Non">Non</option>
                    </select>
                  ) : (
                    <span className={styles.consentValue}>{consentData.lentilles}</span>
                  )}
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Allergie Cyanoacrylate (Colle cils)</span>
                  {isEditingConsent ? (
                    <input 
                      type="text" 
                      className={styles.modalInput} 
                      value={consentData.cyanoacrylate} 
                      onChange={(e) => setConsentData({...consentData, cyanoacrylate: e.target.value})}
                    />
                  ) : (
                    <span className={styles.consentValue}>{consentData.cyanoacrylate}</span>
                  )}
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Sensibilité Acrylates (Gels UV)</span>
                  {isEditingConsent ? (
                    <input 
                      type="text" 
                      className={styles.modalInput} 
                      value={consentData.acrylates} 
                      onChange={(e) => setConsentData({...consentData, acrylates: e.target.value})}
                    />
                  ) : (
                    <span className={styles.consentValue}>{consentData.acrylates}</span>
                  )}
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Traitement médical en cours</span>
                  {isEditingConsent ? (
                    <input 
                      type="text" 
                      className={styles.modalInput} 
                      value={consentData.traitement} 
                      onChange={(e) => setConsentData({...consentData, traitement: e.target.value})}
                    />
                  ) : (
                    <span className={styles.consentValue}>{consentData.traitement}</span>
                  )}
                </div>
                <div className={styles.consentItemFull}>
                  <span className={styles.consentLabel}>Signature de la cliente</span>
                  <div className={styles.signatureBox}>
                    <span className={styles.signatureText}>
                      {consentData.dateSigned 
                        ? `Signé numériquement par ${selectedClient?.firstName} ${selectedClient?.lastName || ''} le ${new Date(consentData.dateSigned).toLocaleString()}`
                        : "Non signé"}
                    </span>
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
                  <div className={styles.toggleWrapper} onClick={() => isEditingConsent && setConsentData({...consentData, instagram: !consentData.instagram})} style={{ cursor: isEditingConsent ? 'pointer' : 'default' }}>
                    <span className={consentData.instagram ? styles.toggleTextOn : styles.toggleTextOff}>{consentData.instagram ? "Autorisé" : "Refusé"}</span>
                    <div className={consentData.instagram ? styles.toggleActive : styles.toggleInactive}>
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.consentRow}>
                  <div className={styles.consentRowText}>
                    <h4>Anonymat garanti</h4>
                    <p>Ne souhaite pas que son visage entier soit visible (cadrage rapproché uniquement).</p>
                  </div>
                  <div className={styles.toggleWrapper} onClick={() => isEditingConsent && setConsentData({...consentData, anonymat: !consentData.anonymat})} style={{ cursor: isEditingConsent ? 'pointer' : 'default' }}>
                    <span className={consentData.anonymat ? styles.toggleTextOn : styles.toggleTextOff}>{consentData.anonymat ? "Oui" : "Non"}</span>
                    <div className={consentData.anonymat ? styles.toggleActive : styles.toggleInactive}>
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

      <SessionModal 
        isOpen={isSessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        clientName={selectedRdv?.client}
        time={selectedRdv?.time}
        category={selectedRdv?.presta}
        appointmentId={selectedRdv?.id ? String(selectedRdv.id) : undefined}
        clientId={selectedClientId || undefined}
        isReadOnly={true}
      />
    </main>
  );
}
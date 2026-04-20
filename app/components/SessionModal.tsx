'use client';

import { useEffect, useState } from 'react';
import styles from './SessionModal.module.css';
import EyeMappingSvg from './EyeMappingSvg';

interface SessionModalProps {
  onClose: () => void;
  clientName?: string;
  time?: string;
  service?: string;
}

export default function SessionModal({ 
  onClose,
  clientName = "Johnny Doug",
  time = "14:00",
  service = "Cils"
}: SessionModalProps) {

  const [activeTab, setActiveTab] = useState("Cils");

  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Options simulées
  const prestations = ["Pose Complète", "Remplissage", "Dépose", "Rehaussement"];
  const courbures = ["J", "B", "C", "CC", "D", "L", "M"];
  const epaisseurs = ["0.05", "0.07", "0.10", "0.15", "0.20"];
  const longueurs = ["8", "9", "10", "11", "12", "13", "14", "15"];

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        
        {/* === Header === */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.recordingDot}></div>
            <h1 className={styles.title}>SESSION EN COURS</h1>
            
            <div className={styles.subtitleRow}>
              <span className={styles.clientInfo}>
                {clientName} • {time} • {service}
              </span>
              <div className={styles.badges}>
                <span className={styles.badgePink}>Cliente fidèle</span>
                <span className={styles.badgeWhite}>Aucune allergie</span>
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className={styles.closeButton} aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* === Tabs === */}
        <div className={styles.tabsRow}>
          {["Cils", "Browlift", "Rehaussement de cils", "Ongles"].map(tab => (
            <button 
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : styles.tabInactive}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* === Content Grid (Focus Cils) === */}
        {activeTab === "Cils" && (
          <div className={styles.contentGrid}>
            
            {/* Row 1: Technique, Paramètre, Produits */}
            <div className={styles.gridRow}>
              {/* Technique */}
              <div className={`${styles.card} ${styles.col1}`}>
                <h3 className={styles.cardTitle}>TECHNIQUE</h3>
                <p className={styles.cardSubtitle}>Pose effectuée</p>
                
                <div className={styles.techniqueGrid4}>
                  <button className={`${styles.techniqueBox} ${styles.techniqueBoxActive}`}>
                    <span>Cil à cil</span>
                    <svg viewBox="0 0 24 24" width="32" height="32"><path d="M4 16 Q12 20 20 16" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M6 16 L5 12 M10 17 L9 13 M14 17 L15 13 M18 16 L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <button className={styles.techniqueBox}>
                    <span>Mixte</span>
                    <svg viewBox="0 0 24 24" width="32" height="32"><path d="M4 16 Q12 20 20 16" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M6 16 L5 12 M9 17 L8 12 M10 17 L10 12 M11 17 L12 12 M15 17 L16 13 M18 16 L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <button className={styles.techniqueBox}>
                    <span>Volume russe</span>
                    <svg viewBox="0 0 24 24" width="32" height="32"><path d="M4 18 L20 18" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M7 18 L5 12 M7 18 L7 12 M7 18 L9 12 M17 18 L15 12 M17 18 L17 12 M17 18 L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <button className={styles.techniqueBox}>
                    <span>Mega volume</span>
                    <svg viewBox="0 0 24 24" width="32" height="32"><path d="M2 18 L22 18" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M6 18 L4 12 M6 18 L5 12 M6 18 L6 12 M6 18 L7 12 M6 18 L8 12 M12 18 L10 12 M12 18 L11 12 M12 18 L12 12 M12 18 L13 12 M12 18 L14 12 M18 18 L16 12 M18 18 L17 12 M18 18 L18 12 M18 18 L19 12 M18 18 L20 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>

                <div className={styles.techniqueGrid2}>
                  <button className={`${styles.techniqueWideBox} ${styles.techniqueBoxActive}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L12 10 M10 2 L12 10 M14 2 L12 10" /><path d="M12 10 L12 22" /><rect x="9" y="16" width="6" height="6" rx="1"/></svg>
                    Fait main
                  </button>
                  <button className={styles.techniqueWideBox}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12 L12 2 M12 12 L2 12 M12 12 L22 12 M12 12 L12 22"/><circle cx="12" cy="12" r="3"/></svg>
                    Préfaits
                  </button>
                </div>
              </div>

              {/* Paramètre de la pose */}
              <div className={`${styles.card} ${styles.col2}`}>
                <h3 className={styles.cardTitle}>PARAMÈTRE DE LA POSE</h3>
                
                <p className={styles.cardSubtitle}>Courbure</p>
                <div className={styles.optionsGrid}>
                  {courbures.map(c => <button key={c} className={styles.optionPill}>{c}</button>)}
                </div>

                <p className={styles.cardSubtitle}>Epaisseur</p>
                <div className={styles.optionsGrid}>
                  {epaisseurs.map(e => <button key={e} className={styles.optionPill}>{e}</button>)}
                </div>

                <p className={styles.cardSubtitle}>Longueur</p>
                <div className={styles.optionsGrid}>
                  {longueurs.map(l => <button key={l} className={styles.optionPill}>{l}</button>)}
                </div>
              </div>

              {/* Produits Utilisés */}
              <div className={`${styles.card} ${styles.col1}`}>
                <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
                <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <label className={styles.checkRow}><input type="checkbox" /> Colle Extra Forte</label>
                  <label className={styles.checkRow}><input type="checkbox" /> Primer Cils</label>
                  <label className={styles.checkRow}><input type="checkbox" /> Remover Gel</label>
                </div>
              </div>
            </div>

            {/* Separator Gray bar from wireframe */}
            <div className={styles.separator}></div>

            {/* Row 2: Oeil G, Oeil D, Marque/Nom */}
            <div className={styles.gridRow}>
              {/* Oeil Gauche */}
              <div className={`${styles.eyeSection} ${styles.col1}`}>
                <h3 className={styles.cardTitle}>OEIL G.</h3>
                <div className={styles.eyeHeader}>
                  <div>
                    <p className={styles.cardSubtitle}>Courbure</p>
                    <select className={styles.selectField}>
                      <option>D</option>
                      <option>C</option>
                    </select>
                  </div>
                  <div>
                    <p className={styles.cardSubtitle}>Epaisseur</p>
                    <select className={styles.selectField}>
                      <option>0.07</option>
                      <option>0.10</option>
                    </select>
                  </div>
                </div>
                <p className={styles.cardSubtitle}>Longueurs (mm)</p>
                <div className={styles.optionsGrid}>
                  {longueurs.map(l => (
                    <button key={l} className={`${styles.optionPill} ${l === '10' || l === '12' || l === '14' ? styles.optionPillActive : ''}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {/* Illustration SVG au lieu de l'ellipse grise */}
                <EyeMappingSvg eyeLabel="G" />
              </div>

              {/* Oeil Droit */}
              <div className={`${styles.eyeSection} ${styles.col1}`}>
                <h3 className={styles.cardTitle}>OEIL D.</h3>
                <div className={styles.eyeHeader}>
                  <div>
                    <p className={styles.cardSubtitle}>Courbure</p>
                    <select className={styles.selectField}>
                      <option>D</option>
                      <option>C</option>
                    </select>
                  </div>
                  <div>
                    <p className={styles.cardSubtitle}>Epaisseur</p>
                    <select className={styles.selectField}>
                      <option>0.07</option>
                      <option>0.10</option>
                    </select>
                  </div>
                </div>
                <p className={styles.cardSubtitle}>Longueurs (mm)</p>
                <div className={styles.optionsGrid}>
                  {longueurs.map(l => (
                    <button key={l} className={`${styles.optionPill} ${l === '10' || l === '12' || l === '14' ? styles.optionPillActive : ''}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {/* Illustration SVG au lieu de l'ellipse grise */}
                <EyeMappingSvg eyeLabel="D" />
              </div>

              {/* Marque / Nom de la pose */}
              <div className={`${styles.card} ${styles.col1}`} style={{ justifyContent: 'flex-start' }}>
                <h3 className={styles.cardTitle}>MARQUE DES CILS UTILISÉS</h3>
                <p className={styles.cardSubtitle}>Marque / Gamme :</p>
                <input type="text" className={styles.inputField} placeholder="Ex: London Lash" />
                <p className={styles.cardSubtitle} style={{ marginTop: '8px' }}>Référence (optionnelle):</p>
                <input type="text" className={styles.inputField} />
                
                <h3 className={styles.cardTitle} style={{ marginTop: '24px' }}>NOM DE LA POSE</h3>
                <input type="text" className={styles.inputField} placeholder="Ex: Fox Eye Léger" />
              </div>
            </div>

            {/* Row 3: Infos Cliente, Remarques, Photos */}
            <div className={styles.gridRow}>
              {/* Infos Cliente */}
              <div className={`${styles.card} ${styles.col1}`}>
                <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                <div className={styles.clientInfoList}>
                  <div className={styles.infoRow}>
                    <p className={styles.infoValue}>{clientName}</p>
                  </div>
                  <div className={styles.infoRow}>
                    <p className={styles.infoValue}>johnny.doug@example.com</p>
                  </div>
                  <div className={styles.infoRow}>
                    <p className={styles.infoValue}>+33 6 12 34 56 78</p>
                  </div>
                </div>
              </div>

              {/* Remarques */}
              <div className={`${styles.card} ${styles.col2}`}>
                <h3 className={styles.cardTitle}>REMARQUES</h3>
                <textarea className={styles.textareaField} placeholder="Ajouter des notes sur la séance..." />
              </div>

              {/* Photos */}
              <div className={`${styles.card} ${styles.col1}`}>
                <h3 className={styles.cardTitle}>PHOTOS</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, height: '60px', background: '#FFF', borderRadius: '4px', border: '1px dashed #CCC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', cursor: 'pointer' }}>+ Avant</div>
                  <div style={{ flex: 1, height: '60px', background: '#FFF', borderRadius: '4px', border: '1px dashed #CCC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', cursor: 'pointer' }}>+ Après</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* === Footer === */}
        <div className={styles.footerActions}>
          <button className={styles.btnCancel} onClick={onClose}>Annuler le rendez-vous</button>
          <div className={styles.footerRight}>
            <button className={styles.btnDraft} onClick={onClose}>Enregistrer le brouillon</button>
            <button className={styles.btnSave} onClick={onClose}>Terminer la session</button>
          </div>
        </div>

      </div>
    </div>
  );
}
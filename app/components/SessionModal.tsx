import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './SessionModal.module.css';

const TimerCard = ({ title, initialMinutes }: { title: string, initialMinutes: number }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [inputVal, setInputVal] = useState(`${initialMinutes}:00`);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (!isRunning) {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      setInputVal(`${m}:${s.toString().padStart(2, '0')}`);
    }
  }, [timeLeft, isRunning]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    const parts = e.target.value.split(':');
    const m = parseInt(parts[0]) || 0;
    const s = parseInt(parts[1]) || 0;
    setTimeLeft(m * 60 + s);
  };

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.timerCard}>
      <div className={styles.timerTitle}>{title}</div>
      <div className={styles.timerControl}>
        <div className={styles.timerInputWrapper}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <input 
            type="text" 
            value={isRunning ? formatTime() : inputVal}
            onChange={handleInputChange}
            className={styles.timerInput}
            disabled={isRunning}
          />
          <span className={styles.timerUnit}>Min</span>
        </div>
        <button className={styles.timerPlayBtn} onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
};

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  time?: string;
  category?: string;
}

export default function SessionModal({ 
  isOpen, 
  onClose, 
  clientName = "Johnny Doug", 
  time = "14:00", 
  category = "Cils" 
}: SessionModalProps) {
  
  const [activeTab, setActiveTab] = useState("Cils");
  const [technique, setTechnique] = useState("Cil à cil");
  const [typeCils, setTypeCils] = useState("Fait main");

  // Arrays for parameters
  const courbures = ["C", "CC", "D", "DD", "L", "M", "J", "B", "Autre"];
  const epaisseurs = ["0.03", "0.05", "0.07", "0.10", "0.12", "0.15", "0.18", "0.20", "0.25"];
  const longueurs = ["6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];

  const [courbure, setCourbure] = useState("D");
  const [epaisseur, setEpaisseur] = useState("0.10");
  const [longueurActives, setLongueurActives] = useState<string[]>(["11", "12", "13"]);

  const [products, setProducts] = useState([
    { id: 1, name: "Colle Ultra Bond", stock: "Stock 1/1\nmultidose", checked: true },
    { id: 2, name: "Primer", stock: "Stock 1/1\nmultidose", checked: false },
    { id: 3, name: "Bonder", stock: "Stock 1/1\nmultidose", checked: false },
    { id: 4, name: "Cils (Boite) D Curl 0.07", stock: "Stock 4/18\nDose unique", checked: false },
  ]);

  const [browliftProducts, setBrowliftProducts] = useState([
    { id: 101, name: "Lotion 1", stock: "Stock 1/1\nmultidose", checked: true, defaultTime: 5 },
    { id: 102, name: "Lotion 2", stock: "Stock 1/1\nmultidose", checked: true, defaultTime: 5 },
    { id: 103, name: "Lotion 3", stock: "Stock 1/1\nmultidose", checked: true, defaultTime: 7 },
    { id: 104, name: "Lotion 4", stock: "Stock 4/18\nDose unique", checked: true, defaultTime: 10 },
  ]);

  const [rehaussementProducts, setRehaussementProducts] = useState([
    { id: 201, name: "Colle Ultra Bond", stock: "Stock 1/1\nmultidose", checked: true, defaultTime: 5 },
    { id: 202, name: "Primer", stock: "Stock 1/1\nmultidose", checked: true, defaultTime: 5 },
    { id: 203, name: "Bonder", stock: "Stock 1/1\nmultidose", checked: true, defaultTime: 7 },
    { id: 204, name: "Cils (Boite) D Curl 0.07", stock: "Stock 4/18\nDose unique", checked: true, defaultTime: 10 },
  ]);

  const [hasRehaussementTeinture, setHasRehaussementTeinture] = useState(false);

  // States for Ongles
  const [typePoseOngles, setTypePoseOngles] = useState("Pose complète");
  const [taillePoseOngles, setTaillePoseOngles] = useState("M");
  const [formeOngles, setFormeOngles] = useState("Coffin");
  const [mainOngles, setMainOngles] = useState("gauche"); // "gauche" or "droite"

  const [longueurActivesOeilG, setLongueurActivesOeilG] = useState<string[]>(["9", "10", "11", "12", "13", "14"]);
  const [longueurActivesOeilD, setLongueurActivesOeilD] = useState<string[]>(["9", "10", "11", "12", "13", "14"]);

  const [hasTeinture, setHasTeinture] = useState(false);

  if (!isOpen) return null;

  const toggleProduct = (id: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const toggleBrowliftProduct = (id: number) => {
    setBrowliftProducts(browliftProducts.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const toggleRehaussementProduct = (id: number) => {
    setRehaussementProducts(rehaussementProducts.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const toggleLongueur = (l: string) => {
    let newLongueurs;
    if (longueurActives.includes(l)) {
      newLongueurs = longueurActives.filter(item => item !== l);
    } else {
      newLongueurs = [...longueurActives, l];
    }
    setLongueurActives(newLongueurs);
    
    // Automatically sync with left and right eyes
    setLongueurActivesOeilG(newLongueurs);
    setLongueurActivesOeilD(newLongueurs);
  };

  const toggleLongueurOeil = (l: string, oeil: 'G' | 'D') => {
    if (oeil === 'G') {
      if (longueurActivesOeilG.includes(l)) {
        setLongueurActivesOeilG(longueurActivesOeilG.filter(item => item !== l));
      } else {
        setLongueurActivesOeilG([...longueurActivesOeilG, l]);
      }
    } else {
      if (longueurActivesOeilD.includes(l)) {
        setLongueurActivesOeilD(longueurActivesOeilD.filter(item => item !== l));
      } else {
        setLongueurActivesOeilD([...longueurActivesOeilD, l]);
      }
    }
  };

  // SVG Mapping to display selected lengths in an arc
  const EyelashMapping = ({ selectedLengths }: { selectedLengths: string[] }) => {
    // Sort lengths to make the mapping logical (shortest on edges, longest in middle)
    // This is a simplified visual representation
    const sortedLengths = [...selectedLengths].sort((a, b) => parseInt(a) - parseInt(b));
    
    // We create a symmetrical mapping if possible, e.g., 9 10 11 12 11 10 9
    // For simplicity here, we just distribute the selected lengths evenly across an arc
    const numPoints = Math.max(5, sortedLengths.length * 2 - 1);
    
    let displayValues = [];
    if (sortedLengths.length === 0) {
      displayValues = [];
    } else if (sortedLengths.length === 1) {
      displayValues = Array(5).fill(sortedLengths[0]);
    } else {
      // Create a curve: min to max to min
      for(let i=0; i<sortedLengths.length; i++) displayValues.push(sortedLengths[i]);
      for(let i=sortedLengths.length-2; i>=0; i--) displayValues.push(sortedLengths[i]);
    }

    return (
      <div className={styles.mappingContainer}>
        <div className={styles.mappingImageWrapper}>
          <Image 
            src="/modele-cils.svg" 
            alt="Modèle de cils" 
            width={220} 
            height={80} 
            style={{ objectFit: 'contain' }}
          />
          
          {/* SVG Overlay for numbers */}
          <svg className={styles.mappingOverlay} viewBox="0 0 220 80">
            {displayValues.map((val, index) => {
              const total = displayValues.length;
              // Distribute points along an arc
              // x goes from 20 to 200
              const progress = total > 1 ? index / (total - 1) : 0.5;
              const x = 20 + progress * 180;
              // y follows a quadratic curve (lower in middle)
              const yOffset = Math.pow(progress * 2 - 1, 2); // 1 at edges, 0 in middle
              const y = 15 + (yOffset * 25);
              
              return (
                <text 
                  key={index} 
                  x={x} 
                  y={y} 
                  fontSize="12" 
                  fontWeight="600"
                  fill="#333"
                  textAnchor="middle"
                >
                  {val}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.titleRow}>
              <div className={styles.recordingDot}></div>
              <h2 className={styles.title}>SESSION EN COURS</h2>
            </div>
            <div className={styles.subtitleRow}>
              <span>{clientName} • {time} • {category}</span>
              <span className={styles.badgePink}>Cliente fidèle</span>
              <span className={styles.badgeWhite}>Aucune allergie</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
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

        {/* Scrollable Content */}
        <div className={styles.content}>
          {activeTab === 'Cils' && (
            <>
              {/* ROW 1 */}
              <div className={styles.row1}>
            {/* Technique */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>TECHNIQUE</h3>
              <p className={styles.cardSubtitle}>Préstation :</p>
              
              <div className={styles.techniqueGrid}>
                {["Cil à cil", "Mixte", "Volume russe", "Méga volume"].map((tech) => (
                  <div 
                    key={tech} 
                    className={`${styles.techOption} ${technique === tech ? styles.active : ''}`}
                    onClick={() => setTechnique(tech)}
                  >
                    <div style={{ height: '30px', display: 'flex', alignItems: 'center' }}>
                       {/* Abstract eyelash icons */}
                       <svg width="30" height="20" viewBox="0 0 40 20">
                         {tech === "Cil à cil" && <path d="M 5 15 Q 20 5 35 15" fill="none" stroke="currentColor" strokeWidth="1.5"/>}
                         {tech === "Mixte" && <><path d="M 5 15 Q 20 5 35 15" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M 10 15 Q 20 0 30 15" fill="none" stroke="currentColor" strokeWidth="1.5"/></>}
                         {(tech === "Volume russe" || tech === "Méga volume") && <><path d="M 0 15 Q 20 5 40 15" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M 5 15 Q 20 0 35 15" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M 10 15 Q 20 -5 30 15" fill="none" stroke="currentColor" strokeWidth="1.5"/></>}
                       </svg>
                    </div>
                    <span className={styles.techLabel}>{tech}</span>
                  </div>
                ))}
              </div>

              <div className={styles.segmentedControl}>
                <button 
                  className={`${styles.segmentBtn} ${typeCils === "Fait main" ? styles.active : styles.inactive}`}
                  onClick={() => setTypeCils("Fait main")}
                >
                  Fait main
                </button>
                <button 
                  className={`${styles.segmentBtn} ${typeCils === "Préfaits" ? styles.active : styles.inactive}`}
                  onClick={() => setTypeCils("Préfaits")}
                >
                  Préfaits
                </button>
              </div>
            </div>

            {/* Parametres de la pose */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>PARAMETRE DE LA POSE</h3>
              
              <div className={styles.paramGroup}>
                <div className={styles.paramLabel}>Courbure</div>
                <div className={styles.paramButtons}>
                  {courbures.map(c => (
                    <button 
                      key={c} 
                      className={`${styles.paramBtn} ${courbure === c ? styles.active : ''}`}
                      onClick={() => setCourbure(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.paramGroup}>
                <div className={styles.paramLabel}>Epaisseur</div>
                <div className={styles.paramButtons}>
                  {epaisseurs.map(e => (
                    <button 
                      key={e} 
                      className={`${styles.paramBtn} ${epaisseur === e ? styles.active : ''}`}
                      onClick={() => setEpaisseur(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.paramGroup}>
                <div className={styles.paramLabel}>Longueur</div>
                <div className={styles.paramButtons}>
                  {longueurs.map(l => (
                    <button 
                      key={l} 
                      className={`${styles.paramBtn} ${longueurActives.includes(l) ? styles.active : ''}`}
                      onClick={() => toggleLongueur(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Produits Utilisés */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
              <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>
              
              <div className={styles.productList}>
                {products.map(p => (
                  <div key={p.id} className={styles.productItem}>
                    <div 
                      className={`${styles.checkbox} ${p.checked ? styles.checked : ''}`}
                      onClick={() => toggleProduct(p.id)}
                    ></div>
                    {/* Placeholder for product bottle icon */}
                    <div style={{ width: '12px', height: '20px', background: '#333', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '-4px', left: '3px', width: '6px', height: '4px', background: '#FF69B4' }}></div>
                    </div>
                    <span className={styles.productName}>{p.name}</span>
                    <span className={styles.productStock} style={{ whiteSpace: 'pre-line' }}>{p.stock}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 2 */}
          <div className={styles.row2}>
            {/* Details par oeil */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Détails par oeil</h3>
              <p className={styles.cardSubtitle}>Les paramètres peuvent différer d'un œil à l'autre. Ajustez si nécessaire.</p>
              
              <div className={styles.oeilGrid}>
                {/* Oeil Gauche */}
                <div className={styles.oeilCol}>
                  <div className={styles.oeilTitle}>OEIL G.</div>
                  <div className={styles.oeilSelects}>
                    <div className={styles.selectGroup}>
                      <label>Courbure</label>
                      <select className={styles.selectInput} defaultValue="D">
                        {courbures.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className={styles.selectGroup}>
                      <label>Epaisseur</label>
                      <select className={styles.selectInput} defaultValue="0.10">
                        {epaisseurs.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.paramGroup}>
                    <div className={styles.paramLabel}>Longueur</div>
                    <div className={styles.paramButtons}>
                      {longueurs.slice(0, 14).map(l => (
                        <button 
                          key={l} 
                          className={`${styles.paramBtn} ${longueurActivesOeilG.includes(l) ? styles.active : ''}`} 
                          onClick={() => toggleLongueurOeil(l, 'G')}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <EyelashMapping selectedLengths={longueurActivesOeilG} />
                </div>

                {/* Oeil Droit */}
                <div className={styles.oeilCol}>
                  <div className={styles.oeilTitle}>OEIL D.</div>
                  <div className={styles.oeilSelects}>
                    <div className={styles.selectGroup}>
                      <label>Courbure</label>
                      <select className={styles.selectInput} defaultValue="D">
                        {courbures.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className={styles.selectGroup}>
                      <label>Epaisseur</label>
                      <select className={styles.selectInput} defaultValue="0.10">
                        {epaisseurs.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.paramGroup}>
                    <div className={styles.paramLabel}>Longueur</div>
                    <div className={styles.paramButtons}>
                      {longueurs.slice(0, 14).map(l => (
                        <button 
                          key={l} 
                          className={`${styles.paramBtn} ${longueurActivesOeilD.includes(l) ? styles.active : ''}`} 
                          onClick={() => toggleLongueurOeil(l, 'D')}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <EyelashMapping selectedLengths={longueurActivesOeilD} />
                </div>
              </div>
            </div>

            {/* Marque */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>MARQUE DES CILS UTILISÉS</h3>
              <div className={styles.inputGroup}>
                <label>Marque / Gamme :</label>
                <input type="text" className={styles.textInput} />
              </div>
              <div className={styles.inputGroup}>
                <label>Référence (optionnelle):</label>
                <input type="text" className={styles.textInput} />
              </div>
              
              <h3 className={styles.cardTitle} style={{ marginTop: '20px' }}>NOM DE LA POSE</h3>
              <div className={styles.inputGroup}>
                <input type="text" className={styles.textInput} />
              </div>
            </div>
          </div>

          {/* ROW 3 */}
          <div className={styles.row3}>
            {/* Infos */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
              <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333' }}>Sophie DOE</div>
              <div className={styles.infoBlock}>
                <div className={styles.infoCol}>
                  <span className={styles.infoText}>06 01 02 03 04</span>
                  <span className={styles.infoText}>ivan.duran@outlook.fr</span>
                </div>
                <div className={styles.infoCol}>
                  <span className={styles.infoText}>5 rendez-vous effectué</span>
                  <span className={styles.infoText}>Aucune allergie</span>
                </div>
              </div>
            </div>

            {/* Remarques */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>REMARQUES</h3>
              <textarea className={styles.textarea}></textarea>
            </div>

            {/* Photos */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>PHOTOS</h3>
              <div className={styles.photoGrid}>
                <div>
                  <span className={styles.photoLabel}>Avant</span>
                  <div className={styles.photoBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                </div>
                <div>
                  <span className={styles.photoLabel}>Après</span>
                  <div className={styles.photoBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                </div>
                <div>
                  <span className={styles.photoLabel}>Autres</span>
                  <div className={styles.photoBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {activeTab === 'Browlift' && (
            <div className={styles.browliftLayout}>
              <div className={styles.browliftRow1}>
                {/* Produits Utilisés */}
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
                  <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>
                  <div className={styles.productList}>
                    {browliftProducts.map(p => (
                      <div key={p.id} className={styles.productItem}>
                        <div 
                          className={`${styles.checkbox} ${p.checked ? styles.checked : ''}`}
                          onClick={() => toggleBrowliftProduct(p.id)}
                        ></div>
                        <div style={{ width: '12px', height: '20px', background: '#333', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '-4px', left: '3px', width: '6px', height: '4px', background: '#FF69B4' }}></div>
                        </div>
                        <span className={styles.productName}>{p.name}</span>
                        <span className={styles.productStock} style={{ whiteSpace: 'pre-line' }}>{p.stock}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teinture */}
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>TEINTURE</h3>
                  <div className={styles.teintureCheck} onClick={() => setHasTeinture(!hasTeinture)}>
                    <div className={`${styles.checkbox} ${hasTeinture ? styles.checked : ''}`}></div>
                    <span style={{fontWeight: 600, fontSize: '0.95rem', color: '#333'}}>Ajoutez une teinture</span>
                  </div>
                  <div className={styles.teintureConfig} style={{ opacity: hasTeinture ? 1 : 0.4, pointerEvents: hasTeinture ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <label className={styles.paramLabel} style={{display: 'block', marginTop: '20px', marginBottom: '8px'}}>Couleur utilisée</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <input type="text" className={styles.textInput} defaultValue="Brun foncé" placeholder="Ex: Brun foncé, Noir..." style={{flex: 1}}/>
                      <div style={{backgroundColor: '#3B2F2F', width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #E5E5E5'}}></div>
                    </div>
                    <p style={{fontSize: '0.75rem', color: '#888', marginTop: '8px'}}>Ex : Brun foncé, Noir, Graphite...</p>
                  </div>
                </div>
              </div>

              {/* Temps de pause */}
              <div className={styles.card} style={{marginTop: '15px'}}>
                <h3 className={styles.cardTitle}>TEMPS DE PAUSE</h3>
                <p className={styles.cardSubtitle}>Indiquer le temps de pose pour chaque étapes.</p>
                <div className={styles.timerGrid}>
                  {browliftProducts.filter(p => p.checked).map(p => (
                    <TimerCard key={p.id} title={p.name} initialMinutes={p.defaultTime} />
                  ))}
                  {browliftProducts.filter(p => p.checked).length === 0 && (
                    <p style={{color: '#888', fontSize: '0.9rem'}}>Sélectionnez une lotion pour configurer son temps de pause.</p>
                  )}
                </div>
              </div>

              {/* Row 3: Remarques, Photos */}
              <div className={styles.browliftRow3} style={{marginTop: '15px'}}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>REMARQUES</h3>
                  <textarea className={styles.textarea} style={{minHeight: '80px'}}></textarea>
                </div>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PHOTOS</h3>
                  <div className={styles.photoGrid}>
                    <div>
                      <span className={styles.photoLabel}>Avant</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Après</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Autres</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infos Cliente */}
              <div className={styles.card} style={{marginTop: '15px'}}>
                <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333' }}>Sophie DOE</div>
                <div className={styles.infoBlock}>
                  <div className={styles.infoCol}>
                    <span className={styles.infoText}>06 01 02 03 04</span>
                    <span className={styles.infoText}>ivan.duran@outlook.fr</span>
                  </div>
                  <div className={styles.infoCol}>
                    <span className={styles.infoText}>5 rendez-vous effectué</span>
                    <span className={styles.infoText}>Aucune allergie</span>
                  </div>
                </div>
              </div>
              
              {/* Info Banner */}
              <div className={styles.infoBanner}>
                Texte d'info ou de conseil
              </div>
            </div>
          )}

          {activeTab === 'Rehaussement de cils' && (
            <div className={styles.browliftLayout}>
              <div className={styles.browliftRow1}>
                {/* Produits Utilisés */}
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
                  <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>
                  <div className={styles.productList}>
                    {rehaussementProducts.map(p => (
                      <div key={p.id} className={styles.productItem}>
                        <div 
                          className={`${styles.checkbox} ${p.checked ? styles.checked : ''}`}
                          onClick={() => toggleRehaussementProduct(p.id)}
                        ></div>
                        <div style={{ width: '12px', height: '20px', background: '#333', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '-4px', left: '3px', width: '6px', height: '4px', background: '#FF69B4' }}></div>
                        </div>
                        <span className={styles.productName}>{p.name}</span>
                        <span className={styles.productStock} style={{ whiteSpace: 'pre-line' }}>{p.stock}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teinture */}
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>TEINTURE</h3>
                  <div className={styles.teintureCheck} onClick={() => setHasRehaussementTeinture(!hasRehaussementTeinture)}>
                    <div className={`${styles.checkbox} ${hasRehaussementTeinture ? styles.checked : ''}`}></div>
                    <span style={{fontWeight: 600, fontSize: '0.95rem', color: '#333'}}>Ajoutez une teinture</span>
                  </div>
                  <div className={styles.teintureConfig} style={{ opacity: hasRehaussementTeinture ? 1 : 0.4, pointerEvents: hasRehaussementTeinture ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <label className={styles.paramLabel} style={{display: 'block', marginTop: '20px', marginBottom: '8px'}}>Couleur utilisée</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <input type="text" className={styles.textInput} defaultValue="Brun foncé" placeholder="Ex: Brun foncé, Noir..." style={{flex: 1}}/>
                      <div style={{backgroundColor: '#3B2F2F', width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #E5E5E5'}}></div>
                    </div>
                    <p style={{fontSize: '0.75rem', color: '#888', marginTop: '8px'}}>Ex : Brun foncé, Noir, Graphite...</p>
                  </div>
                </div>
              </div>

              {/* Temps de pause */}
              <div className={styles.card} style={{marginTop: '15px'}}>
                <h3 className={styles.cardTitle}>TEMPS DE PAUSE</h3>
                <p className={styles.cardSubtitle}>Indiquer le temps de pose pour chaque étapes.</p>
                <div className={styles.timerGrid}>
                  {rehaussementProducts.filter(p => p.checked).map((p, index) => (
                    <TimerCard key={p.id} title={`Lotion ${index + 1}`} initialMinutes={p.defaultTime} />
                  ))}
                  {rehaussementProducts.filter(p => p.checked).length === 0 && (
                    <p style={{color: '#888', fontSize: '0.9rem'}}>Sélectionnez un produit pour configurer son temps de pause.</p>
                  )}
                </div>
              </div>

              {/* Oeil Gauche / Droit */}
              <div className={styles.browliftRow3} style={{marginTop: '15px'}}>
                <div className={styles.card}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px'}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <h3 className={styles.cardTitle} style={{margin: 0}}>OEIL GAUCHE</h3>
                  </div>
                  <div style={{display: 'flex', gap: '15px'}}>
                    <div style={{flex: 1}}>
                      <label className={styles.paramLabel}>Taille</label>
                      <select className={styles.selectInput} defaultValue="M">
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                    <div style={{flex: 1}}>
                      <label className={styles.paramLabel}>Autre taille</label>
                      <input type="text" className={styles.textInput} />
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px'}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <h3 className={styles.cardTitle} style={{margin: 0}}>OEIL DROIT</h3>
                  </div>
                  <div style={{display: 'flex', gap: '15px'}}>
                    <div style={{flex: 1}}>
                      <label className={styles.paramLabel}>Taille</label>
                      <select className={styles.selectInput} defaultValue="L">
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                    <div style={{flex: 1}}>
                      <label className={styles.paramLabel}>Autre taille</label>
                      <input type="text" className={styles.textInput} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row Remarques, Photos */}
              <div className={styles.browliftRow3} style={{marginTop: '15px'}}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>REMARQUES</h3>
                  <textarea className={styles.textarea} style={{minHeight: '80px'}}></textarea>
                </div>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PHOTOS</h3>
                  <div className={styles.photoGrid}>
                    <div>
                      <span className={styles.photoLabel}>Avant</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Après</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Autres</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infos Cliente */}
              <div className={styles.card} style={{marginTop: '15px'}}>
                <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333' }}>Sophie DOE</div>
                <div className={styles.infoBlock}>
                  <div className={styles.infoCol}>
                    <span className={styles.infoText}>06 01 02 03 04</span>
                    <span className={styles.infoText}>ivan.duran@outlook.fr</span>
                  </div>
                  <div className={styles.infoCol}>
                    <span className={styles.infoText}>5 rendez-vous effectué</span>
                    <span className={styles.infoText}>Aucune allergie</span>
                  </div>
                </div>
              </div>
              
              {/* Info Banner */}
              <div className={styles.infoBanner}>
                Les tailles affichées peuvent varier selon les marques, sélectionner "Autres" si vous ne trouvez pas la taille adaptée
              </div>
            </div>
          )}

          {activeTab === 'Ongles' && (
            <div className={styles.onglesLayout}>
              {/* Left Column: Technique */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>TECHNIQUE</h3>
                <div className={styles.inputGroup}>
                  <label className={styles.paramLabel}>Préstation :</label>
                  <select className={styles.selectInput} defaultValue="">
                    <option value=""></option>
                    <option value="Gel">Pose Gel</option>
                    <option value="Acrygel">Acrygel</option>
                    <option value="Semi">Semi-permanent</option>
                  </select>
                </div>

                <div className={styles.paramGroup} style={{marginTop: '20px'}}>
                  <label className={styles.paramLabel}>Type de pose</label>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px'}}>
                    {["Pose complète", "Remplissage", "Ongle cassé"].map(type => (
                      <div 
                        key={type}
                        className={`${styles.typeOngleBtn} ${typePoseOngles === type ? styles.active : ''}`}
                        onClick={() => setTypePoseOngles(type)}
                      >
                        <span style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '5px'}}>{type}</span>
                        {/* Placeholder icon for nail type */}
                        <div style={{width: '24px', height: '35px', background: typePoseOngles === type ? '#8B4B54' : '#E5E5E5', borderRadius: '10px 10px 4px 4px', opacity: 0.8}}></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.paramGroup} style={{marginTop: '20px'}}>
                  <label className={styles.paramLabel}>TAILLE DE POSE</label>
                  <div className={styles.paramButtons}>
                    {["XS", "S", "M", "L", "XL"].map(t => (
                      <button 
                        key={t}
                        className={`${styles.paramBtn} ${taillePoseOngles === t ? styles.active : ''}`}
                        onClick={() => setTaillePoseOngles(t)}
                        style={{flex: 1, padding: '8px 0'}}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.paramGroup} style={{marginTop: '20px'}}>
                  <label className={styles.paramLabel}>FORME</label>
                  <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginTop: '10px'}}>
                    {["Coffin", "Carré", "Amande", "Stiletto", "Rond", "Ovale", "Autre"].map(f => (
                      <div 
                        key={f}
                        className={styles.formeOngleItem}
                        onClick={() => setFormeOngles(f)}
                      >
                        <div className={`${styles.formeOngleIcon} ${formeOngles === f ? styles.active : ''}`}>
                          {/* Placeholder icon for nail shape */}
                          <div style={{width: '18px', height: '30px', background: formeOngles === f ? '#8B4B54' : '#ccc', borderRadius: f === 'Stiletto' ? '50% 50% 0 0' : '8px 8px 0 0'}}></div>
                        </div>
                        <span style={{fontSize: '0.7rem', color: formeOngles === f ? '#8B4B54' : '#888', fontWeight: formeOngles === f ? 600 : 400}}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.paramGroup} style={{marginTop: '15px'}}>
                  <label className={styles.paramLabel}>CAPSULES (par ongles)</label>
                  <span style={{fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '10px'}}>Taille des capsules utilisées</span>
                  
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', textAlign: 'center'}}>
                    {["Pouce", "Index", "Majeur", "Annulaire", "Auriculaire"].map(doigt => (
                      <div key={doigt} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>
                        <span style={{fontSize: '0.65rem', color: '#666', fontWeight: 600}}>{doigt}</span>
                        {/* Placeholder finger/nail */}
                        <div style={{width: '16px', height: '30px', background: '#E5C6B7', borderRadius: '8px 8px 0 0', position: 'relative'}}>
                          <div style={{position: 'absolute', top: 0, left: '2px', width: '12px', height: '15px', background: '#8B4B54', borderRadius: '6px 6px 0 0', opacity: 0.8}}></div>
                        </div>
                        <select className={styles.capsuleSelect}>
                          {[0,1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className={styles.segmentedControl} style={{marginTop: '15px'}}>
                    <button 
                      className={`${styles.segmentBtn} ${mainOngles === "gauche" ? styles.active : styles.inactive}`}
                      onClick={() => setMainOngles("gauche")}
                    >
                      Mains gauche
                    </button>
                    <button 
                      className={`${styles.segmentBtn} ${mainOngles === "droite" ? styles.active : styles.inactive}`}
                      onClick={() => setMainOngles("droite")}
                    >
                      Mains droite
                    </button>
                  </div>
                </div>
              </div>

              {/* Middle Column: Produits Utilisés */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
                <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>

                <div style={{display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px'}}>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>BASE</label>
                    <select className={styles.selectInput} defaultValue=""><option value=""></option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>GEL</label>
                    <select className={styles.selectInput} defaultValue=""><option value=""></option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>COULEUR</label>
                    <select className={styles.selectInput} defaultValue=""><option value=""></option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>PRIMER</label>
                    <select className={styles.selectInput} defaultValue=""><option value=""></option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>AUTRES PRODUITS</label>
                    <select className={styles.selectInput} defaultValue=""><option value=""></option></select>
                  </div>
                </div>
              </div>

              {/* Right Column: Remarques, Photos, Infos */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div className={styles.card} style={{flex: 1}}>
                  <h3 className={styles.cardTitle}>REMARQUES</h3>
                  <textarea className={styles.textarea} style={{height: 'calc(100% - 30px)'}}></textarea>
                </div>
                
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PHOTOS</h3>
                  <div className={styles.photoGrid}>
                    <div>
                      <span className={styles.photoLabel}>Avant</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Après</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Autre</span>
                      <div className={styles.photoBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                  <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333', fontSize: '0.85rem' }}>Sophie DOE</div>
                  <div className={styles.infoBlock} style={{gap: '10px', marginTop: '5px'}}>
                    <div className={styles.infoCol}>
                      <span className={styles.infoText} style={{fontSize: '0.7rem'}}>06 01 02 03 04</span>
                      <span className={styles.infoText} style={{fontSize: '0.7rem'}}>ivan.duran@outlook.fr</span>
                    </div>
                    <div className={styles.infoCol}>
                      <span className={styles.infoText} style={{fontSize: '0.7rem'}}>5 rendez-vous effectué</span>
                      <span className={styles.infoText} style={{fontSize: '0.7rem'}}>Aucune allergie</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Annuler le rendez-vous</button>
          <div className={styles.footerRight}>
            <button className={styles.btnDraft} onClick={onClose}>Enregistrer le brouillon</button>
            <button className={styles.btnEnd} onClick={onClose}>Terminer la session</button>
          </div>
        </div>

      </div>
    </div>
  );
}
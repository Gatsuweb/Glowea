/* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability, @typescript-eslint/no-explicit-any, @next/next/no-img-element, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './SessionModal.module.css';
import {
  saveLashSession,
  getSessionModalData, 
  getLashSessionByAppointmentId,
  getBrowliftSessionByAppointmentId,
  getLashLiftSessionByAppointmentId,
  getNailSessionByAppointmentId,
  saveBrowliftSession,
  saveLashLiftSession,
  saveNailSession,
  startSession
} from '../actions/sessionActions';

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

const EyeMappingEditor = ({
  title,
  mapping,
  onZoneChange,
  onCopyToOtherEye,
}: {
  title: string;
  mapping: LashEyeZone[];
  onZoneChange: (zone: number, length: string) => void;
  onCopyToOtherEye: () => void;
}) => {
  const previewValues = mapping.map((zone) => zone.length || "—");

  return (
    <div className={styles.eyeMappingCard}>
      <div className={styles.eyeMappingHeader}>
        <div className={styles.eyeMappingHeaderLeft}>
          <div className={styles.oeilTitle}>{title}</div>
          <span className={styles.eyeMappingSubtitle}>Affecte une longueur par zone.</span>
        </div>
        <button type="button" className={styles.eyeMappingCopyBtn} onClick={onCopyToOtherEye}>
          Copier vers l'autre oeil
        </button>
      </div>

      <div className={styles.eyeMappingVisual}>
        <div className={styles.mappingContainer}>
          <div className={styles.mappingImageWrapper}>
            <Image
              src="/modele-cils.svg"
              alt="Modèle de cils"
              width={220}
              height={80}
              style={{ objectFit: "contain" }}
            />
            <div className={styles.eyeMappingZoneOverlay}>
              {mapping.map((zone, index) => (
                <div
                  key={`${title}-overlay-${zone.zone}`}
                  className={styles.eyeMappingZoneChip}
                  style={[
                    { left: "6%", top: "56%" },
                    { left: "19%", top: "42%" },
                    { left: "34%", top: "30%" },
                    { left: "50%", top: "24%" },
                    { left: "66%", top: "30%" },
                    { left: "81%", top: "42%" },
                    { left: "94%", top: "56%" },
                  ][index]}
                  title={zone.label}
                >
                  {zone.length || zone.zone}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.eyeMappingPreview}>
        {previewValues.map((value, index) => (
          <div key={`${title}-preview-${index}`} className={styles.eyeMappingPreviewCell}>
            {value}
          </div>
        ))}
      </div>

      <div className={styles.eyeMappingZoneList}>
        {mapping.map((zone) => (
          <div key={`${title}-zone-${zone.zone}`} className={styles.eyeMappingZoneRow}>
            <div className={styles.eyeMappingZoneLabel}>
              <strong>{zone.zone}</strong>
              <span>{zone.label}</span>
            </div>
            <select
              className={styles.selectInput}
              value={zone.length || ""}
              onChange={(event) => onZoneChange(zone.zone, event.target.value)}
            >
              <option value="">Aucune</option>
              {["6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"].map((length) => (
                <option key={length} value={length}>
                  {length}
                </option>
              ))}
            </select>
          </div>
        ))}
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
  appointmentId?: string;
  clientId?: string;
  serviceId?: string;
  isReadOnly?: boolean;
  startOnOpen?: boolean;
  onPaymentRequest?: () => void;
}

import { exportElementToPDF } from "../../lib/exportUtils";

type SessionProduct = {
  id: string;
  name: string;
  stock: string;
  checked: boolean;
  defaultTime?: number;
  categorySlug?: string | null;
  categoryLabel?: string | null;
  categoryFamily?: string | null;
};

type ProductQuickFilter =
  | "all"
  | "cils"
  | "colles"
  | "removers"
  | "patchs"
  | "browlift"
  | "rehaussement"
  | "ongles";

const PRODUCT_QUICK_FILTERS: Array<{ id: ProductQuickFilter; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "cils", label: "Cils" },
  { id: "colles", label: "Colles" },
  { id: "removers", label: "Removers" },
  { id: "patchs", label: "Patchs" },
  { id: "browlift", label: "Browlift" },
  { id: "rehaussement", label: "Rehaussement" },
  { id: "ongles", label: "Ongles" },
];

const normalizeSearchValue = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getProductQuickFilter = (product: Pick<SessionProduct, "name" | "categorySlug" | "categoryLabel" | "categoryFamily">): ProductQuickFilter => {
  const normalizedName = normalizeSearchValue(product.name);
  const normalizedSlug = normalizeSearchValue(product.categorySlug || "");
  const normalizedLabel = normalizeSearchValue(product.categoryLabel || "");

  if (product.categoryFamily === "NAILS" || normalizedSlug.startsWith("nails")) {
    return "ongles";
  }
  if (normalizedSlug.includes("remover") || normalizedLabel.includes("remover") || normalizedName.includes("remover")) {
    return "removers";
  }
  if (normalizedSlug.includes("patch") || normalizedLabel.includes("patch") || normalizedName.includes("patch") || normalizedName.includes("pad")) {
    return "patchs";
  }
  if (normalizedSlug.includes("glue") || normalizedSlug.includes("colle") || normalizedLabel.includes("colle") || normalizedName.includes("colle")) {
    return "colles";
  }
  if (normalizedSlug.includes("brow") || normalizedLabel.includes("brow") || normalizedName.includes("brow") || normalizedName.includes("sourcil")) {
    return "browlift";
  }
  if (normalizedSlug.includes("lash lift") || normalizedSlug.includes("rehaussement") || normalizedLabel.includes("rehaussement") || normalizedName.includes("rehaussement") || normalizedName.includes("lift")) {
    return "rehaussement";
  }
  return "cils";
};

const matchesProductQuickFilter = (product: SessionProduct, filter: ProductQuickFilter) => {
  if (filter === "all") return true;
  return getProductQuickFilter(product) === filter;
};

type LashEyeZone = {
  zone: number;
  label: string;
  length: string | null;
};

const EYELASH_ZONE_DEFINITIONS: Array<{ zone: number; label: string }> = [
  { zone: 1, label: "Coin interne" },
  { zone: 2, label: "Intermédiaire interne" },
  { zone: 3, label: "Milieu interne" },
  { zone: 4, label: "Centre" },
  { zone: 5, label: "Milieu externe" },
  { zone: 6, label: "Intermédiaire externe" },
  { zone: 7, label: "Coin externe" },
];

const createEmptyEyeMapping = (): LashEyeZone[] =>
  EYELASH_ZONE_DEFINITIONS.map((zone) => ({
    zone: zone.zone,
    label: zone.label,
    length: null,
  }));

const normalizeEyeMapping = (value: unknown): LashEyeZone[] => {
  const fallback = createEmptyEyeMapping();
  if (!Array.isArray(value)) return fallback;

  if (value.length > 0 && (typeof value[0] === "string" || typeof value[0] === "number")) {
    return deriveEyeMappingFromLengths(value.map((item) => String(item)));
  }

  const mapped = fallback.map((zone, index) => {
    const raw = value[index] as Record<string, unknown> | string | undefined;
    if (raw && typeof raw === "object") {
      const zoneNumber = Number((raw as Record<string, unknown>).zone || zone.zone);
      const label = String((raw as Record<string, unknown>).label || zone.label);
      const lengthValue = (raw as Record<string, unknown>).length;
      return {
        zone: Number.isFinite(zoneNumber) ? zoneNumber : zone.zone,
        label,
        length: lengthValue === null || lengthValue === undefined || lengthValue === "" ? null : String(lengthValue),
      };
    }

    if (typeof raw === "string" || typeof raw === "number") {
      return {
        zone: zone.zone,
        label: zone.label,
        length: String(raw),
      };
    }

    return zone;
  });

  return mapped.map((zone, index) => ({
    zone: EYELASH_ZONE_DEFINITIONS[index].zone,
    label: EYELASH_ZONE_DEFINITIONS[index].label,
    length: zone.length,
  }));
};

const deriveEyeMappingFromLengths = (lengths: string[]): LashEyeZone[] => {
  const sortedLengths = Array.from(
    new Set(lengths.filter(Boolean).map((length) => String(length)))
  ).sort((a, b) => Number(a) - Number(b));

  const fallback = createEmptyEyeMapping();
  if (sortedLengths.length === 0) return fallback;

  const edge = sortedLengths[0];
  const inner = sortedLengths[1] || edge;
  const mid = sortedLengths[2] || inner;
  const center = sortedLengths[sortedLengths.length - 1] || mid;
  const pattern = [edge, inner, mid, center, mid, inner, edge];

  return fallback.map((zone, index) => ({
    zone: zone.zone,
    label: zone.label,
    length: pattern[index] || null,
  }));
};

const deriveLegacyLengthsFromMapping = (mapping: LashEyeZone[]) =>
  Array.from(
    new Set(mapping.map((zone) => zone.length).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => Number(a) - Number(b));

const isBrowliftCatalogProduct = (product: Pick<SessionProduct, "name" | "categorySlug" | "categoryLabel" | "categoryFamily">) => {
  const normalizedName = normalizeSearchValue(product.name);
  const normalizedSlug = normalizeSearchValue(product.categorySlug || "");
  const normalizedLabel = normalizeSearchValue(product.categoryLabel || "");

  return (
    normalizedSlug.includes("brow lift") ||
    normalizedSlug.includes("browlift") ||
    normalizedLabel.includes("brow lift") ||
    normalizedName.includes("brow lift") ||
    normalizedName.includes("browlift") ||
    normalizedName.includes("sourcil")
  );
};

const isRehaussementCatalogProduct = (product: Pick<SessionProduct, "name" | "categorySlug" | "categoryLabel" | "categoryFamily">) => {
  const normalizedName = normalizeSearchValue(product.name);
  const normalizedSlug = normalizeSearchValue(product.categorySlug || "");
  const normalizedLabel = normalizeSearchValue(product.categoryLabel || "");

  return (
    normalizedSlug.includes("lash lift") ||
    normalizedSlug.includes("rehaussement") ||
    normalizedLabel.includes("lash lift") ||
    normalizedLabel.includes("rehaussement") ||
    normalizedName.includes("lash lift") ||
    normalizedName.includes("rehaussement") ||
    normalizedName.includes("lift")
  );
};

const buildTreatmentProducts = (
  products: SessionProduct[],
  kind: "BROWLIFT" | "LASH_LIFT",
  currentSelection?: SessionProduct[] | null,
  includeFullCatalog = false
) => {
  const matcher = kind === "BROWLIFT" ? isBrowliftCatalogProduct : isRehaussementCatalogProduct;
  const selectionByName = new Map((currentSelection || []).map((item) => [normalizeSearchValue(item.name), item]));
  const matchedProducts = products.filter((product) => matcher(product));
  // Fallback to the full catalog when stock items are not categorized yet.
  const sourceProducts = includeFullCatalog || matchedProducts.length === 0 ? products : matchedProducts;

  return sourceProducts
    .map((product) => {
      const savedProduct = selectionByName.get(normalizeSearchValue(product.name));
      return {
        ...product,
        checked: savedProduct?.checked ?? false,
        defaultTime: savedProduct?.defaultTime ?? 5,
      };
    });
};

type SessionPhoto = {
  label: string;
  url: string;
  mimeType?: string;
};

const getInitialSessionTab = (category?: string) => {
  const value = (category || "").toLowerCase();
  if (value.includes("brow")) return "Browlift";
  if (value.includes("rehaussement") || value.includes("lash lift")) return "Rehaussement de cils";
  if (value.includes("ongle") || value.includes("nail") || value.includes("gel") || value.includes("semi")) return "Ongles";
  return "Cils";
};

const getSessionCategory = (tab: string): "LASHES" | "BROWLIFT" | "LASH_LIFT" | "NAILS" => {
  if (tab === "Browlift") return "BROWLIFT";
  if (tab === "Rehaussement de cils") return "LASH_LIFT";
  if (tab === "Ongles") return "NAILS";
  return "LASHES";
};

export default function SessionModal({ 
  isOpen, 
  onClose, 
  clientName = "Johnny Doug", 
  time = "14:00", 
  category = "Cils",
  appointmentId,
  clientId,
  serviceId,
  isReadOnly = false,
  startOnOpen = true,
  onPaymentRequest
}: SessionModalProps) {
  
  const [activeTab, setActiveTab] = useState(() => getInitialSessionTab(category));
  const [technique, setTechnique] = useState("Cil à cil");
  const [typeCils, setTypeCils] = useState("Fait main");

  // Arrays for parameters
  const courbures = ["C", "CC", "D", "DD", "L", "M", "J", "B", "Autre"];
  const epaisseurs = ["0.03", "0.05", "0.07", "0.10", "0.12", "0.15", "0.18", "0.20", "0.25"];
  const longueurs = ["6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];

  const [courbure, setCourbure] = useState("D");
  const [epaisseur, setEpaisseur] = useState("0.10");
  const [longueurActives, setLongueurActives] = useState<string[]>(["11", "12", "13"]);

  const [lashBrand, setLashBrand] = useState("");
  const [lashReference, setLashReference] = useState("");
  const [poseName, setPoseName] = useState("");
  const [remarks, setRemarks] = useState("");

  const [products, setProducts] = useState<SessionProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productQuickFilter, setProductQuickFilter] = useState<ProductQuickFilter>("all");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [photos, setPhotos] = useState<SessionPhoto[]>([]);
  const productPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadData() {
      if (isOpen) {
        const initialTab = getInitialSessionTab(category);
        setActiveTab(initialTab);
        setPhotos([]);
        setCourbure("D");
        setEpaisseur("0.10");
        setLongueurActives(["11", "12", "13"]);
        setCourbureOeilG("D");
        setCourbureOeilD("D");
        setEpaisseurOeilG("0.10");
        setEpaisseurOeilD("0.10");
        setLongueurActivesOeilG(["11", "12", "13"]);
        setLongueurActivesOeilD(["11", "12", "13"]);
        setLeftEyeMapping(createEmptyEyeMapping());
        setRightEyeMapping(createEmptyEyeMapping());
        setManualEyeOverrides({
          G: { curl: false, thickness: false, lengths: false },
          D: { curl: false, thickness: false, lengths: false },
        });
        setProductSearch("");
        setProductQuickFilter("all");
        setIsProductDropdownOpen(false);
        setIsLoadingData(true);
        if (!isReadOnly && startOnOpen && appointmentId && clientId) {
          await startSession({
            appointmentId,
            clientId,
            serviceId,
            category: getSessionCategory(initialTab),
          });
        }
        const res = await getSessionModalData(clientId);
        if (res.success) {
          if (res.clientInfo) setClientDetails(res.clientInfo);
          if (res.products) {
            const catalogProducts = res.products.map((product: SessionProduct) => ({
              ...product,
              defaultTime: product.defaultTime ?? 5,
            }));
            setProducts(catalogProducts);
            setBrowliftProducts((currentSelection) => buildTreatmentProducts(catalogProducts, "BROWLIFT", currentSelection.length > 0 ? currentSelection : null, true));
            setRehaussementProducts((currentSelection) => buildTreatmentProducts(catalogProducts, "LASH_LIFT", currentSelection.length > 0 ? currentSelection : null));
          }
        }
        
        if (appointmentId) {
          // Fetch Cils
          const sessionRes = await getLashSessionByAppointmentId(appointmentId);
          if (sessionRes.success && sessionRes.lashSession) {
            setActiveTab("Cils");
            const ls = sessionRes.lashSession;
            setTechnique(ls.prestationType || "Cil à cil");
            setCourbure(ls.generalCurl || "D");
            setEpaisseur(ls.generalThickness || "0.10");
            setPoseName(ls.poseName || "");
            setLashBrand(ls.lashBrand || "");
            setLashReference(ls.lashReference || "");
            setRemarks(ls.remarks || "");

            if (ls.generalLengthMapJson) {
              const lengths = ls.generalLengthMapJson as unknown as string[];
              if (Array.isArray(lengths)) {
                setLongueurActives(lengths);
              }
            }

            if (ls.globalParamsJson) {
              const globalParams = ls.globalParamsJson as any;
              if (globalParams.typeCils) setTypeCils(globalParams.typeCils);
              setCourbureOeilG(globalParams.courbureOeilG || ls.generalCurl || "D");
              setCourbureOeilD(globalParams.courbureOeilD || ls.generalCurl || "D");
              setEpaisseurOeilG(globalParams.epaisseurOeilG || ls.generalThickness || "0.10");
              setEpaisseurOeilD(globalParams.epaisseurOeilD || ls.generalThickness || "0.10");
              const storedLeftMapping = globalParams.leftEyeMapping || globalParams.longueurActivesOeilG;
              const storedRightMapping = globalParams.rightEyeMapping || globalParams.longueurActivesOeilD;
              const legacyGeneralLengths = Array.isArray(ls.generalLengthMapJson)
                ? (ls.generalLengthMapJson as unknown as string[])
                : [];

              const nextLeftMapping = Array.isArray(storedLeftMapping)
                ? normalizeEyeMapping(storedLeftMapping)
                : legacyGeneralLengths.length > 0
                  ? deriveEyeMappingFromLengths(legacyGeneralLengths)
                  : createEmptyEyeMapping();
              const nextRightMapping = Array.isArray(storedRightMapping)
                ? normalizeEyeMapping(storedRightMapping)
                : legacyGeneralLengths.length > 0
                  ? deriveEyeMappingFromLengths(legacyGeneralLengths)
                  : createEmptyEyeMapping();

              setLeftEyeMapping(nextLeftMapping);
              setRightEyeMapping(nextRightMapping);
              setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(nextLeftMapping));
              setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(nextRightMapping));
              setManualEyeOverrides({
                G: {
                  curl: Boolean(globalParams.courbureOeilG),
                  thickness: Boolean(globalParams.epaisseurOeilG),
                  lengths: Array.isArray(storedLeftMapping),
                },
                D: {
                  curl: Boolean(globalParams.courbureOeilD),
                  thickness: Boolean(globalParams.epaisseurOeilD),
                  lengths: Array.isArray(storedRightMapping),
                },
              });
            } else {
              setCourbureOeilG(ls.generalCurl || "D");
              setCourbureOeilD(ls.generalCurl || "D");
              setEpaisseurOeilG(ls.generalThickness || "0.10");
              setEpaisseurOeilD(ls.generalThickness || "0.10");
              const legacyLengths = Array.isArray(ls.generalLengthMapJson) ? ls.generalLengthMapJson as unknown as string[] : ["11", "12", "13"];
              const derivedMapping = deriveEyeMappingFromLengths(legacyLengths);
              setLeftEyeMapping(derivedMapping);
              setRightEyeMapping(derivedMapping);
              setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(derivedMapping));
              setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(derivedMapping));
              setManualEyeOverrides({
                G: { curl: false, thickness: false, lengths: false },
                D: { curl: false, thickness: false, lengths: false },
              });
            }
            if (sessionRes.photos) setPhotos(sessionRes.photos);
            if (sessionRes.productUsages && res.products) {
              const usedIds = new Set(sessionRes.productUsages.map((usage: any) => usage.productId));
              setProducts(res.products.map((product: SessionProduct) => ({ ...product, checked: usedIds.has(product.id) })));
            }
          }

          // Fetch Browlift
          const browliftRes = await getBrowliftSessionByAppointmentId(appointmentId);
          if (browliftRes.success && browliftRes.browliftSession) {
            setActiveTab("Browlift");
            const bs = browliftRes.browliftSession;
            setHasTeinture(bs.tintEnabled);
            setTintColorBrowlift(bs.tintColor || "Brun foncé");
            setRemarks(bs.remarks || "");
            if (res.products) {
              const gp = (bs.globalParamsJson as any) || {};
              setBrowliftProducts(buildTreatmentProducts(res.products, "BROWLIFT", gp.products || null, true));
            }
            if (browliftRes.photos) setPhotos(browliftRes.photos);
          }

          // Fetch LashLift (Rehaussement)
          const lashLiftRes = await getLashLiftSessionByAppointmentId(appointmentId);
          if (lashLiftRes.success && lashLiftRes.lashLiftSession) {
            setActiveTab("Rehaussement de cils");
            const lls = lashLiftRes.lashLiftSession;
            setHasRehaussementTeinture(lls.tintEnabled);
            setTintColorRehaussement(lls.tintColor || "Brun foncé");
            setRemarks(lls.remarks || "");
            if (lls.globalParamsJson) {
              const gp = lls.globalParamsJson as any;
              if (gp.products) setRehaussementProducts(gp.products);
            }
            if (res.products && !(lls.globalParamsJson as any)?.products) {
              setRehaussementProducts(buildTreatmentProducts(res.products, "LASH_LIFT"));
            }
            if (lashLiftRes.photos) setPhotos(lashLiftRes.photos);
          }

          // Fetch Ongles
          const nailRes = await getNailSessionByAppointmentId(appointmentId);
          if (nailRes.success && nailRes.nailSession) {
            setActiveTab("Ongles");
            const ns = nailRes.nailSession;
            setPrestationOngles(ns.prestationType || "");
            setTypePoseOngles(ns.poseType || "Pose complète");
            setFormeOngles(ns.shape || "Coffin");
            setTaillePoseOngles(ns.size || "M");
            setBaseUsed(ns.baseUsed || "");
            setGelUsed(ns.gelUsed || "");
            setColorUsed(ns.colorUsed || "");
            setPrimerUsed(ns.primerUsed || "");
            setRemarks(ns.remarks || "");
            if (ns.globalParamsJson) {
              const gp = ns.globalParamsJson as any;
              if (gp.mainOngles) setMainOngles(gp.mainOngles);
              if (gp.capsulesGauche) setCapsulesGauche(gp.capsulesGauche);
              if (gp.capsulesDroite) setCapsulesDroite(gp.capsulesDroite);
            }
            if (nailRes.photos) setPhotos(nailRes.photos);
          }
        }
        
        setIsLoadingData(false);
      }
    }
    loadData();
  }, [isOpen, clientId, serviceId, isReadOnly, startOnOpen, appointmentId, category]);

  const [browliftProducts, setBrowliftProducts] = useState<SessionProduct[]>([]);

  const [rehaussementProducts, setRehaussementProducts] = useState<SessionProduct[]>([]);

  const [hasRehaussementTeinture, setHasRehaussementTeinture] = useState(false);
  const [tintColorBrowlift, setTintColorBrowlift] = useState("Brun foncé");
  const [tintColorRehaussement, setTintColorRehaussement] = useState("Brun foncé");

  // States for Ongles
  const [prestationOngles, setPrestationOngles] = useState("");
  const [typePoseOngles, setTypePoseOngles] = useState("Pose complète");
  const [taillePoseOngles, setTaillePoseOngles] = useState("M");
  const [formeOngles, setFormeOngles] = useState("Coffin");
  const [mainOngles, setMainOngles] = useState("gauche"); // "gauche" or "droite"
  const [capsulesGauche, setCapsulesGauche] = useState<Record<string, string>>({
    Pouce: "0", Index: "0", Majeur: "0", Annulaire: "0", Auriculaire: "0"
  });
  const [capsulesDroite, setCapsulesDroite] = useState<Record<string, string>>({
    Pouce: "0", Index: "0", Majeur: "0", Annulaire: "0", Auriculaire: "0"
  });
  const [baseUsed, setBaseUsed] = useState("");
  const [gelUsed, setGelUsed] = useState("");
  const [colorUsed, setColorUsed] = useState("");
  const [primerUsed, setPrimerUsed] = useState("");

  const [courbureOeilG, setCourbureOeilG] = useState("D");
  const [courbureOeilD, setCourbureOeilD] = useState("D");
  const [epaisseurOeilG, setEpaisseurOeilG] = useState("0.10");
  const [epaisseurOeilD, setEpaisseurOeilD] = useState("0.10");
  const [longueurActivesOeilG, setLongueurActivesOeilG] = useState<string[]>(["11", "12", "13"]);
  const [longueurActivesOeilD, setLongueurActivesOeilD] = useState<string[]>(["11", "12", "13"]);
  const [leftEyeMapping, setLeftEyeMapping] = useState<LashEyeZone[]>(createEmptyEyeMapping());
  const [rightEyeMapping, setRightEyeMapping] = useState<LashEyeZone[]>(createEmptyEyeMapping());
  const [manualEyeOverrides, setManualEyeOverrides] = useState({
    G: { curl: false, thickness: false, lengths: false },
    D: { curl: false, thickness: false, lengths: false },
  });

  const [hasTeinture, setHasTeinture] = useState(false);

  const copyCapsulesToOtherHand = () => {
    if (mainOngles === "gauche") {
      setCapsulesDroite({ ...capsulesGauche });
      return;
    }

    setCapsulesGauche({ ...capsulesDroite });
  };

  const normalizeProductName = (name: string) => name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  const findStockProduct = (label: string) => {
    const normalizedLabel = normalizeProductName(label);
    return products.find((product) => {
      const normalizedProduct = normalizeProductName(product.name);
      return normalizedProduct.includes(normalizedLabel) || normalizedLabel.includes(normalizedProduct);
    });
  };

  const getDisplayStock = (label: string, fallback: string) => findStockProduct(label)?.stock || fallback;

  const getSelectedProductUsages = () => {
    const selectedProducts = products
      .filter((product) => product.checked)
      .map((product) => ({
        productId: product.id,
        quantityUsed: 1,
        usageRole: activeTab,
      }));

    const selectedTreatmentProducts = activeTab === "Browlift"
      ? browliftProducts.filter((product) => product.checked)
      : activeTab === "Rehaussement de cils"
        ? rehaussementProducts.filter((product) => product.checked)
        : [];

    const matchedTreatmentProducts = selectedTreatmentProducts
      .map((product) => findStockProduct(product.name))
      .filter((product): product is SessionProduct => Boolean(product))
      .map((product) => ({
      productId: product.id,
      quantityUsed: 1,
      usageRole: activeTab,
    }));

    return [...selectedProducts, ...matchedTreatmentProducts]
      .filter((usage, index, usages) => usages.findIndex((item) => item.productId === usage.productId) === index);
  };

  const handlePhotoChange = (label: string, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setPhotos((current) => [
        ...current.filter((photo) => photo.label !== label),
        { label, url, mimeType: file.type },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const getPhoto = (label: string) => photos.find((photo) => photo.label === label);

  const renderPhotoSlot = (label: string) => {
    const photo = getPhoto(label);

    return (
      <label className={styles.photoBox} style={{ cursor: isReadOnly ? 'default' : 'pointer', overflow: 'hidden' }}>
        {photo ? (
          <img src={photo.url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
        )}
        {!isReadOnly && (
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => handlePhotoChange(label, event.target.files?.[0] || null)}
          />
        )}
      </label>
    );
  };

  const handleSave = async (isDraft: boolean) => {
    if (!appointmentId || !clientId) {
      onClose();
      return;
    }

    const saveStatus = isDraft ? "DRAFT" : "COMPLETED";
    let res;

    if (activeTab === "Cils") {
      res = await saveLashSession({
        appointmentId,
        clientId,
        serviceId,
        prestationType: technique,
        poseName: poseName,
        lashBrand: lashBrand,
        lashReference: lashReference,
        glueUsed: products.find(p => p.checked && p.name.includes('Colle'))?.name || "",
        generalCurl: courbure,
        generalThickness: epaisseur,
        generalLengthMapJson: longueurActives,
        globalParamsJson: {
          typeCils,
          courbureOeilG,
          courbureOeilD,
          epaisseurOeilG,
          epaisseurOeilD,
          leftEyeMapping,
          rightEyeMapping,
          longueurActivesOeilG: deriveLegacyLengthsFromMapping(leftEyeMapping),
          longueurActivesOeilD: deriveLegacyLengthsFromMapping(rightEyeMapping)
        },
        remarks: remarks,
        status: saveStatus,
        productUsages: getSelectedProductUsages(),
        photos,
      });
    } else if (activeTab === "Browlift") {
      res = await saveBrowliftSession({
        appointmentId,
        clientId,
        serviceId,
        tintEnabled: hasTeinture,
        tintColor: tintColorBrowlift,
        globalParamsJson: { products: browliftProducts },
        remarks: remarks,
        status: saveStatus,
        productUsages: getSelectedProductUsages(),
        photos,
      });
    } else if (activeTab === "Rehaussement de cils") {
      res = await saveLashLiftSession({
        appointmentId,
        clientId,
        serviceId,
        tintEnabled: hasRehaussementTeinture,
        tintColor: tintColorRehaussement,
        globalParamsJson: { products: rehaussementProducts },
        remarks: remarks,
        status: saveStatus,
        productUsages: getSelectedProductUsages(),
        photos,
      });
    } else if (activeTab === "Ongles") {
      res = await saveNailSession({
        appointmentId,
        clientId,
        serviceId,
        prestationType: prestationOngles,
        poseType: typePoseOngles,
        shape: formeOngles,
        size: taillePoseOngles,
        baseUsed: baseUsed,
        gelUsed: gelUsed,
        colorUsed: colorUsed,
        primerUsed: primerUsed,
        globalParamsJson: { mainOngles, capsulesGauche, capsulesDroite },
        remarks: remarks,
        status: saveStatus,
        productUsages: getSelectedProductUsages(),
        photos,
      });
    }

    if (res?.success) {
      if (isDraft) {
        alert("Brouillon enregistré avec succès.");
        onClose();
      } else {
        if (onPaymentRequest) {
          onPaymentRequest();
        } else {
          onClose();
        }
      }
    } else {
      alert(res?.error || "Erreur lors de la sauvegarde");
    }
  };

  if (!isOpen) return null;

  const setProductChecked = (id: string | number, checked: boolean) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, checked } : product)));
  };

  const setTreatmentProductChecked = (
    setter: React.Dispatch<React.SetStateAction<SessionProduct[]>>,
    id: string | number,
    checked: boolean
  ) => {
    setter((current) => current.map((product) => (product.id === id ? { ...product, checked } : product)));
  };

  const toggleLongueur = (l: string) => {
    let newLongueurs;
    if (longueurActives.includes(l)) {
      newLongueurs = longueurActives.filter(item => item !== l);
    } else {
      newLongueurs = [...longueurActives, l];
    }
    setLongueurActives(newLongueurs);

    if (!manualEyeOverrides.G.lengths) {
      const nextMapping = deriveEyeMappingFromLengths(newLongueurs);
      setLeftEyeMapping(nextMapping);
      setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(nextMapping));
    }
    if (!manualEyeOverrides.D.lengths) {
      const nextMapping = deriveEyeMappingFromLengths(newLongueurs);
      setRightEyeMapping(nextMapping);
      setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(nextMapping));
    }
  };

  const toggleLongueurOeil = (l: string, oeil: 'G' | 'D') => {
    setManualEyeOverrides((current) => ({
      ...current,
      [oeil]: { ...current[oeil], lengths: true },
    }));

    if (oeil === 'G') {
      const nextMapping = leftEyeMapping.map((zone) => zone.length === l ? { ...zone, length: null } : zone);
      if (!nextMapping.some((zone) => zone.length === l)) {
        const firstEmptyZone = nextMapping.find((zone) => !zone.length);
        if (firstEmptyZone) firstEmptyZone.length = l;
      }
      setLeftEyeMapping([...nextMapping]);
      setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(nextMapping));
    } else {
      const nextMapping = rightEyeMapping.map((zone) => zone.length === l ? { ...zone, length: null } : zone);
      if (!nextMapping.some((zone) => zone.length === l)) {
        const firstEmptyZone = nextMapping.find((zone) => !zone.length);
        if (firstEmptyZone) firstEmptyZone.length = l;
      }
      setRightEyeMapping([...nextMapping]);
      setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(nextMapping));
    }
  };

  const handleGeneralCourbureChange = (value: string) => {
    setCourbure(value);
    if (!manualEyeOverrides.G.curl) setCourbureOeilG(value);
    if (!manualEyeOverrides.D.curl) setCourbureOeilD(value);
  };

  const handleGeneralEpaisseurChange = (value: string) => {
    setEpaisseur(value);
    if (!manualEyeOverrides.G.thickness) setEpaisseurOeilG(value);
    if (!manualEyeOverrides.D.thickness) setEpaisseurOeilD(value);
  };

  const handleEyeCourbureChange = (oeil: 'G' | 'D', value: string) => {
    setManualEyeOverrides((current) => ({
      ...current,
      [oeil]: { ...current[oeil], curl: true },
    }));
    if (oeil === 'G') setCourbureOeilG(value);
    else setCourbureOeilD(value);
  };

  const handleEyeEpaisseurChange = (oeil: 'G' | 'D', value: string) => {
    setManualEyeOverrides((current) => ({
      ...current,
      [oeil]: { ...current[oeil], thickness: true },
    }));
    if (oeil === 'G') setEpaisseurOeilG(value);
    else setEpaisseurOeilD(value);
  };

  const applyGeneralParamsToBothEyes = () => {
    setCourbureOeilG(courbure);
    setCourbureOeilD(courbure);
    setEpaisseurOeilG(epaisseur);
    setEpaisseurOeilD(epaisseur);
    const nextMapping = deriveEyeMappingFromLengths(longueurActives);
    setLeftEyeMapping(nextMapping);
    setRightEyeMapping(nextMapping);
    setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(nextMapping));
    setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(nextMapping));
    setManualEyeOverrides({
      G: { curl: false, thickness: false, lengths: false },
      D: { curl: false, thickness: false, lengths: false },
    });
  };

  const setEyeMappingZone = (oeil: 'G' | 'D', zoneNumber: number, length: string) => {
    setManualEyeOverrides((current) => ({
      ...current,
      [oeil]: { ...current[oeil], lengths: true },
    }));

    if (oeil === 'G') {
      const nextMapping = leftEyeMapping.map((zone) => zone.zone === zoneNumber ? { ...zone, length: length || null } : zone);
      setLeftEyeMapping(nextMapping);
      setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(nextMapping));
    } else {
      const nextMapping = rightEyeMapping.map((zone) => zone.zone === zoneNumber ? { ...zone, length: length || null } : zone);
      setRightEyeMapping(nextMapping);
      setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(nextMapping));
    }
  };

  const copyEyeMapping = (source: 'G' | 'D') => {
    if (source === 'G') {
      const nextMapping = leftEyeMapping.map((zone) => ({ ...zone }));
      setRightEyeMapping(nextMapping);
      setLongueurActivesOeilD(deriveLegacyLengthsFromMapping(nextMapping));
      setManualEyeOverrides((current) => ({
        ...current,
        D: { ...current.D, lengths: true },
      }));
      return;
    }

    const nextMapping = rightEyeMapping.map((zone) => ({ ...zone }));
    setLeftEyeMapping(nextMapping);
    setLongueurActivesOeilG(deriveLegacyLengthsFromMapping(nextMapping));
    setManualEyeOverrides((current) => ({
      ...current,
      G: { ...current.G, lengths: true },
    }));
  };

  const selectedCatalogProducts = products.filter((product) => product.checked);
  const selectedBrowliftProducts = browliftProducts.filter((product) => product.checked);
  const selectedRehaussementProducts = rehaussementProducts.filter((product) => product.checked);

  const filteredCatalogProducts = (() => {
    const query = normalizeSearchValue(productSearch);

    return products.filter((product) => {
      if (!matchesProductQuickFilter(product, productQuickFilter)) return false;
      if (!query) return true;

      const haystack = normalizeSearchValue(
        [product.name, product.stock, product.categoryLabel || "", product.categorySlug || ""].join(" ")
      );

      return haystack.includes(query);
    });
  })();

  const filteredBrowliftProducts = (() => {
    const query = normalizeSearchValue(productSearch);

    return browliftProducts.filter((product) => {
      if (!matchesProductQuickFilter(product, productQuickFilter)) return false;
      if (!query) return true;
      const haystack = normalizeSearchValue([product.name, product.stock, product.categoryLabel || "", product.categorySlug || ""].join(" "));
      return haystack.includes(query);
    });
  })();

  const filteredRehaussementProducts = (() => {
    const query = normalizeSearchValue(productSearch);

    return rehaussementProducts.filter((product) => {
      if (!matchesProductQuickFilter(product, productQuickFilter)) return false;
      if (!query) return true;
      const haystack = normalizeSearchValue([product.name, product.stock, product.categoryLabel || "", product.categorySlug || ""].join(" "));
      return haystack.includes(query);
    });
  })();

  const openProductDropdown = () => setIsProductDropdownOpen(true);
  const closeProductDropdown = () => {
    window.setTimeout(() => {
      if (!productPickerRef.current?.contains(document.activeElement)) {
        setIsProductDropdownOpen(false);
      }
    }, 0);
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearch(value);
    setIsProductDropdownOpen(true);
  };

  const clearProductSearch = () => {
    setProductSearch("");
    setIsProductDropdownOpen(true);
  };

  const browliftAdvice = (() => {
    const allergiesText = String(clientDetails?.allergies || "").toLowerCase();
    const hasKnownSensitivity = allergiesText && !allergiesText.includes("aucune");
    const isFirstBrowliftVisit = Number(clientDetails?.appointmentCount || 0) <= 1;
    const selectedBrowliftSteps = selectedBrowliftProducts.length;

    return [
      hasKnownSensitivity
        ? "Cliente avec sensibilites notees : verifier le confort cutane a chaque etape et limiter tout excedent de produit sur la peau."
        : "Verifier la souplesse naturelle du poil avant de lancer le protocole : un poil fin demande souvent une surveillance plus rapprochee du temps de pose.",
      hasTeinture
        ? "Avec teinture : nettoyer parfaitement la zone avant application et garder une intensite legerement plus douce sur une premiere visite pour eviter un rendu trop marque."
        : "Sans teinture : soigner particulierement le brossage final et la fixation pour que la ligne reste nette, lumineuse et harmonieuse.",
      isFirstBrowliftVisit
        ? "Premiere visite : privilegier un resultat souple et photographier l'avant/apres pour ajuster le protocole au prochain rendez-vous."
        : selectedBrowliftSteps < 3
          ? "Pensez a verifier que toutes les lotions utiles sont bien cochees afin de garder une tracabilite complete de la prestation."
          : "Noter le sens de brossage, la reaction du poil et le timing reel aide a reproduire un resultat regulier sur les prochains rendez-vous.",
    ];
  })();

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
              <span className={styles.badgeWhite}>Aucune allergie</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.closeBtn} onClick={onClose} data-html2canvas-ignore="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Export Container Starts Here */}
        <div id="session-export-container" className={styles.exportContainer}>
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
          <div style={{ pointerEvents: isReadOnly ? 'none' : 'auto' }}>
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

            {/* Produits Utilisés */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
              <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>
              
              {isLoadingData ? (
                <div style={{ padding: '10px 0', color: '#888' }}>Chargement des produits...</div>
              ) : products.length > 0 ? (
                <div
                  ref={productPickerRef}
                  className={styles.productPicker}
                  onFocusCapture={openProductDropdown}
                  onBlurCapture={closeProductDropdown}
                >
                  <div className={styles.productSearchBar}>
                    <input
                      type="search"
                      value={productSearch}
                      onChange={(event) => handleProductSearchChange(event.target.value)}
                      onFocus={openProductDropdown}
                      placeholder="Rechercher un produit..."
                      className={styles.productSearchInput}
                    />
                    {productSearch && (
                      <button
                        type="button"
                        className={styles.productSearchClear}
                        onClick={clearProductSearch}
                        aria-label="Effacer la recherche"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className={styles.productQuickFilters}>
                    {PRODUCT_QUICK_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`${styles.productQuickFilterBtn} ${productQuickFilter === filter.id ? styles.productQuickFilterActive : ""}`}
                        onClick={() => setProductQuickFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className={styles.selectedProductPanel}>
                    <div className={styles.selectedProductHeader}>
                      <span>Produits utilisés</span>
                      <span>{selectedCatalogProducts.length}</span>
                    </div>
                    {selectedCatalogProducts.length > 0 ? (
                      <div className={styles.selectedProductList}>
                        {selectedCatalogProducts.map((product) => (
                          <div key={product.id} className={styles.selectedProductItem}>
                            <div className={styles.selectedProductMeta}>
                              <span className={styles.selectedProductName}>{product.name}</span>
                              <span className={styles.selectedProductStock}>{product.stock}</span>
                            </div>
                            <button
                              type="button"
                              className={styles.selectedProductRemove}
                              onClick={() => setProductChecked(product.id, false)}
                            >
                              Retirer
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.selectedProductEmpty}>
                        Aucun produit sélectionné pour cette séance.
                      </div>
                    )}
                  </div>

                  {isProductDropdownOpen && (
                    <div className={styles.productDropdown}>
                      <div className={styles.productDropdownHeader}>
                        <span>{filteredCatalogProducts.length} résultat{filteredCatalogProducts.length > 1 ? "s" : ""}</span>
                        <span>Tapez pour affiner la recherche</span>
                      </div>

                      <div className={styles.productDropdownList}>
                        {filteredCatalogProducts.length > 0 ? (
                          filteredCatalogProducts.slice(0, 60).map((product) => {
                            const isSelected = product.checked;
                            const filterLabel = PRODUCT_QUICK_FILTERS.find((item) => item.id === getProductQuickFilter(product))?.label || "";

                            return (
                              <button
                                key={product.id}
                                type="button"
                                className={`${styles.productDropdownItem} ${isSelected ? styles.productDropdownItemSelected : ""}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setProductChecked(product.id, !isSelected)}
                              >
                                <div className={styles.productDropdownText}>
                                  <span className={styles.productDropdownName}>{product.name}</span>
                                  <span className={styles.productDropdownMeta}>
                                    {filterLabel}
                                    {filterLabel && product.stock ? " • " : ""}
                                    {product.stock}
                                  </span>
                                </div>
                                <span className={styles.productDropdownAction}>
                                  {isSelected ? "Retirer" : "Ajouter"}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className={styles.productDropdownEmpty}>
                            Aucun produit ne correspond à cette recherche.
                          </div>
                        )}
                      </div>

                      {filteredCatalogProducts.length > 60 && (
                        <div className={styles.productDropdownFooter}>
                          Affichage limité aux 60 premiers résultats. Affinez la recherche pour aller plus vite.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '10px 0', color: '#888' }}>Aucun produit en stock.</div>
              )}
            </div>
          </div>

          {/* ROW 2 */}
          <div className={styles.row2}>
            {/* Details par oeil */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Détails par oeil</h3>
              <p className={styles.cardSubtitle}>Les paramètres peuvent différer d'un œil à l'autre. Ajustez si nécessaire.</p>
              
              <div className={styles.eyeSyncActions}>
                <button type="button" className={styles.eyeSyncBtn} onClick={applyGeneralParamsToBothEyes}>
                  Appliquer aux deux yeux
                </button>
                <button type="button" className={styles.eyeSyncBtnSecondary} onClick={applyGeneralParamsToBothEyes}>
                  Reinitialiser depuis les parametres generaux
                </button>
              </div>

              <div className={styles.paramGroup}>
                <div className={styles.paramLabel}>Courbure</div>
                <div className={styles.paramButtons}>
                  {courbures.map(c => (
                    <button
                      key={c}
                      className={`${styles.paramBtn} ${courbure === c ? styles.active : ''}`}
                      onClick={() => handleGeneralCourbureChange(c)}
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
                      onClick={() => handleGeneralEpaisseurChange(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.oeilGrid}>
                <div className={styles.oeilCol}>
                  <div className={styles.oeilSelects}>
                    <div className={styles.selectGroup}>
                      <label>Courbure</label>
                      <select className={styles.selectInput} value={courbureOeilG} onChange={(event) => handleEyeCourbureChange('G', event.target.value)}>
                        {courbures.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className={styles.selectGroup}>
                      <label>Epaisseur</label>
                      <select className={styles.selectInput} value={epaisseurOeilG} onChange={(event) => handleEyeEpaisseurChange('G', event.target.value)}>
                        {epaisseurs.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <EyeMappingEditor
                    title="OEIL G."
                    mapping={leftEyeMapping}
                    onZoneChange={(zone, length) => setEyeMappingZone('G', zone, length)}
                    onCopyToOtherEye={() => copyEyeMapping('G')}
                  />
                </div>

                <div className={styles.oeilCol}>
                  <div className={styles.oeilSelects}>
                    <div className={styles.selectGroup}>
                      <label>Courbure</label>
                      <select className={styles.selectInput} value={courbureOeilD} onChange={(event) => handleEyeCourbureChange('D', event.target.value)}>
                        {courbures.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className={styles.selectGroup}>
                      <label>Epaisseur</label>
                      <select className={styles.selectInput} value={epaisseurOeilD} onChange={(event) => handleEyeEpaisseurChange('D', event.target.value)}>
                        {epaisseurs.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <EyeMappingEditor
                    title="OEIL D."
                    mapping={rightEyeMapping}
                    onZoneChange={(zone, length) => setEyeMappingZone('D', zone, length)}
                    onCopyToOtherEye={() => copyEyeMapping('D')}
                  />
                </div>
              </div>
            </div>

            {/* Marque */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>MARQUE DES CILS UTILISÉS</h3>
              <div className={styles.inputGroup}>
                <label>Marque / Gamme :</label>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  value={lashBrand} 
                  onChange={e => setLashBrand(e.target.value)} 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Référence (optionnelle):</label>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  value={lashReference} 
                  onChange={e => setLashReference(e.target.value)} 
                />
              </div>
              
              <h3 className={styles.cardTitle} style={{ marginTop: '20px' }}>NOM DE LA POSE</h3>
              <div className={styles.inputGroup}>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  value={poseName} 
                  onChange={e => setPoseName(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* ROW 3 */}
          <div className={styles.row3}>
            {/* Infos */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
              {isLoadingData ? (
                <div style={{ padding: '10px 0', color: '#888' }}>Chargement...</div>
              ) : clientDetails ? (
                <>
                  <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333' }}>
                    {clientDetails.fullName}
                    {clientDetails.isLoyal && (
                      <span style={{
                        marginLeft: '10px',
                        background: '#FFE4E1',
                        color: '#D87093',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>Cliente fidèle</span>
                    )}
                  </div>
                  <div className={styles.infoBlock}>
                    <div className={styles.infoCol}>
                      <span className={styles.infoText}>{clientDetails.phone}</span>
                      <span className={styles.infoText}>{clientDetails.email}</span>
                    </div>
                    <div className={styles.infoCol}>
                      <span className={styles.infoText}>{clientDetails.appointmentCount} rendez-vous effectué(s)</span>
                      <span className={styles.infoText}>{clientDetails.allergies}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '10px 0', color: '#888' }}>Aucune information disponible.</div>
              )}
            </div>

            {/* Remarques */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>REMARQUES</h3>
              <textarea 
                className={styles.textarea} 
                value={remarks} 
                onChange={e => setRemarks(e.target.value)} 
              ></textarea>
            </div>

            {/* Photos */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>PHOTOS</h3>
              <div className={styles.photoGrid}>
                <div>
                  <span className={styles.photoLabel}>Avant</span>
                  {renderPhotoSlot("Avant")}
                </div>
                <div>
                  <span className={styles.photoLabel}>Apres</span>
                  {renderPhotoSlot("Apres")}
                </div>
                <div>
                  <span className={styles.photoLabel}>Autres</span>
                  {renderPhotoSlot("Autres")}
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
                  <div
                    ref={productPickerRef}
                    className={styles.productPicker}
                    onFocusCapture={openProductDropdown}
                    onBlurCapture={closeProductDropdown}
                  >
                    <div className={styles.productSearchBar}>
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(event) => handleProductSearchChange(event.target.value)}
                        onFocus={openProductDropdown}
                        placeholder="Rechercher un produit..."
                        className={styles.productSearchInput}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          className={styles.productSearchClear}
                          onClick={clearProductSearch}
                          aria-label="Effacer la recherche"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className={styles.productQuickFilters}>
                      {PRODUCT_QUICK_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          className={`${styles.productQuickFilterBtn} ${productQuickFilter === filter.id ? styles.productQuickFilterActive : ""}`}
                          onClick={() => setProductQuickFilter(filter.id)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className={styles.selectedProductPanel}>
                      <div className={styles.selectedProductHeader}>
                        <span>Produits utilisés</span>
                        <span>{selectedBrowliftProducts.length}</span>
                      </div>
                      {selectedBrowliftProducts.length > 0 ? (
                        <div className={styles.selectedProductList}>
                          {selectedBrowliftProducts.map((product) => (
                            <div key={product.id} className={styles.selectedProductItem}>
                              <div className={styles.selectedProductMeta}>
                                <span className={styles.selectedProductName}>{product.name}</span>
                                <span className={styles.selectedProductStock}>{getDisplayStock(product.name, product.stock)}</span>
                              </div>
                              <button
                                type="button"
                                className={styles.selectedProductRemove}
                                onClick={() => setTreatmentProductChecked(setBrowliftProducts, product.id, false)}
                              >
                                Retirer
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.selectedProductEmpty}>
                          Aucun produit sélectionné pour cette séance.
                        </div>
                      )}
                    </div>

                    {isProductDropdownOpen && (
                      <div className={styles.productDropdown}>
                        <div className={styles.productDropdownHeader}>
                          <span>{filteredBrowliftProducts.length} résultat{filteredBrowliftProducts.length > 1 ? "s" : ""}</span>
                          <span>Tapez pour affiner la recherche</span>
                        </div>

                        <div className={styles.productDropdownList}>
                          {filteredBrowliftProducts.length > 0 ? (
                            filteredBrowliftProducts.slice(0, 60).map((product) => {
                              const isSelected = product.checked;
                              const filterLabel = PRODUCT_QUICK_FILTERS.find((item) => item.id === getProductQuickFilter(product))?.label || "";

                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  className={`${styles.productDropdownItem} ${isSelected ? styles.productDropdownItemSelected : ""}`}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => setTreatmentProductChecked(setBrowliftProducts, product.id, !isSelected)}
                                >
                                  <div className={styles.productDropdownText}>
                                    <span className={styles.productDropdownName}>{product.name}</span>
                                    <span className={styles.productDropdownMeta}>
                                      {filterLabel}
                                      {filterLabel && product.stock ? " • " : ""}
                                      {product.stock}
                                    </span>
                                  </div>
                                  <span className={styles.productDropdownAction}>
                                    {isSelected ? "Retirer" : "Ajouter"}
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <div className={styles.productDropdownEmpty}>
                              Aucun produit ne correspond à cette recherche.
                            </div>
                          )}
                        </div>

                        {filteredBrowliftProducts.length > 60 && (
                          <div className={styles.productDropdownFooter}>
                            Affichage limité aux 60 premiers résultats. Affinez la recherche pour aller plus vite.
                          </div>
                        )}
                      </div>
                    )}
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
                      <input type="text" className={styles.textInput} value={tintColorBrowlift} onChange={e => setTintColorBrowlift(e.target.value)} placeholder="Ex: Brun foncé, Noir..." style={{flex: 1}}/>
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
                  {selectedBrowliftProducts.map(p => (
                    <TimerCard key={p.id} title={p.name} initialMinutes={p.defaultTime || 5} />
                  ))}
                  {selectedBrowliftProducts.length === 0 && (
                    <p style={{color: '#888', fontSize: '0.9rem'}}>Sélectionnez une lotion pour configurer son temps de pause.</p>
                  )}
                </div>
              </div>

              {/* Row 3: Remarques, Photos */}
              <div className={styles.browliftRow3} style={{marginTop: '15px'}}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>REMARQUES</h3>
                  <textarea className={styles.textarea} value={remarks} onChange={e => setRemarks(e.target.value)} style={{minHeight: '80px'}}></textarea>
                </div>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PHOTOS</h3>
                  <div className={styles.photoGrid}>
                    <div>
                    <span className={styles.photoLabel}>Avant</span>
                    {renderPhotoSlot("Avant")}
                  </div>
                  <div>
                    <span className={styles.photoLabel}>Apres</span>
                    {renderPhotoSlot("Apres")}
                  </div>
                  <div>
                    <span className={styles.photoLabel}>Autres</span>
                    {renderPhotoSlot("Autres")}
                  </div>
                  </div>
                </div>
              </div>

              {/* Infos Cliente */}
              <div className={styles.card} style={{marginTop: '15px'}}>
                <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                {isLoadingData ? (
                  <div style={{ padding: '10px 0', color: '#888' }}>Chargement...</div>
                ) : clientDetails ? (
                  <>
                    <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333' }}>
                      {clientDetails.fullName}
                      {clientDetails.isLoyal && (
                        <span style={{
                          marginLeft: '10px',
                          background: '#FFE4E1',
                          color: '#D87093',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>Cliente fidèle</span>
                      )}
                    </div>
                    <div className={styles.infoBlock}>
                      <div className={styles.infoCol}>
                        <span className={styles.infoText}>{clientDetails.phone}</span>
                        <span className={styles.infoText}>{clientDetails.email}</span>
                      </div>
                      <div className={styles.infoCol}>
                        <span className={styles.infoText}>{clientDetails.appointmentCount} rendez-vous effectué(s)</span>
                        <span className={styles.infoText}>{clientDetails.allergies}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '10px 0', color: '#888' }}>Aucune information disponible.</div>
                )}
              </div>
              
              {/* Info Banner */}
              <div className={styles.infoBanner}>
                <strong className={styles.infoBannerTitle}>Conseils Browlift intelligents</strong>
                <ul className={styles.infoBannerList}>
                  {browliftAdvice.map((advice) => (
                    <li key={advice}>{advice}</li>
                  ))}
                </ul>
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
                  <div
                    ref={productPickerRef}
                    className={styles.productPicker}
                    onFocusCapture={openProductDropdown}
                    onBlurCapture={closeProductDropdown}
                  >
                    <div className={styles.productSearchBar}>
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(event) => handleProductSearchChange(event.target.value)}
                        onFocus={openProductDropdown}
                        placeholder="Rechercher un produit..."
                        className={styles.productSearchInput}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          className={styles.productSearchClear}
                          onClick={clearProductSearch}
                          aria-label="Effacer la recherche"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className={styles.productQuickFilters}>
                      {PRODUCT_QUICK_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          className={`${styles.productQuickFilterBtn} ${productQuickFilter === filter.id ? styles.productQuickFilterActive : ""}`}
                          onClick={() => setProductQuickFilter(filter.id)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className={styles.selectedProductPanel}>
                      <div className={styles.selectedProductHeader}>
                        <span>Produits utilisés</span>
                        <span>{selectedRehaussementProducts.length}</span>
                      </div>
                      {selectedRehaussementProducts.length > 0 ? (
                        <div className={styles.selectedProductList}>
                          {selectedRehaussementProducts.map((product) => (
                            <div key={product.id} className={styles.selectedProductItem}>
                              <div className={styles.selectedProductMeta}>
                                <span className={styles.selectedProductName}>{product.name}</span>
                                <span className={styles.selectedProductStock}>{getDisplayStock(product.name, product.stock)}</span>
                              </div>
                              <button
                                type="button"
                                className={styles.selectedProductRemove}
                                onClick={() => setTreatmentProductChecked(setRehaussementProducts, product.id, false)}
                              >
                                Retirer
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.selectedProductEmpty}>
                          Aucun produit sélectionné pour cette séance.
                        </div>
                      )}
                    </div>

                    {isProductDropdownOpen && (
                      <div className={styles.productDropdown}>
                        <div className={styles.productDropdownHeader}>
                          <span>{filteredRehaussementProducts.length} résultat{filteredRehaussementProducts.length > 1 ? "s" : ""}</span>
                          <span>Tapez pour affiner la recherche</span>
                        </div>

                        <div className={styles.productDropdownList}>
                          {filteredRehaussementProducts.length > 0 ? (
                            filteredRehaussementProducts.slice(0, 60).map((product) => {
                              const isSelected = product.checked;
                              const filterLabel = PRODUCT_QUICK_FILTERS.find((item) => item.id === getProductQuickFilter(product))?.label || "";

                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  className={`${styles.productDropdownItem} ${isSelected ? styles.productDropdownItemSelected : ""}`}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => setTreatmentProductChecked(setRehaussementProducts, product.id, !isSelected)}
                                >
                                  <div className={styles.productDropdownText}>
                                    <span className={styles.productDropdownName}>{product.name}</span>
                                    <span className={styles.productDropdownMeta}>
                                      {filterLabel}
                                      {filterLabel && product.stock ? " • " : ""}
                                      {product.stock}
                                    </span>
                                  </div>
                                  <span className={styles.productDropdownAction}>
                                    {isSelected ? "Retirer" : "Ajouter"}
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <div className={styles.productDropdownEmpty}>
                              Aucun produit ne correspond à cette recherche.
                            </div>
                          )}
                        </div>

                        {filteredRehaussementProducts.length > 60 && (
                          <div className={styles.productDropdownFooter}>
                            Affichage limité aux 60 premiers résultats. Affinez la recherche pour aller plus vite.
                          </div>
                        )}
                      </div>
                    )}
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
                      <input type="text" className={styles.textInput} value={tintColorRehaussement} onChange={e => setTintColorRehaussement(e.target.value)} placeholder="Ex: Brun foncé, Noir..." style={{flex: 1}}/>
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
                  {selectedRehaussementProducts.map((p) => (
                    <TimerCard key={p.id} title={p.name} initialMinutes={p.defaultTime || 5} />
                  ))}
                  {selectedRehaussementProducts.length === 0 && (
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
                  <textarea className={styles.textarea} value={remarks} onChange={e => setRemarks(e.target.value)} style={{minHeight: '80px'}}></textarea>
                </div>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PHOTOS</h3>
                  <div className={styles.photoGrid}>
                    <div>
                      <span className={styles.photoLabel}>Avant</span>
                      {renderPhotoSlot("Avant")}
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Apres</span>
                      {renderPhotoSlot("Apres")}
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Autres</span>
                      {renderPhotoSlot("Autres")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Infos Cliente */}
              <div className={styles.card} style={{marginTop: '15px'}}>
                <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                {isLoadingData ? (
                  <div style={{ padding: '10px 0', color: '#888' }}>Chargement...</div>
                ) : clientDetails ? (
                  <>
                    <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333' }}>
                      {clientDetails.fullName}
                      {clientDetails.isLoyal && (
                        <span style={{
                          marginLeft: '10px',
                          background: '#FFE4E1',
                          color: '#D87093',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>Cliente fidèle</span>
                      )}
                    </div>
                    <div className={styles.infoBlock}>
                      <div className={styles.infoCol}>
                        <span className={styles.infoText}>{clientDetails.phone}</span>
                        <span className={styles.infoText}>{clientDetails.email}</span>
                      </div>
                      <div className={styles.infoCol}>
                        <span className={styles.infoText}>{clientDetails.appointmentCount} rendez-vous effectué(s)</span>
                        <span className={styles.infoText}>{clientDetails.allergies}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '10px 0', color: '#888' }}>Aucune information disponible.</div>
                )}
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
                  <select className={styles.selectInput} value={prestationOngles} onChange={e => setPrestationOngles(e.target.value)}>
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
                        <select 
                          className={styles.capsuleSelect}
                          value={mainOngles === "gauche" ? capsulesGauche[doigt] : capsulesDroite[doigt]}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (mainOngles === "gauche") {
                              setCapsulesGauche(prev => ({ ...prev, [doigt]: val }));
                            } else {
                              setCapsulesDroite(prev => ({ ...prev, [doigt]: val }));
                            }
                          }}
                        >
                          {[0,1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className={styles.segmentedControl} style={{marginTop: '15px', pointerEvents: 'auto'}}>
                    <button 
                      type="button"
                      className={`${styles.segmentBtn} ${mainOngles === "gauche" ? styles.active : styles.inactive}`}
                      onClick={() => setMainOngles("gauche")}
                    >
                      Mains gauche
                    </button>
                    <button 
                      type="button"
                      className={`${styles.segmentBtn} ${mainOngles === "droite" ? styles.active : styles.inactive}`}
                      onClick={() => setMainOngles("droite")}
                    >
                      Mains droite
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.copyHandBtn}
                    onClick={copyCapsulesToOtherHand}
                    title={mainOngles === "gauche" ? "Copier les tailles vers la main droite" : "Copier les tailles vers la main gauche"}
                  >
                    Copier vers l&apos;autre main
                  </button>
                </div>
              </div>

              {/* Middle Column: Produits Utilisés */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>PRODUITS UTILISÉS</h3>
                <p className={styles.cardSubtitle}>Le stock se mettra à jour automatiquement.</p>

                <div style={{display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px'}}>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>BASE</label>
                    <select className={styles.selectInput} value={baseUsed} onChange={e => setBaseUsed(e.target.value)}><option value=""></option><option value="Base Clear">Base Clear</option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>GEL</label>
                    <select className={styles.selectInput} value={gelUsed} onChange={e => setGelUsed(e.target.value)}><option value=""></option><option value="Gel Construction">Gel Construction</option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>COULEUR</label>
                    <select className={styles.selectInput} value={colorUsed} onChange={e => setColorUsed(e.target.value)}><option value=""></option><option value="Rouge">Rouge</option></select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.paramLabel}>PRIMER</label>
                    <select className={styles.selectInput} value={primerUsed} onChange={e => setPrimerUsed(e.target.value)}><option value=""></option><option value="Primer Acid Free">Primer Acid Free</option></select>
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
                  <textarea className={styles.textarea} value={remarks} onChange={e => setRemarks(e.target.value)} style={{height: 'calc(100% - 30px)'}}></textarea>
                </div>
                
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>PHOTOS</h3>
                  <div className={styles.photoGrid}>
                    <div>
                      <span className={styles.photoLabel}>Avant</span>
                      {renderPhotoSlot("Avant")}
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Apres</span>
                      {renderPhotoSlot("Apres")}
                    </div>
                    <div>
                      <span className={styles.photoLabel}>Autres</span>
                      {renderPhotoSlot("Autres")}
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>INFOS CLIENTE</h3>
                  {isLoadingData ? (
                    <div style={{ padding: '10px 0', color: '#888' }}>Chargement...</div>
                  ) : clientDetails ? (
                    <>
                      <div className={styles.infoTitle} style={{ fontWeight: 600, color: '#333', fontSize: '0.85rem' }}>
                        {clientDetails.fullName}
                        {clientDetails.isLoyal && (
                          <span style={{
                            marginLeft: '10px',
                            background: '#FFE4E1',
                            color: '#D87093',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>Cliente fidèle</span>
                        )}
                      </div>
                      <div className={styles.infoBlock} style={{gap: '10px', marginTop: '5px'}}>
                        <div className={styles.infoCol}>
                          <span className={styles.infoText} style={{fontSize: '0.7rem'}}>{clientDetails.phone}</span>
                          <span className={styles.infoText} style={{fontSize: '0.7rem'}}>{clientDetails.email}</span>
                        </div>
                        <div className={styles.infoCol}>
                          <span className={styles.infoText} style={{fontSize: '0.7rem'}}>{clientDetails.appointmentCount} rendez-vous effectué(s)</span>
                          <span className={styles.infoText} style={{fontSize: '0.7rem'}}>{clientDetails.allergies}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '10px 0', color: '#888' }}>Aucune information disponible.</div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* <div className={styles.card} style={{ margin: '15px' }}>
          <h3 className={styles.cardTitle}>PHOTOS SESSION</h3>
          <div className={styles.photoGrid}>
            <div>
              <span className={styles.photoLabel}>Avant</span>
              {renderPhotoSlot("Avant")}
            </div>
            <div>
              <span className={styles.photoLabel}>Apres</span>
              {renderPhotoSlot("Apres")}
            </div>
            <div>
              <span className={styles.photoLabel}>Autres</span>
              {renderPhotoSlot("Autres")}
            </div>
          </div>
        </div> */}

        {/* End of Export Container */}
        </div>

        {/* Footer */}
        {isReadOnly ? (
          <div className={`${styles.footer} ${styles.footerReadOnly}`} data-html2canvas-ignore="true">
            <button 
              className={styles.btnSecondary} 
              onClick={() => exportElementToPDF('session-export-container', `fiche_session_${clientName.replace(' ', '_')}`, 'portrait')}
              title="Télécharger la fiche"
              style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Télécharger
            </button>
            <button className={styles.btnCancel} onClick={onClose}>Fermer</button>
          </div>
        ) : (
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose}>Fermer</button>
            <div className={styles.footerRight}>
              <button className={styles.btnDraft} onClick={() => handleSave(true)}>Enregistrer le brouillon</button>
              <button className={styles.btnEnd} onClick={() => handleSave(false)}>Terminer la session</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

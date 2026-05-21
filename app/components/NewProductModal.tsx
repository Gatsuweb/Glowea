"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import styles from "./NewAppointmentModal.module.css";
import { createProduct, updateProduct } from "../actions/stockActions";
import { PRODUCT_FAMILIES, type ProductFamily } from "../../src/constants/productCategories";

type ProductCategory = {
  id: string;
  name: string;
  slug?: string | null;
  label?: string | null;
  family?: ProductFamily | null;
  image?: string | null;
  description?: string | null;
};

type ProductFormData = {
  id: string;
  name?: string;
  desc?: string;
  rawPrice?: number;
  count?: number;
  categoryId?: string | null;
  expireAt?: string | Date | null;
};

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ProductFormData | null;
  categories?: ProductCategory[];
}

type ProductTemplate = {
  id: string;
  label: string;
  categorySlug: string;
  name: string;
  desc: string;
  price: string;
  initialStock: string;
};

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "glue",
    label: "+ Ajouter une colle",
    categorySlug: "lashes-glues",
    name: "Colle ",
    desc: "Temps de sechage : \nViscosite : \nCouleur : noire\nHumidite ideale : ",
    price: "",
    initialStock: "1",
  },
  {
    id: "gel",
    label: "+ Ajouter un gel",
    categorySlug: "nails-construction",
    name: "Gel ",
    desc: "Type : construction\nViscosite : \nTeinte : \nFinition : ",
    price: "",
    initialStock: "1",
  },
  {
    id: "lash-tray",
    label: "+ Ajouter un lash tray",
    categorySlug: "lashes-extensions",
    name: "Lash tray ",
    desc: "Courbure : \nEpaisseur : \nLongueurs : \nEffet : ",
    price: "",
    initialStock: "1",
  },
];

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  "lashes-glues": [
    "Temps de sechage : 0.5-1s",
    "Viscosite : fluide / moyenne",
    "Couleur : noire / transparente",
    "Humidite ideale : 45-65%",
  ],
  "lashes-extensions": [
    "Courbure : C / CC / D",
    "Epaisseur : 0.05 / 0.07 / 0.10",
    "Longueurs : mix ou taille unique",
    "Effet : naturel / wispy / volume",
  ],
  "lashes-lash-lift": [
    "Etape : lotion 1 / lotion 2 / soin",
    "Temps de pose : ",
    "Format : sachet / flacon",
  ],
  "lashes-brow-lift": [
    "Etape : lift / fixation / soin",
    "Temps de pose : ",
    "Zone : sourcils",
  ],
  "nails-colors": [
    "Couleur : ",
    "Finition : glossy / mat / paillete",
    "Marque : ",
    "Reference teinte : ",
  ],
  "nails-construction": [
    "Type : gel / acrygel",
    "Viscosite : fluide / moyenne / epaisse",
    "Teinte : clear / cover / pink",
    "Usage : gainage / rallongement",
  ],
  "nails-bases": [
    "Type : base / rubber base",
    "Teinte : clear / cover",
    "Finition : soak off / renfort",
  ],
  "nails-finish": [
    "Finition : glossy / mat",
    "Sans residu : oui / non",
    "Usage : couleur / nail art",
  ],
};

export default function NewProductModal({
  isOpen,
  onClose,
  initialData = null,
  categories = [],
}: NewProductModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("1");
  const [expireAt, setExpireAt] = useState("");
  const [family, setFamily] = useState<ProductFamily>("NAILS");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleCategories = categories.filter((category) => category.family === family);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedCategorySlug = selectedCategory?.slug || null;
  const suggestions = selectedCategorySlug ? CATEGORY_SUGGESTIONS[selectedCategorySlug] || [] : [];

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const selectedCategory = categories.find((category) => category.id === initialData.categoryId);

      setName(initialData.name || "");
      setDesc(initialData.desc || "");
      setPrice(initialData.rawPrice?.toString() || "");
      setInitialStock(initialData.count?.toString() || "0");
      setCategoryId(initialData.categoryId || "");
      setFamily(selectedCategory?.family || "NAILS");

      if (initialData.expireAt) {
        const date = new Date(initialData.expireAt);
        setExpireAt(date.toISOString().split("T")[0]);
      } else {
        setExpireAt("");
      }
    } else {
      setName("");
      setDesc("");
      setPrice("");
      setInitialStock("1");
      setExpireAt("");
      setFamily("NAILS");
      setCategoryId("");
    }
  }, [isOpen, initialData, categories]);

  if (!isOpen) return null;

  const handleFamilyChange = (nextFamily: ProductFamily) => {
    setFamily(nextFamily);

    const nextCategories = categories.filter((category) => category.family === nextFamily);
    if (!nextCategories.some((category) => category.id === categoryId)) {
      setCategoryId("");
    }
  };

  const applyTemplate = (template: ProductTemplate) => {
    const templateCategory = categories.find((category) => category.slug === template.categorySlug);
    if (templateCategory?.family) {
      setFamily(templateCategory.family);
    }
    setCategoryId(templateCategory?.id || "");
    setName(template.name);
    setDesc(template.desc);
    setPrice(template.price);
    setInitialStock(template.initialStock);
  };

  const appendSuggestion = (suggestion: string) => {
    setDesc((currentDesc) => {
      const trimmedDesc = currentDesc.trim();
      if (trimmedDesc.includes(suggestion)) return currentDesc;
      return trimmedDesc ? `${trimmedDesc}\n${suggestion}` : suggestion;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Veuillez entrer le nom du produit");
      return;
    }

    setIsSubmitting(true);

    try {
      if (initialData) {
        const res = await updateProduct(initialData.id, {
          name,
          desc,
          price: parseFloat(price) || 0,
          categoryId: categoryId || null,
        });

        if (!res.success) {
          alert(res.error || "Erreur lors de la mise a jour du produit");
          return;
        }
      } else {
        const res = await createProduct({
          name,
          desc,
          price: parseFloat(price) || 0,
          initialStock: parseInt(initialStock, 10) || 0,
          expireAt: expireAt ? new Date(expireAt) : null,
          categoryId: categoryId || null,
        });

        if (!res.success) {
          alert(res.error || "Erreur lors de la creation du produit");
          return;
        }
      }

      onClose();
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.productModalContent}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.title}>{initialData ? "Modifier le Produit" : "Nouveau Produit"}</h1>
        </div>

        <div className={styles.productProgress} aria-label="Progression du formulaire produit">
          <div className={styles.productProgressStep}>
            <span>1</span>
            <strong>Produit</strong>
          </div>
          <div className={styles.productProgressLine} />
          <div className={styles.productProgressStep}>
            <span>2</span>
            <strong>Stock</strong>
          </div>
          <div className={styles.productProgressLine} />
          <div className={styles.productProgressStep}>
            <span>3</span>
            <strong>Validation</strong>
          </div>
        </div>

        {!initialData && (
          <div className={`${styles.productSection} ${styles.productSectionSoft}`}>
            <div className={styles.productSectionHeader}>
              <div>
                <div className={styles.sectionTitle}>TEMPLATES RAPIDES</div>
                <p>Demarre avec une fiche deja structuree pour les produits les plus courants.</p>
              </div>
            </div>
            <div className={styles.quickTemplateGrid}>
              {PRODUCT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={styles.quickTemplateBtn}
                  onClick={() => applyTemplate(template)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`${styles.sectionPink} ${styles.productSection}`}>
          <div className={styles.sectionTitle}>DETAILS DU PRODUIT</div>

          <div className={styles.productFamilyGrid}>
            {PRODUCT_FAMILIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.productFamilyBtn} ${family === item.id ? styles.active : ""}`}
                onClick={() => handleFamilyChange(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            ))}
          </div>

          <div className={styles.productCategoryGrid}>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.productCategoryCard} ${categoryId === cat.id ? styles.active : ""}`}
                onClick={() => setCategoryId(cat.id)}
              >
                {cat.image ? (
                  <Image src={cat.image} alt="" width={54} height={54} className={styles.productCategoryImage} />
                ) : (
                  <span className={styles.productCategoryFallback} />
                )}
                <span>{cat.label || cat.name}</span>
                {cat.description ? <small>{cat.description}</small> : null}
              </button>
            ))}
          </div>

          <input
            type="text"
            className={styles.notesInput}
            placeholder="Nom du produit (ex: Primer, Colle...)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "10px" }}
          />
          <textarea
            className={styles.notesInput}
            placeholder="Description ou tags (ex: Adherence pour cils)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          {suggestions.length > 0 && (
            <div className={styles.smartSuggestions}>
              <div className={styles.smartSuggestionsHeader}>
                <span>Suggestions intelligentes</span>
                <small>{selectedCategory?.label || selectedCategory?.name}</small>
              </div>
              <div className={styles.smartSuggestionList}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.smartSuggestionChip}
                    onClick={() => appendSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`${styles.sectionWhite} ${styles.productSection}`}>
          <div className={styles.sectionTitle}>PRIX & STOCK</div>
          <div className={styles.productFieldGrid}>
            <div className={styles.productField}>
              <label>Prix Unitaire (EUR)</label>
              <input
                type="number"
                step="0.01"
                className={styles.notesInput}
                placeholder="Ex: 3.60"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            {!initialData && (
              <div className={styles.productField}>
                <label>Stock Initial</label>
                <input
                  type="number"
                  className={styles.notesInput}
                  placeholder="Ex: 12"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                />
              </div>
            )}
          </div>

          {!initialData && (
            <div className={styles.productField}>
              <label>Date d&apos;expiration (optionnel)</label>
              <input
                type="date"
                className={styles.notesInput}
                value={expireAt}
                onChange={(e) => setExpireAt(e.target.value)}
              />
            </div>
          )}
        </div>

        <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

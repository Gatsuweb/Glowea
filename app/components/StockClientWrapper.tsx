"use client";

import Image from "next/image";
import React, { useState } from "react";
import styles from "../dashboard/stock/stock.module.css";
import { adjustStock, deleteProduct } from "../actions/stockActions";
import NewProductModal from "./NewProductModal";

type StockProduct = {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  rawPrice: number;
  count: number;
  alertThreshold?: number | null;
  statusColor: string;
  status: string;
  price: string;
  expire: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryImage?: string | null;
  categoryLabel?: string | null;
  categoryFamily?: string | null;
  trackingType?: "UNIDOSE" | "MULTIDOSE" | "NON_STOCKED" | null;
  expireAt?: string | Date | null;
};

type StockMovement = {
  id: string;
  type: "out" | "in";
  name: string;
  desc: string;
  amount: string;
};

type StockCategory = {
  id: string;
  name: string;
  slug?: string | null;
  label?: string | null;
  family?: "NAILS" | "LASHES" | null;
  image?: string | null;
  description?: string | null;
};

type EditableStockProduct = Omit<StockProduct, "trackingType"> & {
  trackingType?: "UNIDOSE" | "MULTIDOSE";
};

export default function StockClientWrapper({ 
  initialProducts = [],
  categories = [],
  isReadOnlyAccess = false,
  readOnlyMessage = "Votre abonnement n'est plus actif. Vous pouvez consulter vos donnees, mais les actions sont desactivees.",
}: { 
  initialProducts?: StockProduct[],
  movements?: StockMovement[],
  categories?: StockCategory[]
  isReadOnlyAccess?: boolean,
  readOnlyMessage?: string
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [isModalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<EditableStockProduct | null>(null);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const filteredProducts = initialProducts.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.desc.toLowerCase().includes(query);

    const threshold = Number(p.alertThreshold ?? 5);
    const isRupture = p.count === 0;
    const isAlert = p.count > 0 && p.count <= threshold;
    const isInStock = p.count > threshold;

    const matchesStatus =
      selectedStatusFilter === "all" ||
      (selectedStatusFilter === "rupture" && isRupture) ||
      (selectedStatusFilter === "alerte" && isAlert) ||
      (selectedStatusFilter === "en_stock" && isInStock);

    const matchesCategory =
      selectedCategoryFilter === "all" ||
      p.categoryId === selectedCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const activeFiltersCount =
    Number(selectedStatusFilter !== "all") + Number(selectedCategoryFilter !== "all");

  const handleIncrement = async (productId: string) => {
    if (isReadOnlyAccess) return;
    setLoadingProductId(productId);
    await adjustStock(productId, 1);
    setLoadingProductId(null);
  };

  const handleDecrement = async (productId: string) => {
    if (isReadOnlyAccess) return;
    setLoadingProductId(productId);
    await adjustStock(productId, -1);
    setLoadingProductId(null);
  };

  const handleDelete = async (productId: string) => {
    if (isReadOnlyAccess) return;
    if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      setLoadingProductId(productId);
      await deleteProduct(productId);
      setLoadingProductId(null);
    }
  };

  const handleEdit = (product: StockProduct) => {
    if (isReadOnlyAccess) return;
    setProductToEdit({
      ...product,
      trackingType: product.trackingType === "UNIDOSE" ? "UNIDOSE" : "MULTIDOSE",
    });
    setModalOpen(true);
  };

  const totalValue = initialProducts.reduce((sum, p) => sum + (p.rawPrice * p.count), 0);
  const ruptures = initialProducts.filter(p => p.count === 0);
  const rupturesCount = ruptures.length;
  const alertesCount = initialProducts.filter(p => {
    const threshold = Number(p.alertThreshold ?? 5);
    return p.count > 0 && p.count <= threshold;
  }).length;
  const scrollToRuptures = () => {
    document.getElementById("rupture-products")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const resetFilters = () => {
    setSelectedStatusFilter("all");
    setSelectedCategoryFilter("all");
  };

  return (
    <main className={styles.layout}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mon Stock</h1>
        <button 
          className={styles.btnPrimary}
          onClick={() => {
            if (isReadOnlyAccess) return;
            setProductToEdit(null);
            setModalOpen(true);
          }}
          disabled={isReadOnlyAccess}
        >
          + Ajouter un produit
        </button>
      </div>

      {isReadOnlyAccess && (
        <div className={styles.statCard} role="alert">
          {readOnlyMessage}
        </div>
      )}

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
        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setFilterPanelOpen((open) => !open)}
          aria-expanded={filterPanelOpen}
        >
          Filtrer{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
        </button>
      </section>

      {filterPanelOpen && (
        <section className={styles.filterPanel}>
          <label className={styles.filterField}>
            <span>Statut</span>
            <select
              className={styles.filterSelect}
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="alerte">Alerte</option>
              <option value="rupture">Rupture</option>
              <option value="en_stock">En stock</option>
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Catégorie</span>
            <select
              className={styles.filterSelect}
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label || category.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.filterResetBtn}
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </section>
      )}

      {/* Stats Grids */}
      <section className={styles.statsGrid3}>
        <div className={`${styles.statCard} ${styles.statCardPink}`}>
          <div className={styles.statTitle}>Produits</div>
          <div className={styles.statValue}>{initialProducts.length}</div>
          <div className={styles.statSub}>RÉFÉRENCES ACTIVES</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Alertes</div>
          <div className={styles.statValue}>{alertesCount}</div>
          <div className={styles.statSub}>STOCK FAIBLE</div>
        </div>
        <div className={`${styles.statCard} ${styles.ruptureCard}`}>
          <div className={styles.statTitle}>Ruptures</div>
          <div className={styles.statValue}>{rupturesCount}</div>
          <div className={styles.statSub}>À COMMANDER</div>
          {ruptures.length > 0 ? (
            <>
              <div className={styles.ruptureList}>
                {ruptures.slice(0, 3).map(product => (
                  <div key={product.id} className={styles.ruptureItem}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.categoryLabel || product.tags[0] || "Produit"}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.ruptureRestockBtn}
                      onClick={() => handleIncrement(product.id)}
                      disabled={isReadOnlyAccess || loadingProductId === product.id}
                      title="Ajouter une unité"
                    >
                      {loadingProductId === product.id ? "..." : "+1"}
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={styles.ruptureActionBtn}
                onClick={scrollToRuptures}
              >
                Voir les produits en rupture
              </button>
            </>
          ) : (
            <div className={styles.ruptureEmpty}>Aucun produit en rupture.</div>
          )}
        </div>
      </section>

      {ruptures.length > 0 && (
        <section className={styles.rupturePanel} id="rupture-products">
          <div className={styles.rupturePanelHeader}>
            <div>
              <span className={styles.statSub}>Action stock</span>
              <h2>Produits en rupture</h2>
              <p>Ces références sont à recommander ou à remettre en stock.</p>
            </div>
          </div>
          <div className={styles.rupturePanelList}>
            {ruptures.map(product => (
              <div key={product.id} className={styles.rupturePanelItem}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.categoryLabel || product.tags[0] || "Produit"}</span>
                </div>
                <div className={styles.rupturePanelActions}>
                  <button type="button" onClick={() => handleEdit(product)} disabled={isReadOnlyAccess}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncrement(product.id)}
                    disabled={isReadOnlyAccess || loadingProductId === product.id}
                  >
                    {loadingProductId === product.id ? "Ajout..." : "Ajouter 1"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.statsGrid2}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Coût du stock</div>
          <div className={styles.statValue}>{totalValue.toFixed(2)} €</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Consommé ce mois</div>
          <div className={styles.statValue}>-- €</div>
        </div>
      </section>

      {/* Catalogue */}
      <h2 className={styles.sectionTitle}>Catalogue de produit</h2>
      <section className={styles.productsGrid}>
        {filteredProducts.map(prod => (
          <div key={prod.id} className={styles.productCard}>
            <div className={styles.prodHeader}>
              <div className={styles.prodIconBox}>
                {prod.categoryImage ? (
                  <Image
                    src={prod.categoryImage}
                    alt={prod.categoryLabel || "Categorie produit"}
                    width={70}
                    height={70}
                    className={styles.prodCategoryImage}
                  />
                ) : (
                  <svg width="24" height="32" viewBox="0 0 24 32" fill="none" stroke="var(--tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 8h10M9 8V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M6 8h12a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/>
                    <rect x="8" y="14" width="8" height="10" rx="1" fill="#FCD7D1" stroke="none"/>
                  </svg>
                )}
              </div>
              <div className={styles.prodInfo} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 className={styles.prodName}>{prod.name}</h3>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => handleEdit(prod)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Modifier"
                      disabled={isReadOnlyAccess}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(prod.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Supprimer"
                      disabled={isReadOnlyAccess}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className={styles.prodDesc}>{prod.desc}</p>
                <div className={styles.prodTags}>
                  {prod.tags.map((t: string, i: number) => (
                    <span key={i} className={styles.prodTag}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.prodDivider}></div>

            <div className={styles.prodCounter}>
              <button 
                className={styles.counterBtn} 
                onClick={() => handleDecrement(prod.id)}
                disabled={isReadOnlyAccess || loadingProductId === prod.id || prod.count <= 0}
              >
                -
              </button>
              <span className={styles.counterValue}>
                {loadingProductId === prod.id ? "..." : prod.count}
              </span>
              <button 
                className={styles.counterBtn} 
                onClick={() => handleIncrement(prod.id)}
                disabled={isReadOnlyAccess || loadingProductId === prod.id}
              >
                +
              </button>
            </div>

              <div className={styles.prodStatus}>
                <div className={`${styles.statusDot} ${styles[`dot${prod.statusColor}`]}`}></div>
                <span className={styles[`text${prod.statusColor}`]}>{prod.status}</span>
              </div>

              <div className={styles.prodFooter}>
                <span>Prix/u : {prod.price}</span>
                <span>Seuil : {prod.alertThreshold ?? 5}</span>
                <span>Expire le: {prod.expire}</span>
              </div>
            </div>
          ))}
      </section>

      {/* Mouvements */}
      {/* <h2 className={styles.sectionTitle}>Mouvement du stock</h2>
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
        {movements.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Aucun mouvement récent.
          </div>
        )}
      </section> */}

      <NewProductModal 
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        initialData={productToEdit}
        categories={categories}
      />
    </main>
  );
}

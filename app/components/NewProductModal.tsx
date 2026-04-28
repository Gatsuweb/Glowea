"use client";

import React, { useState, useEffect } from 'react';
import styles from './NewAppointmentModal.module.css'; // Reusing the same styles for consistency
import { createProduct, updateProduct, createProductCategory } from '../actions/stockActions';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  categories?: any[];
}

export default function NewProductModal({ isOpen, onClose, initialData = null, categories = [] }: NewProductModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('1');
  const [expireAt, setExpireAt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDesc(initialData.desc || '');
        setPrice(initialData.rawPrice?.toString() || '');
        setInitialStock(initialData.count?.toString() || '0');
        setCategoryId(initialData.categoryId || '');
        
        if (initialData.expireAt) {
          const date = new Date(initialData.expireAt);
          setExpireAt(date.toISOString().split('T')[0]);
        } else {
          setExpireAt('');
        }
      } else {
        setName('');
        setDesc('');
        setPrice('');
        setInitialStock('1');
        setExpireAt('');
        setCategoryId('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "NEW_CATEGORY") {
      setIsCreatingCategory(true);
    } else {
      setCategoryId(value);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Veuillez entrer un nom pour la catégorie");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await createProductCategory(newCategoryName);
      if (res.success && res.category) {
        setCategoryId(res.category.id);
        setIsCreatingCategory(false);
        setNewCategoryName('');
      } else {
        alert(res.error || "Erreur lors de la création de la catégorie");
      }
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Veuillez entrer le nom du produit");
      return;
    }

    setIsSubmitting(true);

    try {
      if (initialData) {
        await updateProduct(initialData.id, {
          name,
          desc,
          price: parseFloat(price) || 0,
          categoryId: categoryId || null,
        });
      } else {
        await createProduct({
          name,
          desc,
          price: parseFloat(price) || 0,
          initialStock: parseInt(initialStock, 10) || 0,
          expireAt: expireAt ? new Date(expireAt) : null,
          categoryId: categoryId || null,
        });
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
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className={styles.title}>{initialData ? 'Modifier le Produit' : 'Nouveau Produit'}</h1>
        </div>

        {/* DETAILS */}
        <div className={styles.sectionPink}>
          <div className={styles.sectionTitle}>DÉTAILS DU PRODUIT</div>
          
          <select 
            className={styles.notesInput} 
            style={{ marginBottom: '10px', height: '40px', cursor: 'pointer' }}
            value={categoryId}
            onChange={handleCategoryChange}
          >
            <option value="">Sélectionner une catégorie...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="NEW_CATEGORY" style={{ fontWeight: 'bold', color: '#8B4B54' }}>+ Créer une nouvelle catégorie</option>
          </select>

          <input 
            type="text" 
            className={styles.notesInput} 
            placeholder="Nom du produit (ex: Primer, Colle...)" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: '10px' }}
          />
          <textarea 
            className={styles.notesInput} 
            placeholder="Description ou tags (ex: Adhérence pour cils)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          ></textarea>
        </div>

        {/* PRICING & STOCK */}
        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>PRIX & STOCK</div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Prix Unitaire (€)</label>
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
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Stock Initial</label>
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
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Date d'expiration (optionnel)</label>
              <input 
                type="date" 
                className={styles.notesInput} 
                value={expireAt}
                onChange={(e) => setExpireAt(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* VALIDATION */}
        <button 
          className={styles.submitBtn} 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>

      </div>

      {/* Modal Nouvelle Catégorie par dessus */}
      {isCreatingCategory && (
        <div className={styles.modalOverlay} style={{ zIndex: 1001 }} onClick={() => setIsCreatingCategory(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '400px', minHeight: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <button className={styles.backBtn} onClick={() => setIsCreatingCategory(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <h1 className={styles.title}>Nouvelle Catégorie</h1>
            </div>
            
            <div className={styles.sectionPink}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Nom de la catégorie</label>
              <input 
                type="text" 
                className={styles.notesInput} 
                placeholder="Ex: Cils, Ongles, Consommables..." 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>

            <button 
              className={styles.submitBtn} 
              onClick={handleCreateCategory}
              disabled={isSubmitting || !newCategoryName.trim()}
            >
              {isSubmitting ? 'Création...' : 'Créer la catégorie'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
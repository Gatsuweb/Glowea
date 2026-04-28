"use client";

import React, { useState, useEffect } from "react";
import styles from "./profil.module.css";
import { getServices, createService, deleteService, updateService } from "../../actions/serviceActions";

export default function PrestationsTab() {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({ name: "", durationMin: 60, price: "", color: "#FF69B4" });

  const loadServices = async () => {
    setIsLoading(true);
    const res = await getServices();
    if (res.success && res.data) {
      setServices(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleAdd = async () => {
    if (!newService.name.trim()) return;
    
    const res = await createService({
      name: newService.name,
      durationMin: Number(newService.durationMin),
      price: newService.price ? Number(newService.price) : undefined,
      color: newService.color
    });

    if (res.success) {
      setIsAdding(false);
      setNewService({ name: "", durationMin: 60, price: "", color: "#FF69B4" });
      loadServices();
    } else {
      alert(res.error || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette prestation ?")) {
      const res = await deleteService(id);
      if (res.success) {
        loadServices();
      } else {
        alert(res.error || "Erreur lors de la suppression");
      }
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Mes Prestations</h2>
        <button className={styles.btnEdit} onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {isAdding && (
        <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#fafafa" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "10px", color: "#333" }}>Nouvelle prestation</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label className={styles.label}>Nom de la prestation</label>
              <input 
                type="text" 
                className={styles.input} 
                value={newService.name} 
                onChange={(e) => setNewService({...newService, name: e.target.value})} 
                placeholder="Ex: Pose Complète Cils"
              />
            </div>
            <div style={{ width: "100px" }}>
              <label className={styles.label}>Durée (min)</label>
              <input 
                type="number" 
                className={styles.input} 
                value={newService.durationMin} 
                onChange={(e) => setNewService({...newService, durationMin: Number(e.target.value)})} 
              />
            </div>
            <div style={{ width: "100px" }}>
              <label className={styles.label}>Prix (€)</label>
              <input 
                type="number" 
                className={styles.input} 
                value={newService.price} 
                onChange={(e) => setNewService({...newService, price: e.target.value})} 
                placeholder="Ex: 50"
              />
            </div>
            <div style={{ width: "80px" }}>
              <label className={styles.label}>Couleur</label>
              <input 
                type="color" 
                style={{ width: "100%", height: "38px", padding: "2px", border: "1px solid #ddd", borderRadius: "4px" }} 
                value={newService.color} 
                onChange={(e) => setNewService({...newService, color: e.target.value})} 
              />
            </div>
            <button className={styles.btnSave} onClick={handleAdd} style={{ height: "38px" }}>Sauvegarder</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={{ color: "#888" }}>Chargement des prestations...</p>
      ) : services.length === 0 ? (
        <p style={{ color: "#888" }}>Aucune prestation enregistrée. Ajoutez-en une pour commencer.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {services.map(service => (
            <div key={service.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: service.color || "#FF69B4" }}></div>
                <div>
                  <div style={{ fontWeight: "600", color: "#333" }}>{service.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#777" }}>{service.durationMin} min • {service.price ? `${service.price} €` : "Prix non défini"}</div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(service.id)}
                style={{ background: "none", border: "none", color: "#ff4d4f", cursor: "pointer", padding: "5px" }}
                title="Supprimer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
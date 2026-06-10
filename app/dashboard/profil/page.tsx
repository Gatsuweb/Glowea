"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import styles from "./profil.module.css";
import PromoModal, { type EditableMessageTemplate } from "../../components/PromoModal";
import PrestationsTab from "./PrestationsTab";
import { getProfileData, updateProfileData, type ProfileData } from "../../actions/profileActions";

const planDetails: Record<ProfileData["subscriptionPlan"], {
  name: string;
  price: string;
  description: string;
  features: string[];
}> = {
  FREE: {
    name: "Gratuit",
    price: "0 EUR",
    description: "Votre espace est prêt. Choisissez une formule pour utiliser Glowea au quotidien.",
    features: ["Compte Glowea", "Preparation de l'espace"],
  },
  ESSENTIAL: {
    name: "Essentiel",
    price: "39,90 EUR",
    description: "La formule simple pour organiser votre activite, suivre vos clientes et garder un historique complet.",
    features: ["Agenda et fiches clientes", "Sessions techniques", "Stock produits", "Comptabilite automatique", "Historique complet"],
  },
  PRO: {
    name: "Pro",
    price: "59,90 EUR",
    description: "La formule complete pour automatiser vos rappels, reduire les absences et developper votre image pro.",
    features: ["Tout Essentiel", "Rappels SMS automatiques", "Emails automatiques", "Acomptes et anti no-show", "Mini-site professionnel", "Reservation en ligne"],
  },
  PREMIUM: {
    name: "Premium",
    price: "Sur mesure",
    description: "Une formule avancee pour les besoins au-dela de l'offre Pro.",
    features: ["Tout Pro", "Accompagnement avance", "Fonctionnalites premium"],
  },
};

const statusLabels: Record<ProfileData["subscription"]["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  ACTIVE: { label: "Actif", tone: "success" },
  TRIALING: { label: "Essai gratuit", tone: "warning" },
  PAST_DUE: { label: "Paiement en attente", tone: "danger" },
  CANCELED: { label: "Resilie", tone: "danger" },
  INCOMPLETE: { label: "Paiement en attente", tone: "warning" },
  PAUSED: { label: "Suspendu", tone: "warning" },
};

function formatDate(value: string | null) {
  if (!value) return "Non renseignee";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export default function ProfilPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("compte");
  const [isPromoModalOpen, setPromoModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EditableMessageTemplate | null>(null);
  const [templates, setTemplates] = useState<EditableMessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    salonName: "",
    siret: "",
    address: "",
    subscriptionPlan: "FREE",
    canUseAutomaticSmsReminders: false,
    smsRemindersEnabled: false,
    smsReminderDelayHours: 24,
    subscription: {
      plan: "FREE",
      status: "CANCELED",
      provider: null,
      trialEndsAt: null,
      trialDaysLeft: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      canUseApp: false,
      canUseProFeatures: false,
    },
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSmsReminders, setIsSavingSmsReminders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoadingProfile(true);
      setError(null);
      try {
        const res = await getProfileData();
        if (!isMounted) return;
        if (res.success) {
          setProfileData(res.data);
        } else {
          setError(res.error || "Erreur lors de la récupération du profil");
        }
      } catch {
        if (!isMounted) return;
        setError("Une erreur inattendue est survenue");
      } finally {
        if (!isMounted) return;
        setIsLoadingProfile(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const response = await fetch("/api/campaigns/templates");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Impossible de charger les templates");
      }

      setTemplates(data.templates || []);
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : "Impossible de charger les templates");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (activeTab === "templates") {
      void loadTemplates();
    }
  }, [activeTab]);

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setPromoModalOpen(true);
  };

  const openEditTemplateModal = (template: EditableMessageTemplate) => {
    setEditingTemplate(template);
    setPromoModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const canEdit = !isLoadingProfile && !isSaving;
  const canToggleSmsReminders = (profileData.canUseAutomaticSmsReminders || profileData.smsRemindersEnabled) && !isLoadingProfile && !isSavingSmsReminders;
  const openPricing = () => router.push("/pricing");

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await updateProfileData(profileData);
      if (res.success) {
        setIsEditing(false);
        setSuccessMessage("Profil mis à jour");
      } else {
        setError(res.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      setError("Une erreur inattendue est survenue");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSmsReminderToggle = async () => {
    if (isSavingSmsReminders) return;

    const nextEnabled = !profileData.smsRemindersEnabled;
    setIsSavingSmsReminders(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings/sms-reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Impossible de mettre a jour les rappels SMS");
        return;
      }

      setProfileData((prev) => ({
        ...prev,
        subscriptionPlan: data.subscriptionPlan || prev.subscriptionPlan,
        canUseAutomaticSmsReminders: Boolean(data.canUseAutomaticSmsReminders),
        smsRemindersEnabled: Boolean(data.smsRemindersEnabled),
        smsReminderDelayHours: Number(data.smsReminderDelayHours || 24),
      }));
      setSuccessMessage(data.smsRemindersEnabled ? "Rappels SMS actives" : "Rappels SMS desactives");
    } catch {
      setError("Une erreur inattendue est survenue");
    } finally {
      setIsSavingSmsReminders(false);
    }
  };

  const displayName = useMemo(() => {
    const full = `${profileData.firstName} ${profileData.lastName}`.trim();
    if (full) return full;
    return "Mon compte";
  }, [profileData.firstName, profileData.lastName]);

  const currentPlan = planDetails[profileData.subscription.plan] || planDetails.FREE;
  const currentStatus = statusLabels[profileData.subscription.status] || statusLabels.CANCELED;
  const showTrialInfo = profileData.subscription.status === "TRIALING";
  const badgeClassName =
    currentStatus.tone === "success"
      ? styles.badgeGreen
      : currentStatus.tone === "danger"
        ? styles.badgeRed
        : styles.badgeAmber;

  const navItems = [
    { id: "compte", label: "Compte", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    { id: "prestations", label: "Prestations", icon: "M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z M14 3v5h5 M16 13H8 M16 17H8 M10 9H8" },
    { id: "page-publique", label: "Page publique", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" },
    { id: "abonnements", label: "Abonnements", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
    { id: "paiements", label: "Paiements", icon: "M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z M21 10H3 M21 16H3" },
    { id: "notifications", label: "Notifications", icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" },
    { id: "templates", label: "Templates Mail", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
  ];

  const handleNavItemClick = (itemId: string) => {
    if (itemId === "page-publique") {
      router.push(profileData.subscription.canUseProFeatures ? "/dashboard/page-publique" : "/pricing");
      return;
    }

    if (itemId === "templates") {
      setActiveTab("templates");
      return;
    }

    setActiveTab(itemId);
  };

  return (
    <main className={styles.layout}>
      <h1 className={styles.pageTitle}>Mon Profil</h1>

      <div className={styles.contentWrapper}>
        
        {/* =========================================
            SIDEBAR (Menu)
            ========================================= */}
        <aside className={styles.sidebar}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
              </svg>
            </div>
            <h2 className={styles.userName}>{displayName}</h2>
          </div>

          <nav className={styles.navMenu}>
            {navItems.map((item, index) => (
              <button 
                key={index} 
                className={`${styles.navItem} ${item.id === activeTab ? styles.navItemActive : ''}`}
                onClick={() => handleNavItemClick(item.id)}
              >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <button className={styles.btnDisconnect}>Se déconnecter</button>
            <div className={styles.footerLinks}>
              <a className={styles.footerLink}>Paramètres</a>
              <a className={styles.footerLink}>Confidentialité</a>
            </div>
          </div>
        </aside>

        {/* =========================================
            MAIN CONTENT (Informations)
            ========================================= */}
        <div className={styles.mainContent}>
          
          {activeTab === 'compte' && (
            <>
              {(error || successMessage) && (
                <div className={styles.statusRow}>
                  {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
                  {successMessage && <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>{successMessage}</div>}
                </div>
              )}
              {/* Informations Personnelles */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Informations Personnelles</h2>
                  {isEditing ? (
                    <button className={styles.btnSave} onClick={handleSave} disabled={!canEdit}>
                      {isSaving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  ) : (
                    <button className={styles.btnEdit} onClick={() => setIsEditing(true)} disabled={!canEdit}>
                      Modifier
                    </button>
                  )}
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Prénom</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      className={styles.input} 
                      value={profileData.firstName} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nom</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      className={styles.input} 
                      value={profileData.lastName} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Adresse Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      className={styles.input} 
                      value={profileData.email} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Numéro de téléphone</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      className={styles.input} 
                      value={profileData.phone} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                </div>
              </section>

              {/* Informations Professionnelles */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Informations de l&apos;Entreprise</h2>
                  {isEditing ? (
                    <button className={styles.btnSave} onClick={handleSave} disabled={!canEdit}>
                      {isSaving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  ) : (
                    <button className={styles.btnEdit} onClick={() => setIsEditing(true)} disabled={!canEdit}>
                      Modifier
                    </button>
                  )}
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Nom du Salon / Entreprise</label>
                    <input 
                      type="text" 
                      name="salonName" 
                      className={styles.input} 
                      value={profileData.salonName} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Numéro SIRET (Obligatoire pour facturation)</label>
                    <input 
                      type="text" 
                      name="siret" 
                      className={styles.input} 
                      value={profileData.siret} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Adresse de domiciliation</label>
                    <input 
                      type="text" 
                      name="address" 
                      className={styles.input} 
                      value={profileData.address} 
                      onChange={handleChange} 
                      disabled={!isEditing || !canEdit} 
                    />
                  </div>
                </div>
              </section>

              {/* Documents Légaux & Conformité */}
              <section className={`${styles.card} ${styles.legalCard}`}>
                <div className={`${styles.cardHeader} ${styles.legalCardHeader}`}>
                  <h2 className={styles.cardTitle}>Documents & Conformité Légale</h2>
                </div>
                
                <p className={styles.legalText}>
                  Gérez ici les documents légaux nécessaires à votre activité de technicienne (cils/ongles). Ces informations sont obligatoires pour générer des factures conformes à la législation française et européenne (RGPD).
                </p>

                <div className={styles.legalList}>
                  <div className={styles.docRow}>
                    <div className={styles.docInfo}>
                      <span className={styles.docName}>Conditions Générales de Vente (CGV)</span>
                      <span className={styles.docStatus}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Validées et à jour
                      </span>
                    </div>
                    <button className={styles.btnDownload}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Télécharger
                    </button>
                  </div>
                  
                  <div className={styles.docRow}>
                    <div className={styles.docInfo}>
                      <span className={styles.docName}>Politique de Confidentialité (RGPD)</span>
                      <span className={styles.docStatus}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Validée
                      </span>
                    </div>
                    <button className={styles.btnDownload}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Télécharger
                    </button>
                  </div>

                  <div className={styles.docRow}>
                    <div className={styles.docInfo}>
                      <span className={styles.docName}>Attestation d&apos;Assurance Responsabilité Civile Pro (RC Pro)</span>
                      <span className={`${styles.docStatus} ${styles.docStatusRed}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        Manquante - Veuillez l&apos;importer
                      </span>
                    </div>
                    <button className={styles.btnDownload}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Importer PDF
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'prestations' && (
            <PrestationsTab />
          )}

          {activeTab === 'agenda' && (
            <section className={`${styles.card} ${styles.emptyFeatureCard}`}>
              <svg className={styles.emptyFeatureIcon} width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <h2 className={styles.cardTitle}>Agenda & Réservations</h2>
              <p className={styles.emptyFeatureText}>
                Cette fonctionnalité est en cours de développement et sera disponible très prochainement !
              </p>
            </section>
          )}

          {activeTab === 'abonnements' && (
            <>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Mon abonnement</h2>
                </div>
                
                <div className={styles.planBox}>
                  <div className={styles.planHeader}>
                    <div>
                      <h3 className={styles.planTitle}>Glowea {currentPlan.name}</h3>
                      <span className={badgeClassName}>{currentStatus.label}</span>
                    </div>
                    <div className={styles.planPrice}>
                      {currentPlan.price}
                      <span>{currentPlan.price === "Sur mesure" ? "" : "/mois"}</span>
                    </div>
                  </div>

                  <p className={styles.planDesc}>{currentPlan.description}</p>

                  {showTrialInfo && (
                    <div className={styles.trialNotice}>
                      <div>
                        <span>Essai gratuit</span>
                        <strong>{profileData.subscription.trialDaysLeft} jour{profileData.subscription.trialDaysLeft > 1 ? "s" : ""} restant{profileData.subscription.trialDaysLeft > 1 ? "s" : ""}</strong>
                      </div>
                      <p>Votre essai se termine le {formatDate(profileData.subscription.trialEndsAt)}.</p>
                    </div>
                  )}

                  <div className={styles.subscriptionContentGrid}>
                    <section className={styles.subscriptionPanel}>
                      <h4>Votre formule inclut</h4>
                      <ul className={styles.subscriptionIncludedList}>
                        {currentPlan.features.map((feature) => (
                          <li key={feature}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className={styles.subscriptionPanel}>
                      <h4>Acces</h4>
                      <div className={styles.accessList}>
                        <div className={styles.accessRow}>
                          <span>Application</span>
                          <strong className={profileData.subscription.canUseApp ? styles.accessOpen : styles.accessClosed}>
                            {profileData.subscription.canUseApp ? "Ouvert" : "Bloque"}
                          </strong>
                        </div>
                        <div className={styles.accessRow}>
                          <span>Fonctionnalites Pro</span>
                          <strong className={profileData.subscription.canUseProFeatures ? styles.accessOpen : styles.accessMuted}>
                            {profileData.subscription.canUseProFeatures ? "Disponibles" : "Non incluses"}
                          </strong>
                        </div>
                      </div>
                    </section>
                  </div>

                  {profileData.subscription.cancelAtPeriodEnd && (
                    <div className={styles.subscriptionNotice}>
                      Votre abonnement est programme pour s&apos;arreter a la fin de la periode en cours.
                    </div>
                  )}

                  <div className={styles.planActions}>
                    <a className={styles.btnEdit} href="/pricing">Changer de forfait</a>
                    <a className={styles.btnSecondary} href="mailto:support@glowea.fr">Contacter le support</a>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'paiements' && (
            <>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Moyen de Paiement</h2>
                </div>
                
                <div className={styles.paymentMethodRow}>
                  <div className={styles.paymentLeft}>
                    <div className={styles.paymentIcon}>
                      <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="20" rx="4" fill="#1434CB"/>
                        <path d="M12.5 13.5L14.5 6.5H16.5L14.5 13.5H12.5ZM21.5 6.5L20.1 11.2L19.5 6.5H17.5L18.8 13.5H20.8L22.5 6.5H21.5ZM10.5 6.5C9.5 6.5 8.8 7.1 8.8 7.8C8.8 8.9 10.4 9.1 10.4 9.8C10.4 10.1 10.1 10.4 9.6 10.4C9 10.4 8.5 10.1 8.2 9.8L7.8 11.5C8.3 11.8 9.1 12 9.8 12C11 12 11.8 11.4 11.8 10.6C11.8 9.4 10.2 9.2 10.2 8.6C10.2 8.3 10.5 8 11 8C11.4 8 11.9 8.2 12.2 8.4L12.5 6.8C12 6.6 11.3 6.5 10.5 6.5ZM26.8 6.5H25.2C24.8 6.5 24.5 6.7 24.3 7.1L21.5 13.5H23.5L23.9 12.4H26.3L26.5 13.5H28.5L26.8 6.5ZM24.5 10.8L25.3 8.3L25.8 10.8H24.5Z" fill="white"/>
                      </svg>
                    </div>
                    <div className={styles.paymentDetails}>
                      <h4>Visa se terminant par 4242</h4>
                      <p>Date d&apos;expiration : 12/2026</p>
                    </div>
                  </div>
                  <button className={styles.btnEdit}>Mettre à jour</button>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Historique de facturation</h2>
                </div>
                
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Facture</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>14 Mars 2026</td>
                        <td>29,00 €</td>
                        <td><span className={styles.badgeGreen}>Payé</span></td>
                        <td>
                          <button className={styles.btnDownload}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            PDF
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>14 Février 2026</td>
                        <td>29,00 €</td>
                        <td><span className={styles.badgeGreen}>Payé</span></td>
                        <td>
                          <button className={styles.btnDownload}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            PDF
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === 'notifications' && (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Préférences de Notifications</h2>
              </div>
              
              {(error || successMessage) && (
                <div className={styles.statusRow}>
                  {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
                  {successMessage && <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>{successMessage}</div>}
                </div>
              )}

              <div className={styles.settingsRow}>
                <div className={styles.settingsInfo}>
                  <div className={styles.settingsTitleRow}>
                    <h4>Rappels SMS automatiques</h4>
                    {!profileData.canUseAutomaticSmsReminders && (
                      <span className={styles.badgePro}>Pro</span>
                    )}
                  </div>
                  <p>Envoyez automatiquement un SMS a vos clientes {profileData.smsReminderDelayHours}h avant leur rendez-vous.</p>
                  {!profileData.canUseAutomaticSmsReminders && (
                    <p className={styles.featureLockedText}>Disponible avec l&apos;abonnement Pro.</p>
                  )}
                </div>
                <div className={styles.settingActions}>
                  {!profileData.canUseAutomaticSmsReminders && (
                    <button className={styles.btnEdit} type="button" onClick={openPricing}>
                      Passer au Pro
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={handleSmsReminderToggle}
                    disabled={!canToggleSmsReminders}
                    aria-pressed={profileData.smsRemindersEnabled}
                    aria-label="Activer ou desactiver les rappels SMS automatiques"
                  >
                    <span className={profileData.smsRemindersEnabled ? styles.toggleActive : styles.toggleInactive}>
                      <span className={styles.toggleThumb}></span>
                    </span>
                    {isSavingSmsReminders && <span className={styles.savingText}>Sauvegarde...</span>}
                  </button>
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsInfo}>
                  <h4>Nouveau rendez-vous</h4>
                  <p>Soyez alertée par e-mail lorsqu&apos;une cliente réserve une prestation en ligne.</p>
                </div>
                <div className={styles.toggleWrapper}>
                  <div className={styles.toggleActive}>
                    <div className={styles.toggleThumb}></div>
                  </div>
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsInfo}>
                  <h4>Annulation / Modification</h4>
                  <p>Recevez un e-mail immédiat si une cliente annule ou déplace son créneau.</p>
                </div>
                <div className={styles.toggleWrapper}>
                  <div className={styles.toggleActive}>
                    <div className={styles.toggleThumb}></div>
                  </div>
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsInfo}>
                  <h4>Alerte de Stock</h4>
                  <p>Soyez notifiée quand un produit (colle, cils...) passe en seuil critique.</p>
                </div>
                <div className={styles.toggleWrapper}>
                  <div className={styles.toggleActive}>
                    <div className={styles.toggleThumb}></div>
                  </div>
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsInfo}>
                  <h4>Rapport Quotidien</h4>
                  <p>Recevez chaque soir le récapitulatif de votre chiffre d&apos;affaires et de vos rendez-vous du lendemain.</p>
                </div>
                <div className={styles.toggleWrapper}>
                  <div className={styles.toggleInactive}>
                    <div className={styles.toggleThumb}></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'templates' && (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Templates Mail</h2>
              </div>
              
              <p className={`${styles.legalText} ${styles.templatesIntro}`}>
                Personnalisez les templates SMS et email utilisés pour les campagnes. Ces modèles sont réutilisables dans l&apos;écran Envoyer une campagne.
              </p>

              <div className={styles.templateList}>
                <div className={styles.newTemplateBox} onClick={openCreateTemplateModal}>
                  <div className={styles.newTemplateIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </div>
                  <h4 className={styles.newTemplateText}>Créer un nouveau template</h4>
                </div>

                {isLoadingTemplates && (
                  <div className={styles.templateItem}>
                    <div className={styles.settingsInfo}>
                      <p>Chargement des templates...</p>
                    </div>
                  </div>
                )}

                {templatesError && (
                  <div className={styles.templateItem}>
                    <div className={styles.settingsInfo}>
                      <p>{templatesError}</p>
                    </div>
                  </div>
                )}

                {!isLoadingTemplates && !templatesError && templates.map((template) => (
                  <div className={styles.templateItem} key={template.id}>
                    <div className={styles.templateLeft}>
                      <div className={styles.templateIcon}>
                        {template.channel === "EMAIL" ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        )}
                      </div>
                      <div className={styles.settingsInfo}>
                        <h4>{template.name}</h4>
                        <p>
                          {template.channel} {template.isSystem ? "systeme" : "personnalise"} - {template.body.slice(0, 120)}
                          {template.body.length > 120 ? "..." : ""}
                        </p>
                      </div>
                    </div>
                    <button className={styles.btnEdit} onClick={() => openEditTemplateModal(template)} type="button">Editer</button>
                  </div>
                ))}

                {!isLoadingTemplates && !templatesError && templates.length === 0 && (
                  <div className={styles.templateItem}>
                    <div className={styles.settingsInfo}>
                      <p>Aucun template pour le moment.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Modale de Création de Template */}
      <PromoModal 
        isOpen={isPromoModalOpen} 
        onClose={() => setPromoModalOpen(false)}
        template={editingTemplate}
        onSaved={loadTemplates}
      />
    </main>
  );
}

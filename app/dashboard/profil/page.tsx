"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import styles from "./profil.module.css";
import PromoModal, { type EditableMessageTemplate } from "../../components/PromoModal";
import PrestationsTab from "./PrestationsTab";
import {
  getProfileData,
  updateProfileData,
  type ProfileData,
  type ProfileNotificationPreferences,
} from "../../actions/profileActions";

const planDetails: Record<ProfileData["subscriptionPlan"], {
  name: string;
  price: string;
  description: string;
  features: string[];
}> = {
  FREE: {
    name: "Gratuit",
    price: "0 EUR",
    description: "Votre espace est pret. Choisissez une formule pour utiliser Glowea au quotidien.",
    features: ["Compte Glowea", "Preparation de l'espace"],
  },
  ESSENTIAL: {
    name: "Essentiel",
    price: "39,90 EUR",
    description: "La formule simple pour organiser votre activité, suivre vos clientes et garder un historique complet.",
    features: ["Agenda et fiches clientes", "Sessions techniques", "Stock produits", "Comptabilité automatique", "Historique complet"],
  },
  PRO: {
    name: "Pro",
    price: "59,90 EUR",
    description: "La formule complète pour automatiser vos rappels, réduire les absences et développer votre image pro.",
    features: ["Tout Essentiel", "Rappels SMS automatiques", "Emails automatiques", "Acomptes et anti no-show", "Mini-site professionnel", "Réservation en ligne"],
  },
  PREMIUM: {
    name: "Premium",
    price: "Sur mesure",
    description: "Une formule avancée pour les besoins au-dela de l'offre Pro.",
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

// Gardee pour une V2: la section existe encore dans le code mais n'est pas affichee.
const showLegalDocumentsSection = false;

function formatDate(value: string | null) {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

type NotificationSettingKey = keyof ProfileNotificationPreferences;
type PushStatus = "checking" | "unsupported" | "permission-denied" | "inactive" | "active";
type BillingPaymentMethod = {
  type: string;
  brand: string;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};
type BillingInvoice = {
  id: string;
  created: string;
  amountPaid: number;
  amountDue: number;
  total: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
};
type BillingSummary = {
  hasStripeCustomer: boolean;
  paymentMethod: BillingPaymentMethod | null;
  invoices: BillingInvoice[];
};

const defaultNotificationPreferences: ProfileNotificationPreferences = {
  pushEnabled: true,
  stockLowEnabled: true,
  loyalClientThanksEnabled: true,
  onlineBookingEnabled: true,
  paymentReceivedEnabled: true,
  publicBookingChangeEnabled: true,
  automaticFollowUpEnabled: true,
};

const notificationSettingGroups: Array<{
  title: string;
  items: Array<{
    key: Exclude<NotificationSettingKey, "pushEnabled">;
    title: string;
    description: string;
    pro?: boolean;
  }>;
}> = [
  {
    title: "Essentiel",
    items: [
      {
        key: "stockLowEnabled",
        title: "Stock faible",
        description: "Soyez notifiée quand un produit passe sous son seuil critique.",
      },
      {
        key: "loyalClientThanksEnabled",
        title: "Cliente fidèle a remercier",
        description: "Recevez une suggestion lorsqu'une cliente est venue plusieurs fois, pour penser a la remercier.",
      },
    ],
  },
  {
    title: "Pro uniquement",
    items: [
      {
        key: "onlineBookingEnabled",
        title: "Nouvelle réservation en ligne",
        description: "Soyez alertée lorsqu'une cliente réserve depuis votre page publique.",
        pro: true,
      },
      {
        key: "paymentReceivedEnabled",
        title: "Paiement reçu",
        description: "Recevez une notification lorsqu'un paiement en ligne est confirme.",
        pro: true,
      },
      {
        key: "automaticFollowUpEnabled",
        title: "Relances automatiques",
        description: "Activez les notifications liées aux relances automatiques.",
        pro: true,
      },
    ],
  },
];

const navItemIds = new Set(["compte", "prestations", "page-publique", "abonnements", "paiements", "notifications", "templates"]);

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function canUsePushNotifications() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

function formatCurrencyFromCents(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatCardBrand(brand: string) {
  const labels: Record<string, string> = {
    amex: "American Express",
    mastercard: "Mastercard",
    visa: "Visa",
  };

  return labels[brand] || brand;
}

function getInvoiceStatus(status: string | null) {
  switch (status) {
    case "paid":
      return { label: "Payee", className: styles.badgeGreen };
    case "open":
      return { label: "A regler", className: styles.badgeAmber };
    case "draft":
      return { label: "Brouillon", className: styles.badgeAmber };
    case "void":
      return { label: "Annulee", className: styles.badgeRed };
    case "uncollectible":
      return { label: "Impayee", className: styles.badgeRed };
    default:
      return { label: "En cours", className: styles.badgeAmber };
  }
}

async function getCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

async function createPushSubscription() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("Cle publique VAPID manquante");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existingSubscription = await registration.pushManager.getSubscription();
  return existingSubscription || registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export default function ProfilPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("compte");
  const [isPromoModalOpen, setPromoModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EditableMessageTemplate | null>(null);
  const [templates, setTemplates] = useState<EditableMessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
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
    notificationPreferences: defaultNotificationPreferences,
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
  const [savingNotificationKey, setSavingNotificationKey] = useState<NotificationSettingKey | null>(null);
  const [isSavingPush, setIsSavingPush] = useState(false);
  const [isOpeningCustomerPortal, setIsOpeningCustomerPortal] = useState(false);
  const [isOpeningPlanChangePortal, setIsOpeningPlanChangePortal] = useState(false);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
  const [isOpeningPaymentMethodPortal, setIsOpeningPaymentMethodPortal] = useState(false);
  const [isReactivatingSubscription, setIsReactivatingSubscription] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");
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

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && navItemIds.has(tab)) {
      setActiveTab(tab);
    }
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

  const loadBillingSummary = async () => {
    setIsLoadingBilling(true);
    setBillingError(null);

    try {
      const response = await fetch("/api/stripe/billing-summary");
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setBillingError(data?.error || "Impossible de charger les informations de paiement.");
        return;
      }

      setBillingSummary({
        hasStripeCustomer: Boolean(data.hasStripeCustomer),
        paymentMethod: data.paymentMethod || null,
        invoices: Array.isArray(data.invoices) ? data.invoices : [],
      });
    } catch {
      setBillingError("Impossible de charger les informations de paiement.");
    } finally {
      setIsLoadingBilling(false);
    }
  };

  useEffect(() => {
    if (activeTab === "paiements") {
      void loadBillingSummary();
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    async function checkPushStatus() {
      if (isLoadingProfile) return;

      if (!canUsePushNotifications()) {
        if (isMounted) setPushStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (isMounted) setPushStatus("permission-denied");
        return;
      }

      if (Notification.permission !== "granted") {
        if (isMounted) setPushStatus("inactive");
        return;
      }

      try {
        const subscription = await getCurrentPushSubscription();
        const isActive = Boolean(subscription && profileData.notificationPreferences.pushEnabled);
        if (isMounted) setPushStatus(isActive ? "active" : "inactive");
      } catch {
        if (isMounted) setPushStatus("inactive");
      }
    }

    void checkPushStatus();

    return () => {
      isMounted = false;
    };
  }, [isLoadingProfile, profileData.notificationPreferences.pushEnabled]);

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setPromoModalOpen(true);
  };

  const openEditTemplateModal = (template: EditableMessageTemplate) => {
    setEditingTemplate(template);
    setPromoModalOpen(true);
  };

  const handleDeleteTemplate = async (template: EditableMessageTemplate) => {
    if (template.isSystem || deletingTemplateId) return;

    const confirmed = window.confirm(`Supprimer le template "${template.name}" ?`);
    if (!confirmed) return;

    setDeletingTemplateId(template.id);
    setTemplatesError(null);
    try {
      const response = await fetch("/api/campaigns/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: template.id }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Impossible de supprimer le template");
      }

      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : "Impossible de supprimer le template");
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const canEdit = !isLoadingProfile && !isSaving;
  const canToggleSmsReminders = (profileData.canUseAutomaticSmsReminders || profileData.smsRemindersEnabled) && !isLoadingProfile && !isSavingSmsReminders;
  const openPricing = () => router.push("/pricing");

  const refreshProfileData = async () => {
    const res = await getProfileData();
    if (res.success) {
      setProfileData(res.data);
      return true;
    }

    setError(res.error || "Erreur lors de la récupération du profil");
    return false;
  };

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

  const applyNotificationPreferences = (preferences: ProfileNotificationPreferences) => {
    setProfileData((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        ...preferences,
      },
    }));
  };

  const handleNotificationToggle = async (key: Exclude<NotificationSettingKey, "pushEnabled">, isProFeature: boolean) => {
    if (savingNotificationKey) return;

    if (isProFeature && !profileData.subscription.canUseProFeatures) {
      openPricing();
      return;
    }

    const nextEnabled = !profileData.notificationPreferences[key];
    setSavingNotificationKey(key);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: nextEnabled }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "PLAN_REQUIRED") {
          openPricing();
          return;
        }
        setError(data.error || "Impossible de mettre a jour la preference");
        return;
      }

      applyNotificationPreferences(data.notificationPreferences);
      setSuccessMessage("Preference de notification mise a jour");
    } catch {
      setError("Une erreur inattendue est survenue");
    } finally {
      setSavingNotificationKey(null);
    }
  };

  const handleEnablePush = async () => {
    if (isSavingPush) return;

    if (!canUsePushNotifications()) {
      setPushStatus("unsupported");
      setError("Les notifications push ne sont pas disponibles sur ce navigateur.");
      return;
    }

    setIsSavingPush(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "permission-denied" : "inactive");
        setError("Permission de notifications refusee.");
        return;
      }

      const subscription = await createPushSubscription();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Impossible d'activer les notifications push");
        return;
      }

      applyNotificationPreferences({ ...profileData.notificationPreferences, pushEnabled: true });
      setPushStatus("active");
      setSuccessMessage("Notifications push activees");
    } catch {
      setError("Impossible d'activer les notifications push");
      setPushStatus("inactive");
    } finally {
      setIsSavingPush(false);
    }
  };

  const handleDisablePush = async () => {
    if (isSavingPush) return;

    setIsSavingPush(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const subscription = canUsePushNotifications() ? await getCurrentPushSubscription() : null;

      if (subscription) {
        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(data?.error || "Impossible de desactiver les notifications push");
          return;
        }

        await subscription.unsubscribe();
      } else {
        const response = await fetch("/api/settings/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "pushEnabled", enabled: false }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setError(data?.error || "Impossible de desactiver les notifications push");
          return;
        }
      }

      applyNotificationPreferences({ ...profileData.notificationPreferences, pushEnabled: false });
      setPushStatus("inactive");
      setSuccessMessage("Notifications push desactivees");
    } catch {
      setError("Impossible de desactiver les notifications push");
    } finally {
      setIsSavingPush(false);
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
  const canManageSubscription =
    profileData.subscription.provider === "STRIPE" &&
    Boolean(profileData.subscription.stripeCustomerId);
  const canChangeSubscription =
    Boolean(profileData.subscription.stripeCustomerId) &&
    Boolean(profileData.subscription.stripeSubscriptionId);
  const canManageBilling = Boolean(profileData.subscription.stripeCustomerId);
  const canReactivateSubscription = canManageSubscription && profileData.subscription.cancelAtPeriodEnd;
  const badgeClassName =
    currentStatus.tone === "success"
      ? styles.badgeGreen
      : currentStatus.tone === "danger"
        ? styles.badgeRed
        : styles.badgeAmber;
  const billingPaymentMethod = billingSummary?.paymentMethod || null;
  const billingInvoices = billingSummary?.invoices || [];
  const hasStripeBilling = Boolean(billingSummary?.hasStripeCustomer || canManageBilling);
  const paymentMethodTitle = billingPaymentMethod
    ? billingPaymentMethod.last4
      ? `${formatCardBrand(billingPaymentMethod.brand)} se terminant par ${billingPaymentMethod.last4}`
      : `Moyen de paiement ${formatCardBrand(billingPaymentMethod.brand)}`
    : hasStripeBilling
      ? "Aucun moyen de paiement enregistre"
      : "Aucun moyen de paiement Stripe";
  const paymentMethodSubtitle = billingPaymentMethod?.expMonth && billingPaymentMethod.expYear
    ? `Date d'expiration : ${String(billingPaymentMethod.expMonth).padStart(2, "0")}/${billingPaymentMethod.expYear}`
    : hasStripeBilling
      ? "La mise a jour se fait dans Stripe."
      : "Choisissez une formule pour ajouter un moyen de paiement.";

  const handleOpenCustomerPortal = async () => {
    if (!canManageSubscription || isOpeningCustomerPortal) return;

    setIsOpeningCustomerPortal(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data.url) {
        if (data?.code === "STRIPE_CUSTOMER_ENVIRONMENT_MISMATCH") {
          await refreshProfileData();
        }
        setError(data?.error || "Impossible d'ouvrir le portail Stripe.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Une erreur inattendue est survenue");
    } finally {
      setIsOpeningCustomerPortal(false);
    }
  };

  const handleOpenPlanChangePortal = async () => {
    if (!canChangeSubscription || isOpeningPlanChangePortal) return;

    setIsOpeningPlanChangePortal(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnTab: "abonnements",
          flow: "subscription_update",
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data.url) {
        if (data?.code === "STRIPE_CUSTOMER_ENVIRONMENT_MISMATCH") {
          await refreshProfileData();
          router.push("/pricing");
          return;
        }
        setError(data?.error || "Impossible d'ouvrir le changement de forfait Stripe.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Une erreur inattendue est survenue");
    } finally {
      setIsOpeningPlanChangePortal(false);
    }
  };

  const handleOpenBillingPortal = async (flow?: "payment_method_update") => {
    if (!canManageBilling || isOpeningBillingPortal || isOpeningPaymentMethodPortal) return;

    const isPaymentMethodFlow = flow === "payment_method_update";
    if (isPaymentMethodFlow) {
      setIsOpeningPaymentMethodPortal(true);
    } else {
      setIsOpeningBillingPortal(true);
    }
    setBillingError(null);

    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnTab: "paiements",
          flow,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data.url) {
        if (data?.code === "STRIPE_CUSTOMER_ENVIRONMENT_MISMATCH") {
          await refreshProfileData();
        }
        setBillingError(data?.error || "Impossible d'ouvrir le portail Stripe.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setBillingError("Une erreur inattendue est survenue");
    } finally {
      if (isPaymentMethodFlow) {
        setIsOpeningPaymentMethodPortal(false);
      } else {
        setIsOpeningBillingPortal(false);
      }
    }
  };

  const handleReactivateSubscription = async () => {
    if (!canReactivateSubscription || isReactivatingSubscription) return;

    setIsReactivatingSubscription(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/stripe/customer-portal/reactivate", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setError(data?.error || "Impossible de reactiver l'abonnement.");
        return;
      }

      await refreshProfileData();
      setSuccessMessage(
        data.alreadyActive
          ? "Votre abonnement est deja actif."
          : "Votre abonnement a ete reactive."
      );
    } catch {
      setError("Une erreur inattendue est survenue");
    } finally {
      setIsReactivatingSubscription(false);
    }
  };

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

              {showLegalDocumentsSection && (
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
              )}
            </>
          )}

          {activeTab === 'prestations' && (
            <PrestationsTab
              isReadOnlyAccess={!profileData.subscription.canUseApp}
              readOnlyMessage="Votre abonnement n'est plus actif. Vous pouvez consulter vos donnees, mais les actions sont desactivees."
            />
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

                {(error || successMessage) && (
                  <div className={styles.statusRow}>
                    {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
                    {successMessage && <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>{successMessage}</div>}
                  </div>
                )}
                
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
                      Votre abonnement prendra fin
                      {profileData.subscription.currentPeriodEnd
                        ? ` le ${formatDate(profileData.subscription.currentPeriodEnd)}`
                        : " a la fin de la periode en cours"}.
                    </div>
                  )}

                  <div className={styles.planActions}>
                    {canChangeSubscription ? (
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={handleOpenPlanChangePortal}
                        disabled={isOpeningPlanChangePortal}
                      >
                        {isOpeningPlanChangePortal ? "Ouverture..." : "Changer de forfait"}
                      </button>
                    ) : (
                      <a className={styles.btnEdit} href="/pricing">Changer de forfait</a>
                    )}
                    <button
                      type="button"
                      className={styles.btnSave}
                      onClick={handleOpenCustomerPortal}
                      disabled={!canManageSubscription || isOpeningCustomerPortal}
                    >
                      {isOpeningCustomerPortal ? "Ouverture..." : "Gérer mon abonnement"}
                    </button>
                    {profileData.subscription.cancelAtPeriodEnd && (
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={handleReactivateSubscription}
                        disabled={!canReactivateSubscription || isReactivatingSubscription}
                      >
                        {isReactivatingSubscription ? "Reactivation..." : "Reactiver mon abonnement"}
                      </button>
                    )}
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

                {billingError && (
                  <div className={styles.statusRow}>
                    <div className={`${styles.statusMessage} ${styles.statusError}`}>{billingError}</div>
                  </div>
                )}
                
                <div className={styles.paymentMethodRow}>
                  <div className={styles.paymentLeft}>
                    <div className={styles.paymentIcon}>
                      <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="20" rx="4" fill="#1434CB"/>
                        <path d="M5 7h22M8 13h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className={styles.paymentDetails}>
                      <h4>{isLoadingBilling ? "Chargement..." : paymentMethodTitle}</h4>
                      <p>{isLoadingBilling ? "Lecture depuis Stripe." : paymentMethodSubtitle}</p>
                    </div>
                  </div>
                  {canManageBilling ? (
                    <button
                      className={styles.btnEdit}
                      type="button"
                      onClick={() => handleOpenBillingPortal("payment_method_update")}
                      disabled={isLoadingBilling || isOpeningPaymentMethodPortal}
                    >
                      {isOpeningPaymentMethodPortal ? "Ouverture..." : "Mettre a jour dans Stripe"}
                    </button>
                  ) : (
                    <a className={styles.btnEdit} href="/pricing">Choisir une formule</a>
                  )}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Historique de facturation</h2>
                  {canManageBilling && (
                    <button
                      className={styles.btnEdit}
                      type="button"
                      onClick={() => handleOpenBillingPortal()}
                      disabled={isLoadingBilling || isOpeningBillingPortal}
                    >
                      {isOpeningBillingPortal ? "Ouverture..." : "Voir dans Stripe"}
                    </button>
                  )}
                </div>
                
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingBilling && (
                        <tr>
                          <td colSpan={4} className={styles.emptyStateText}>Chargement des factures Stripe...</td>
                        </tr>
                      )}
                      {!isLoadingBilling && billingInvoices.length === 0 && (
                        <tr>
                          <td colSpan={4} className={styles.emptyStateText}>
                            {hasStripeBilling ? "Aucune facture Stripe pour le moment." : "Aucun historique de facturation Stripe."}
                          </td>
                        </tr>
                      )}
                      {!isLoadingBilling && billingInvoices.map((invoice) => {
                        const status = getInvoiceStatus(invoice.status);
                        const amount = invoice.amountPaid > 0 ? invoice.amountPaid : invoice.total || invoice.amountDue;

                        return (
                          <tr key={invoice.id}>
                            <td>{formatDate(invoice.created)}</td>
                            <td>{formatCurrencyFromCents(amount, invoice.currency)}</td>
                            <td><span className={status.className}>{status.label}</span></td>
                            <td>
                              {invoice.hostedInvoiceUrl ? (
                                <a
                                  className={styles.btnDownload}
                                  href={invoice.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Voir dans Stripe
                                </a>
                              ) : (
                                <span className={styles.emptyStateText}>Geree par Stripe</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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

              <div className={styles.pushSection}>
                <div className={styles.settingsInfo}>
                  <h3 className={styles.settingsSectionTitle}>Notifications push</h3>
                  <p>Recevez des notifications instantanées sur votre appareil, même lorsque Glowea est fermé.</p>
                  {pushStatus === "unsupported" && (
                    <p className={styles.featureLockedText}>Votre navigateur ou cette connexion ne permet pas les notifications push.</p>
                  )}
                  {pushStatus === "permission-denied" && (
                    <p className={styles.featureLockedText}>La permission du navigateur est bloquée. Vous pouvez la modifier dans les réglages du navigateur.</p>
                  )}
                </div>
                <div className={styles.pushActions}>
                  {pushStatus === "active" ? (
                    <>
                      <span className={styles.pushEnabledPill}>Notifications activées</span>
                      <button
                        className={styles.btnEdit}
                        type="button"
                        onClick={handleDisablePush}
                        disabled={isSavingPush}
                      >
                        {isSavingPush ? "Désactivation..." : "Désactiver"}
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.btnSave}
                      type="button"
                      onClick={handleEnablePush}
                      disabled={isSavingPush || pushStatus === "unsupported" || pushStatus === "permission-denied"}
                    >
                      {isSavingPush ? "Activation..." : "Activer les notifications"}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsInfo}>
                  <div className={styles.settingsTitleRow}>
                    <h4>Rappels SMS automatiques</h4>
                    {!profileData.canUseAutomaticSmsReminders && (
                      <span className={styles.badgePro}>Pro</span>
                    )}
                  </div>
                  <p>Envoyez automatiquement un SMS à vos clientes {profileData.smsReminderDelayHours}h avant leur rendez-vous.</p>
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
                    aria-label="Activer ou désactiver les rappels SMS automatiques"
                  >
                    <span className={profileData.smsRemindersEnabled ? styles.toggleActive : styles.toggleInactive}>
                      <span className={styles.toggleThumb}></span>
                    </span>
                    {isSavingSmsReminders && <span className={styles.savingText}>Sauvegarde...</span>}
                  </button>
                </div>
              </div>

              {notificationSettingGroups.map((group) => (
                <div className={styles.settingsGroup} key={group.title}>
                  <h3 className={styles.settingsSectionTitle}>{group.title}</h3>
                  {group.items.map((item) => {
                    const isLocked = Boolean(item.pro && !profileData.subscription.canUseProFeatures);
                    const isEnabled = isLocked ? false : profileData.notificationPreferences[item.key];
                    const isSavingSetting = savingNotificationKey === item.key;

                    return (
                      <div
                        className={`${styles.settingsRow} ${isLocked ? styles.settingsRowLocked : ""}`}
                        key={item.key}
                      >
                        <div className={styles.settingsInfo}>
                          <div className={styles.settingsTitleRow}>
                            <h4>{item.title}</h4>
                            {item.pro && <span className={styles.badgePro}>Pro</span>}
                          </div>
                          <p>{item.description}</p>
                          {isLocked && (
                            <p className={styles.featureLockedText}>Disponible avec l&apos;abonnement Pro.</p>
                          )}
                        </div>
                        <div className={styles.settingActions}>
                          {isLocked && (
                            <button className={styles.btnEdit} type="button" onClick={openPricing}>
                              Passer au Pro
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.toggleButton}
                            onClick={() => handleNotificationToggle(item.key, Boolean(item.pro))}
                            disabled={isLoadingProfile || Boolean(savingNotificationKey && !isSavingSetting)}
                            aria-pressed={isEnabled}
                            aria-label={`Activer ou désactiver ${item.title}`}
                          >
                            <span className={isEnabled ? styles.toggleActive : styles.toggleInactive}>
                              <span className={styles.toggleThumb}></span>
                            </span>
                            {isSavingSetting && <span className={styles.savingText}>Sauvegarde...</span>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>
          )}

          {activeTab === 'templates' && (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Templates Mail</h2>
              </div>
              
              <p className={`${styles.legalText} ${styles.templatesIntro}`}>
                Personnalisez les templates SMS et email utilises pour les campagnes. Ces modeles sont reutilisables dans l&apos;ecran Envoyer une campagne.
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
                    <div className={styles.templateActions}>
                      <button className={styles.btnEdit} onClick={() => openEditTemplateModal(template)} type="button">Editer</button>
                      {!template.isSystem && (
                        <button
                          className={styles.btnDeleteTemplate}
                          onClick={() => handleDeleteTemplate(template)}
                          type="button"
                          disabled={deletingTemplateId === template.id}
                        >
                          {deletingTemplateId === template.id ? "Suppression..." : "Supprimer"}
                        </button>
                      )}
                    </div>
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


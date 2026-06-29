"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, react-hooks/exhaustive-deps */

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../dashboard/clients/clients.module.css";
import SessionModal from "./SessionModal";
import NewAppointmentModal from "./NewAppointmentModal";
import NewClientModal from "./NewClientModal";
import SendClientTemplateModal from "./SendClientTemplateModal";
import { getConsent, saveConsent, type ConsentSnapshot } from "../actions/consentActions";
import {
  addClientFlag,
  archiveClient,
  clearClientVigilance,
  createClientGalleryProject,
  deleteClientGalleryProject,
  updateClientGalleryProject,
  updateClientProfile,
  updateClientRiskLevel,
} from "../actions/clientActions";
import {
  getAppointmentFinancialSummary,
} from "../../lib/appointmentFinance";
import {
  COMPLETED_APPOINTMENT_STATUSES,
  LOST_APPOINTMENT_STATUSES,
  getAppointmentStatusLabel,
} from "../../lib/appointmentStatus";

type ConsentDocumentItem = {
  id: string;
  documentType: string;
  pdfUrl: string;
  signedAt: Date | string | null;
  expiresAt: Date | string | null;
  snapshotJson: unknown;
  createdAt: Date | string;
};

type ConsentState = ConsentSnapshot & {
  dateSigned: string;
  lentilles?: string;
  cyanoacrylate?: string;
  acrylates?: string;
  traitement?: string;
  instagram?: boolean;
  anonymat?: boolean;
};

const emptyConsentData: ConsentState = {
  contactLenses: "Non",
  cyanoacrylateAllergy: "Aucune connue",
  acrylatesSensitivity: "Aucune connue",
  medicalTreatment: "Aucun",
  contraindications: "",
  notes: "",
  mediaConsent: false,
  anonymizeMedia: true,
  careConsentAccepted: false,
  dataConsentAccepted: false,
  signedBy: "",
  dateSigned: "",
};

const DIRECT_GALLERY_PROJECT_LABEL_PREFIX = "GLOWEA_GALLERY_PROJECT";

type NewGalleryProjectPhotoRole = "before" | "after";

type NewGalleryProjectPhoto = {
  file: File;
  previewUrl: string;
  mimeType: string;
  sizeBytes: number;
};

type ClientRiskLevel = "LOW" | "MEDIUM" | "HIGH";
type ClientFlagType = "NO_SHOW" | "LATE_CANCEL" | "UNPAID" | "BEHAVIOR" | "OTHER";

const CLIENT_FLAG_TYPE_LABELS: Record<ClientFlagType, string> = {
  NO_SHOW: "No-show",
  LATE_CANCEL: "Annulation tardive",
  UNPAID: "Paiement non regle",
  BEHAVIOR: "Comportement problematique",
  OTHER: "Autre",
};

const CLIENT_RISK_LEVEL_LABELS: Record<ClientRiskLevel, string> = {
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Eleve",
};

function safeDecodeGalleryValue(value: string | undefined) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function parseDirectGalleryProjectLabel(label: string | null | undefined) {
  if (!label?.startsWith(`${DIRECT_GALLERY_PROJECT_LABEL_PREFIX}|`)) return null;

  const [, projectId, role, encodedTitle, encodedDescription] = label.split("|");
  if (!projectId || !["before", "after", "other"].includes(role)) return null;

  return {
    projectId,
    role,
    title: safeDecodeGalleryValue(encodedTitle),
    description: safeDecodeGalleryValue(encodedDescription),
  };
}

function normalizeGalleryLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getSessionCategoryLabel(category: string | null | undefined) {
  switch (category) {
    case "LASH":
      return "Cils";
    case "BROWLIFT":
      return "Browlift";
    case "LASH_LIFT":
      return "Rehaussement de cils";
    case "NAILS":
      return "Ongles";
    default:
      return "Projet";
  }
}

type AppointmentServiceDisplay = {
  serviceId: string;
  name: string;
  price: number;
  durationMin: number;
  position: number;
};

function getAppointmentServices(app: any): AppointmentServiceDisplay[] {
  const snapshots = Array.isArray(app?.AppointmentService)
    ? app.AppointmentService
        .slice()
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
    : [];

  if (snapshots.length > 0) {
    return snapshots.map((item: any, index: number) => ({
      serviceId: item.serviceId,
      name: item.nameSnapshot || item.Service?.name || "Prestation",
      price: Number(item.priceSnapshot || 0) / 100,
      durationMin: Number(item.durationSnapshot || item.Service?.durationMin || 60),
      position: Number(item.position ?? index),
    }));
  }

  return app?.Service
    ? [{
        serviceId: app.Service.id,
        name: app.Service.name || "Prestation",
        price: app.Service.price ? Number(app.Service.price) : 0,
        durationMin: app.Service.durationMin || 60,
        position: 0,
      }]
    : [];
}

function getAppointmentServicesLabel(app: any) {
  const services = getAppointmentServices(app);
  return services.length > 0 ? services.map((service) => service.name).join(" + ") : "Prestation";
}

function getAppointmentServicesPrice(app: any) {
  return getAppointmentServices(app).reduce((sum: number, service: AppointmentServiceDisplay) => sum + service.price, 0);
}

function getAppointmentServicesDuration(app: any) {
  return getAppointmentServices(app).reduce((sum: number, service: AppointmentServiceDisplay) => sum + service.durationMin, 0) || 60;
}

function formatProjectDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildClientGalleryProjects(clientMedia: any[]) {
  const projects = new Map<string, any>();

  clientMedia.forEach((item: any, index: number) => {
    const sessionLink = item?.Media?.SessionMedia?.[0];
    const session = sessionLink?.Session;
    const label = item?.label || sessionLink?.label || "Photo";
    const directProject = parseDirectGalleryProjectLabel(label);
    const normalizedLabel = normalizeGalleryLabel(directProject?.role || label);
    const role = directProject?.role === "before"
      ? "before"
      : directProject?.role === "after"
        ? "after"
        : normalizedLabel.includes("avant")
          ? "before"
          : normalizedLabel.includes("apres") || normalizedLabel.includes("après")
            ? "after"
            : "other";
    const projectId = directProject?.projectId || session?.id || `media-${item.id || index}`;

    if (!projects.has(projectId)) {
      const title = directProject?.title || session?.title || session?.Service?.name || getSessionCategoryLabel(session?.category);
      const description = directProject?.description ?? session?.generalNotes ?? "";
      const dateValue = session?.Appointment?.scheduledAt || item?.createdAt || item?.Media?.SessionMedia?.[0]?.createdAt || null;

      projects.set(projectId, {
        id: projectId,
        sessionId: session?.id || null,
        isDirectGalleryProject: Boolean(directProject),
        title,
        description,
        createdAt: dateValue,
        before: null,
        after: null,
        other: [],
        mediaIds: [],
        orderValue: dateValue ? new Date(dateValue).getTime() : Date.now() - index,
      });
    }

    const project = projects.get(projectId);
    if (item?.mediaId) {
      project.mediaIds.push(item.mediaId);
    }
    const image = {
      url: item?.Media?.url,
      alt: directProject ? (role === "before" ? "Photo avant" : role === "after" ? "Photo apres" : "Photo cliente") : label || "Photo cliente",
      label: directProject ? (role === "before" ? "Avant" : role === "after" ? "Apres" : "Photo") : label,
    };

    if (role === "before" && !project.before) {
      project.before = image;
    } else if (role === "after" && !project.after) {
      project.after = image;
    } else {
      project.other.push(image);
    }
  });

  return Array.from(projects.values())
    .map((project) => ({
      ...project,
      before: project.before || project.other[0] || null,
      after: project.after || project.other[1] || project.other[0] || null,
    }))
    .filter((project) => project.before || project.after)
    .sort((a, b) => b.orderValue - a.orderValue);
}

export default function ClientsClientWrapper({
  clients,
  services = [],
  isReadOnlyAccess = false,
  readOnlyMessage = "Votre abonnement n'est plus actif. Vous pouvez consulter vos donnees, mais les actions sont desactivees.",
}: {
  clients: any[];
  services?: any[];
  isReadOnlyAccess?: boolean;
  readOnlyMessage?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientList, setClientList] = useState<any[]>(clients);
  const [isMobileDirectoryOpen, setIsMobileDirectoryOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "infos");
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [isNewClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<any>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any>(null);
  
  // Set initial selected client from URL or first client
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    searchParams.get("clientId") || (clientList.length > 0 ? clientList[0].id : null)
  );
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isSendTemplateModalOpen, setSendTemplateModalOpen] = useState(false);

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

  useEffect(() => {
    setSelectedClientIds((current) => current.filter((clientId) => clientList.some((client) => client.id === clientId)));
  }, [clientList]);

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  const [searchQuery, setSearchQuery] = useState("");

  const [consentData, setConsentData] = useState<ConsentState>(emptyConsentData);
  const [consentHistory, setConsentHistory] = useState<ConsentDocumentItem[]>([]);
  const [consentSignedAt, setConsentSignedAt] = useState<string | null>(null);
  const [consentExpiresAt, setConsentExpiresAt] = useState<string | null>(null);
  const [isEditingConsent, setIsEditingConsent] = useState(false);
  const [isLoadingConsent, setIsLoadingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [consentSuccess, setConsentSuccess] = useState<string | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [isSavingVigilance, setIsSavingVigilance] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSuccess, setClientSuccess] = useState<string | null>(null);
  const [flagForm, setFlagForm] = useState<{
    type: ClientFlagType;
    severity: ClientRiskLevel;
    note: string;
  }>({
    type: "NO_SHOW",
    severity: "LOW",
    note: "",
  });
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ title: "", description: "" });
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);

  const blockReadOnlyAction = () => {
    if (!isReadOnlyAccess) return false;
    setClientError(readOnlyMessage);
    setConsentError(readOnlyMessage);
    setProjectSaveError(readOnlyMessage);
    return true;
  };
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ title: "", description: "" });
  const [newProjectPhotos, setNewProjectPhotos] = useState<Partial<Record<NewGalleryProjectPhotoRole, NewGalleryProjectPhoto>>>({});
  const newProjectPhotosRef = useRef(newProjectPhotos);
  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    instagram: "",
    birthDate: "",
    referredBy: "",
    note: "",
    allergiesText: "",
  });

  useEffect(() => {
    newProjectPhotosRef.current = newProjectPhotos;
  }, [newProjectPhotos]);

  useEffect(() => {
    return () => {
      Object.values(newProjectPhotosRef.current).forEach((photo) => {
        if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    if (activeTab === "consentement" && selectedClientId) {
      loadConsent();
    }
  }, [activeTab, selectedClientId]);

  const loadConsent = async () => {
    setIsLoadingConsent(true);
    setConsentError(null);
    setConsentSuccess(null);
    try {
      const res = await getConsent(selectedClientId!);
      if (!res.success) {
        setConsentError(res.error);
        setConsentData(emptyConsentData);
        setConsentHistory([]);
        setConsentSignedAt(null);
        setConsentExpiresAt(null);
        return;
      }

      setConsentHistory(res.history);

      if (res.latest?.snapshotJson) {
        const snapshot = res.latest.snapshotJson as Partial<ConsentSnapshot>;
        setConsentData({
          ...emptyConsentData,
          ...snapshot,
          signedBy: snapshot.signedBy || res.suggestedSigner,
        });
        setConsentSignedAt(res.latest.signedAt ? new Date(res.latest.signedAt).toISOString() : null);
        setConsentExpiresAt(res.latest.expiresAt ? new Date(res.latest.expiresAt).toISOString() : null);
      } else {
        setConsentData({ ...emptyConsentData, signedBy: res.suggestedSigner });
        setConsentSignedAt(null);
        setConsentExpiresAt(null);
      }
    } catch (error) {
      console.error(error);
      setConsentError("Une erreur inattendue est survenue");
    } finally {
      setIsLoadingConsent(false);
    }
  };

  const handleSaveConsent = async () => {
    if (blockReadOnlyAction()) return;

    setIsLoadingConsent(true);
    setConsentError(null);
    setConsentSuccess(null);
    try {
      const res = await saveConsent(selectedClientId!, consentData);
      if (res.success) {
        setIsEditingConsent(false);
        setConsentSuccess("Consentement signé et enregistré");
        await loadConsent();
      } else {
        setConsentError(res.error || "Impossible d'enregistrer le consentement");
      }
    } catch (error) {
      console.error(error);
      setConsentError("Une erreur inattendue est survenue");
    } finally {
      setIsLoadingConsent(false);
    }
  };

  const filteredClients = clientList.filter(c => {
    const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });
  const selectedClientsForAction = clientList.filter((client) => selectedClientIds.includes(client.id));
  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((client) => selectedClientIds.includes(client.id));

  const selectedClient = clientList.find(c => c.id === selectedClientId) || null;
  const selectedClientNote = selectedClient?.ClientNote?.[0]?.content || "";
  const selectedClientMedia = selectedClient?.ClientMedia || [];
  const selectedClientFlags = selectedClient?.ClientFlag || [];
  const selectedClientRiskLevel = (selectedClient?.riskLevel || "LOW") as ClientRiskLevel;
  const selectedClientNoShowCount = Number(selectedClient?.noShowCount || 0);
  const isSelectedClientUnderVigilance = selectedClientRiskLevel !== "LOW" || selectedClientNoShowCount > 0;
  const selectedClientMainRiskReason = selectedClientNoShowCount > 0
    ? `${selectedClientNoShowCount} no-show${selectedClientNoShowCount > 1 ? "s" : ""}`
    : selectedClientFlags[0]?.note || (selectedClientFlags[0]?.type ? CLIENT_FLAG_TYPE_LABELS[selectedClientFlags[0].type as ClientFlagType] : "");
  const galleryProjects = buildClientGalleryProjects(selectedClientMedia);
  const currentGalleryProject = galleryProjects[currentProjectIndex] || null;
  const visibleGalleryProjects = currentGalleryProject ? [currentGalleryProject] : [];
  const hasMultipleGalleryProjects = galleryProjects.length > 1;
  const selectedClientDisplayName = selectedClient
    ? `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim()
    : "Aucun client sélectionné";

  useEffect(() => {
    if (!selectedClient) {
      return;
    }

    setClientForm({
      firstName: selectedClient.firstName || "",
      lastName: selectedClient.lastName || "",
      phone: selectedClient.phone || "",
      email: selectedClient.email || "",
      instagram: selectedClient.instagram || "",
      birthDate: selectedClient.birthDate ? new Date(selectedClient.birthDate).toISOString().slice(0, 10) : "",
      referredBy: selectedClient.referredBy || "",
      note: selectedClientNote,
      allergiesText: (selectedClient.ClientAllergy || [])
        .map((allergy: any) => allergy.notes ? `${allergy.label} - ${allergy.notes}` : allergy.label)
        .join("\n"),
    });
    setIsEditingContact(false);
    setIsEditingHealth(false);
    setClientError(null);
    setClientSuccess(null);
    setCurrentProjectIndex(0);
    setEditingProjectId(null);
    setProjectSaveError(null);
    setDeletingProjectId(null);
    Object.values(newProjectPhotosRef.current).forEach((photo) => {
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    });
    setIsAddingProject(false);
    setIsCreatingProject(false);
    setNewProjectForm({ title: "", description: "" });
    setNewProjectPhotos({});
  }, [selectedClientId, selectedClient, selectedClientNote]);

  useEffect(() => {
    if (currentProjectIndex >= galleryProjects.length) {
      setCurrentProjectIndex(Math.max(galleryProjects.length - 1, 0));
    }
  }, [currentProjectIndex, galleryProjects.length]);

  const resetNewProjectForm = () => {
    Object.values(newProjectPhotosRef.current).forEach((photo) => {
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    });
    setNewProjectForm({ title: "", description: "" });
    setNewProjectPhotos({});
    setIsAddingProject(false);
    setProjectSaveError(null);
  };

  const handleNewProjectPhotoChange = (role: NewGalleryProjectPhotoRole, file: File | null) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setNewProjectPhotos((current) => {
      const existing = current[role];
      if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);

      return {
        ...current,
        [role]: {
          file,
          previewUrl,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      };
    });
    setProjectSaveError(null);
  };

  const removeNewProjectPhoto = (role: NewGalleryProjectPhotoRole) => {
    setNewProjectPhotos((current) => {
      const existing = current[role];
      if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);

      const next = { ...current };
      delete next[role];
      return next;
    });
  };

  const uploadNewProjectPhoto = async (role: NewGalleryProjectPhotoRole, photo: NewGalleryProjectPhoto) => {
    if (!selectedClient) {
      throw new Error("Cliente manquante.");
    }

    const formData = new FormData();
    formData.append("file", photo.file);
    formData.append("clientId", selectedClient.id);
    formData.append("scope", "client-gallery");

    const response = await fetch("/api/sessions/photos/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Upload photo impossible.");
    }

    return {
      role,
      url: result.photo.url,
      mimeType: result.photo.mimeType,
      storageKey: result.photo.storageKey,
      sizeBytes: result.photo.sizeBytes,
    };
  };

  const createGalleryProject = async () => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient) return;

    const photosToUpload = Object.entries(newProjectPhotos) as Array<[NewGalleryProjectPhotoRole, NewGalleryProjectPhoto]>;
    if (photosToUpload.length === 0) {
      setProjectSaveError("Ajoutez au moins une photo avant de creer le projet");
      return;
    }

    setIsCreatingProject(true);
    setProjectSaveError(null);
    try {
      const uploadedPhotos = [];
      for (const [role, photo] of photosToUpload) {
        uploadedPhotos.push(await uploadNewProjectPhoto(role, photo));
      }

      const res = await createClientGalleryProject({
        clientId: selectedClient.id,
        title: newProjectForm.title,
        description: newProjectForm.description,
        photos: uploadedPhotos,
      });

      if (!res.success) {
        setProjectSaveError(res.error || "Impossible de creer ce projet");
        return;
      }

      resetNewProjectForm();
      setCurrentProjectIndex(0);
      router.refresh();
    } catch (error) {
      console.error(error);
      setProjectSaveError(error instanceof Error ? error.message : "Une erreur inattendue est survenue");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const renderNewProjectPhotoSlot = (role: NewGalleryProjectPhotoRole, label: string) => {
    const photo = newProjectPhotos[role];
    const inputId = `client-gallery-${role}`;

    return (
      <div className={styles.projectUploadSlot}>
        <span className={styles.projectImageBadge}>{label}</span>
        <label
          htmlFor={inputId}
          className={`${styles.projectUploadLabel} ${photo ? styles.projectUploadLabelWithPreview : ""}`}
        >
          {photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt={`Photo ${label.toLowerCase()}`} className={styles.projectImage} />
            </>
          ) : (
            <span>Ajouter une photo {label.toLowerCase()}</span>
          )}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className={styles.projectUploadInput}
          onChange={(event) => handleNewProjectPhotoChange(role, event.target.files?.[0] || null)}
        />
        {photo && (
          <button
            type="button"
            className={styles.projectRemovePhotoButton}
            onClick={() => removeNewProjectPhoto(role)}
            disabled={isCreatingProject}
          >
            Retirer
          </button>
        )}
      </div>
    );
  };

  const startEditingProject = (project: any) => {
    if (blockReadOnlyAction()) return;

    setEditingProjectId(project.id);
    setProjectForm({
      title: project.title || "",
      description: project.description || "",
    });
    setProjectSaveError(null);
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
    setProjectSaveError(null);
  };

  const saveGalleryProject = async (project: any) => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient) return;

    setSavingProjectId(project.id);
    setProjectSaveError(null);
    try {
      const res = await updateClientGalleryProject({
        clientId: selectedClient.id,
        sessionId: project.sessionId,
        mediaIds: project.mediaIds || [],
        title: projectForm.title,
        description: projectForm.description,
      });

      if (!res.success) {
        setProjectSaveError(res.error || "Impossible de modifier ce projet");
        return;
      }

      setEditingProjectId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setProjectSaveError("Une erreur inattendue est survenue");
    } finally {
      setSavingProjectId(null);
    }
  };

  const deleteGalleryProject = async (project: any) => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient) return;

    const confirmed = window.confirm("Supprimer ce projet de la galerie cliente ?");
    if (!confirmed) return;

    setDeletingProjectId(project.id);
    setProjectSaveError(null);
    try {
      const res = await deleteClientGalleryProject({
        clientId: selectedClient.id,
        sessionId: project.sessionId,
        mediaIds: project.mediaIds || [],
      });

      if (!res.success) {
        setProjectSaveError(res.error || "Impossible de supprimer ce projet");
        return;
      }

      setEditingProjectId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setProjectSaveError("Une erreur inattendue est survenue");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const parseAllergies = (value: string) => {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...notes] = line.split(" - ");
        return {
          label: label.trim(),
          notes: notes.join(" - ").trim() || undefined,
        };
      });
  };

  const handleSaveClient = async () => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient) {
      return;
    }

    setIsSavingClient(true);
    setClientError(null);
    setClientSuccess(null);

    try {
      const response = await updateClientProfile({
        clientId: selectedClient.id,
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        phone: clientForm.phone,
        email: clientForm.email,
        instagram: clientForm.instagram,
        birthDate: clientForm.birthDate,
        referredBy: clientForm.referredBy,
        note: clientForm.note,
        allergies: parseAllergies(clientForm.allergiesText),
      });

      if (!response.success || !response.client) {
        setClientError(response.error || "Impossible d'enregistrer la fiche cliente");
        return;
      }

      setClientList((current) =>
        current.map((client) =>
          client.id === response.client?.id
            ? {
                ...client,
                ...response.client,
                Appointment: client.Appointment,
                ConsentDocument: client.ConsentDocument,
              }
            : client
        )
      );
      setIsEditingContact(false);
      setIsEditingHealth(false);
      setClientSuccess("Fiche cliente enregistree");
    } catch (error) {
      console.error(error);
      setClientError("Une erreur inattendue est survenue");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleArchiveClient = async () => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient || isDeletingClient) {
      return;
    }

    const clientName = `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim() || "cette cliente";
    const confirmed = window.confirm(
      `Supprimer ${clientName} du repertoire ? Son historique de rendez-vous et ses documents seront conserves.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingClient(true);
    setClientError(null);
    setClientSuccess(null);

    try {
      const response = await archiveClient(selectedClient.id);

      if (!response.success) {
        setClientError(response.error || "Impossible de supprimer la cliente");
        return;
      }

      const nextClientList = clientList.filter((client) => client.id !== selectedClient.id);
      setClientList(nextClientList);
      setSelectedClientId(nextClientList[0]?.id || null);
      setSelectedClientIds((current) => current.filter((clientId) => clientId !== selectedClient.id));
      setClientSuccess("Cliente supprimee du repertoire");
      router.refresh();
    } catch (error) {
      console.error(error);
      setClientError("Une erreur inattendue est survenue");
    } finally {
      setIsDeletingClient(false);
    }
  };

  const updateSelectedClientVigilance = (data: Partial<any>) => {
    if (!selectedClient) return;
    setClientList((current) =>
      current.map((client) =>
        client.id === selectedClient.id
          ? {
              ...client,
              ...data,
            }
          : client
      )
    );
  };

  const handleAddClientFlag = async () => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient || isSavingVigilance) return;

    setIsSavingVigilance(true);
    setClientError(null);
    setClientSuccess(null);

    try {
      const response = await addClientFlag({
        clientId: selectedClient.id,
        type: flagForm.type,
        severity: flagForm.severity,
        note: flagForm.note,
      });

      if (!response.success || !response.flag) {
        setClientError(response.error || "Impossible d'ajouter le signalement");
        return;
      }

      updateSelectedClientVigilance({
        riskLevel: response.riskLevel,
        noShowCount: response.noShowCount,
        ClientFlag: [response.flag, ...(selectedClient.ClientFlag || [])],
      });
      setFlagForm({ type: "NO_SHOW", severity: "LOW", note: "" });
      setClientSuccess("Signalement ajoute");
    } catch (error) {
      console.error(error);
      setClientError("Une erreur inattendue est survenue");
    } finally {
      setIsSavingVigilance(false);
    }
  };

  const handleRiskLevelChange = async (riskLevel: ClientRiskLevel) => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient || isSavingVigilance) return;

    setIsSavingVigilance(true);
    setClientError(null);
    setClientSuccess(null);

    try {
      const response = await updateClientRiskLevel(selectedClient.id, riskLevel);

      if (!response.success) {
        setClientError(response.error || "Impossible de modifier la vigilance");
        return;
      }

      updateSelectedClientVigilance({ riskLevel });
      setClientSuccess("Niveau de vigilance mis a jour");
    } catch (error) {
      console.error(error);
      setClientError("Une erreur inattendue est survenue");
    } finally {
      setIsSavingVigilance(false);
    }
  };

  const handleClearVigilance = async () => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient || isSavingVigilance) return;
    if (!window.confirm("Retirer cette cliente de la vigilance ? L'historique des signalements sera conserve.")) return;

    setIsSavingVigilance(true);
    setClientError(null);
    setClientSuccess(null);

    try {
      const response = await clearClientVigilance(selectedClient.id);

      if (!response.success) {
        setClientError(response.error || "Impossible de retirer la vigilance");
        return;
      }

      updateSelectedClientVigilance({ riskLevel: "LOW", noShowCount: 0 });
      setClientSuccess("Cliente retiree de la vigilance");
    } catch (error) {
      console.error(error);
      setClientError("Une erreur inattendue est survenue");
    } finally {
      setIsSavingVigilance(false);
    }
  };

  const resetClientForm = () => {
    if (!selectedClient) {
      return;
    }

    setClientForm({
      firstName: selectedClient.firstName || "",
      lastName: selectedClient.lastName || "",
      phone: selectedClient.phone || "",
      email: selectedClient.email || "",
      instagram: selectedClient.instagram || "",
      birthDate: selectedClient.birthDate ? new Date(selectedClient.birthDate).toISOString().slice(0, 10) : "",
      referredBy: selectedClient.referredBy || "",
      note: selectedClientNote,
      allergiesText: (selectedClient.ClientAllergy || [])
        .map((allergy: any) => allergy.notes ? `${allergy.label} - ${allergy.notes}` : allergy.label)
        .join("\n"),
    });
    setIsEditingContact(false);
    setIsEditingHealth(false);
    setClientError(null);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((current) => (
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId]
    ));
  };

  const toggleSelectAllFiltered = () => {
    setSelectedClientIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredClients.some((client) => client.id === id));
      }

      const next = new Set(current);
      filteredClients.forEach((client) => next.add(client.id));
      return Array.from(next);
    });
  };

  const clearSelectedClients = () => {
    setSelectedClientIds([]);
  };

  const handleClientCreated = (client: any) => {
    const normalizedClient = {
      ...client,
      riskLevel: client.riskLevel || "LOW",
      noShowCount: client.noShowCount || 0,
      Appointment: [],
      ClientAllergy: [],
      ClientFlag: [],
      ClientNote: [],
      ClientMedia: [],
      ConsentDocument: [],
    };

    setClientList((current) => [normalizedClient, ...current]);
    setSelectedClientId(client.id);
    setSearchQuery("");
    setIsMobileDirectoryOpen(false);
    setClientError(null);
    setClientSuccess("Cliente ajoutee au repertoire");
  };

  // Calculs pour le client sélectionné
  const clientAppointments = selectedClient?.Appointment || [];
  const appointmentClientOptions = clientList.map((client) => ({
    id: client.id,
    name: `${client.firstName} ${client.lastName || ""}`.trim(),
    riskLevel: client.riskLevel || "LOW",
    noShowCount: client.noShowCount || 0,
    riskReason: Number(client.noShowCount || 0) > 0
      ? `${client.noShowCount} no-show${Number(client.noShowCount || 0) > 1 ? "s" : ""}`
      : client.ClientFlag?.[0]?.note || (client.ClientFlag?.[0]?.type ? CLIENT_FLAG_TYPE_LABELS[client.ClientFlag[0].type as ClientFlagType] : ""),
  }));
  const appointmentServiceOptions = services.map((service) => ({
    id: service.id,
    name: service.name,
    price: service.price ? Number(service.price) : 0,
    durationMin: service.durationMin || 60,
    color: service.color || null,
  }));
  
  const historyRdv = clientAppointments.map((app: any) => {
      const finance = getAppointmentFinancialSummary(app);
      const date = new Date(app.scheduledAt);
      return {
        id: app.id,
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        client: `${selectedClient.firstName} ${selectedClient.lastName || ''}`.trim(),
        presta: getAppointmentServicesLabel(app),
        status: getAppointmentStatusLabel(app.status),
        amount: `${(finance.paidAmountCents / 100).toFixed(2)} €`,
        remainingAmount: finance.remainingAmountCents,
        serviceCat: app.Service?.ServiceCategory?.name || (getAppointmentServices(app).length > 1 ? "Multi-prestations" : "Prestation"),
        hasSession: !!app.Session,
        originalApp: app
      };
    });

  const historyPresta = clientAppointments.reduce((acc: any[], app: any) => {
    if ((COMPLETED_APPOINTMENT_STATUSES as readonly string[]).includes(app.status)) {
      const appointmentServices = getAppointmentServices(app);
      const finance = getAppointmentFinancialSummary(app);
      appointmentServices.forEach((service) => {
        const existing = acc.find(p => p.id === service.serviceId);
        const revenueShare = appointmentServices.length > 0
          ? Math.round(finance.paidAmountCents / appointmentServices.length)
          : finance.paidAmountCents;
        if (existing) {
          existing.count += 1;
          existing.ca += revenueShare;
        } else {
          acc.push({
            id: service.serviceId,
            name: service.name,
            cat: app.Service?.ServiceCategory?.name || "Prestation",
            count: 1,
            ca: revenueShare
          });
        }
      });
    }
    return acc;
  }, []).map((p: any) => ({ ...p, ca: `${(p.ca / 100).toFixed(2)} €` }));

  const openAppointmentEditor = (rdv: any) => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient) return;

    const appointment = rdv.originalApp;
    setAppointmentToEdit({
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      endAt: appointment.endAt,
      status: appointment.status,
      price: appointment.price ?? Math.round(getAppointmentServicesPrice(appointment) * 100),
      notes: appointment.notes || "",
      client: {
        id: selectedClient.id,
        name: `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim(),
      },
      service: appointment.Service
        ? {
            id: appointment.Service.id,
            name: getAppointmentServicesLabel(appointment),
            price: getAppointmentServicesPrice(appointment),
            durationMin: getAppointmentServicesDuration(appointment),
            color: appointment.Service.color || null,
          }
        : null,
      appointmentServices: getAppointmentServices(appointment),
    });
    setAppointmentModalOpen(true);
  };

  const openNewAppointmentForSelectedClient = () => {
    if (blockReadOnlyAction()) return;

    if (!selectedClient) return;

    setAppointmentToEdit(null);
    setAppointmentModalOpen(true);
  };

  return (
    <main className={styles.layout}>
      {isReadOnlyAccess && (
        <div className={styles.formError} role="alert">
          {readOnlyMessage}
        </div>
      )}
      <button
        type="button"
        className={styles.mobileDirectoryToggle}
        onClick={() => setIsMobileDirectoryOpen((current) => !current)}
        aria-expanded={isMobileDirectoryOpen}
        aria-controls="clients-directory"
      >
        <span className={styles.mobileDirectoryToggleLabel}>Répertoire</span>
        <span className={styles.mobileDirectoryToggleValue}>{selectedClientDisplayName}</span>
        <span className={styles.mobileDirectoryToggleIcon}>{isMobileDirectoryOpen ? "−" : "+"}</span>
      </button>

      {/* SIDEBAR - Répertoire */}
      <aside
        id="clients-directory"
        className={`${styles.sidebar} ${isMobileDirectoryOpen ? styles.sidebarMobileOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>Répertoire</h1>
          <span className={styles.clientCount}>{clientList.length} clients</span>
          <button
            type="button"
            className={styles.addClientButton}
            onClick={() => {
              if (blockReadOnlyAction()) return;
              setNewClientModalOpen(true);
            }}
            disabled={isReadOnlyAccess}
          >
            + Ajouter un client
          </button>
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
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
          Tout sélectionner
        </label>

        {selectedClientIds.length > 0 && (
          <div className={styles.bulkActions}>
            <div className={styles.bulkActionsText}>
              <strong>{selectedClientIds.length}</strong>
              <span>cliente{selectedClientIds.length > 1 ? "s" : ""} sélectionnée{selectedClientIds.length > 1 ? "s" : ""}</span>
            </div>
            <button
              type="button"
              className={styles.bulkActionButton}
              onClick={() => {
                if (blockReadOnlyAction()) return;
                setSendTemplateModalOpen(true);
              }}
              disabled={isReadOnlyAccess}
            >
              Envoyer un template mail
            </button>
            <button
              type="button"
              className={styles.bulkActionGhost}
              onClick={clearSelectedClients}
            >
              Annuler
            </button>
          </div>
        )}

        <div className={styles.clientList}>
          {filteredClients.map(client => (
            <div 
              key={client.id} 
              className={`${styles.clientItem} ${client.id === selectedClientId ? styles.clientItemActive : ''} ${selectedClientIds.includes(client.id) ? styles.clientItemSelected : ''}`}
              onClick={() => {
                setSelectedClientId(client.id);
                setIsMobileDirectoryOpen(false);
              }}
            >
              <label
                className={styles.clientCheckbox}
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedClientIds.includes(client.id)}
                  onChange={() => toggleClientSelection(client.id)}
                  aria-label={`Sélectionner ${client.firstName} ${client.lastName || ""}`.trim()}
                />
              </label>
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
              <button
                type="button"
                className={styles.btnNewRdv}
                onClick={openNewAppointmentForSelectedClient}
                disabled={!selectedClient || isReadOnlyAccess}
              >
                + Nouveau RDV
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  if (blockReadOnlyAction()) return;
                  setActiveTab("infos");
                  setIsEditingContact(true);
                }}
                disabled={!selectedClient || isReadOnlyAccess}
                title="Modifier la cliente"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button
                className={styles.deleteClientBtn}
                onClick={handleArchiveClient}
                disabled={!selectedClient || isDeletingClient || isReadOnlyAccess}
                title="Supprimer la cliente"
                type="button"
              >
                {isDeletingClient ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
          <div className={styles.headerContact}>
            <div className={styles.contactBlock}>
              <span className={styles.contactLabel}>Email</span>
              {selectedClient?.email ? (
                <a
                  className={`${styles.contactValue} ${styles.contactLink}`}
                  href={`mailto:${selectedClient.email}`}
                >
                  {selectedClient.email}
                </a>
              ) : (
                <span className={styles.contactValue}>Non renseigné</span>
              )}
            </div>
            <div className={styles.contactBlock}>
              <span className={styles.contactLabel}>Téléphone</span>
              {selectedClient?.phone ? (
                <a
                  className={`${styles.contactValue} ${styles.contactLink}`}
                  href={`tel:${selectedClient.phone.replace(/\s+/g, "")}`}
                >
                  {selectedClient.phone}
                </a>
              ) : (
                <span className={styles.contactValue}>Non renseigné</span>
              )}
            </div>
          </div>
        </div>

        {(clientError || clientSuccess) && (
          <div className={clientError ? styles.formError : styles.formSuccess}>
            {clientError || clientSuccess}
          </div>
        )}

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
                  {/* <button className={styles.iconBtn} style={{ borderColor: 'transparent', color: '#F4B8B2' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </button> */}
                  <button
                    className={styles.iconBtn}
                    style={{ borderColor: 'transparent' }}
                    onClick={() => {
                      if (blockReadOnlyAction()) return;
                      setIsEditingContact(true);
                    }}
                    disabled={!selectedClient || isSavingClient || isReadOnlyAccess}
                    title="Modifier les coordonnees"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              {isEditingContact ? (
                <div className={styles.editForm}>
                  <div className={styles.contactGrid}>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Prenom *</span>
                      <input className={styles.formInput} value={clientForm.firstName} onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })} />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Nom</span>
                      <input className={styles.formInput} value={clientForm.lastName} onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })} />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Email</span>
                      <input className={styles.formInput} type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Telephone</span>
                      <input className={styles.formInput} value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Instagram</span>
                      <input className={styles.formInput} value={clientForm.instagram} onChange={(e) => setClientForm({ ...clientForm, instagram: e.target.value })} placeholder="@cliente" />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Date de naissance</span>
                      <input className={styles.formInput} type="date" value={clientForm.birthDate} onChange={(e) => setClientForm({ ...clientForm, birthDate: e.target.value })} />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.infoLabel}>Recommandee par</span>
                      <input className={styles.formInput} value={clientForm.referredBy} onChange={(e) => setClientForm({ ...clientForm, referredBy: e.target.value })} />
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <button className={styles.btnOutline} onClick={resetClientForm} disabled={isSavingClient}>Annuler</button>
                    <button className={styles.btnNewRdv} onClick={handleSaveClient} disabled={isSavingClient || isReadOnlyAccess}>
                      {isSavingClient ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
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
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Telephone :</span>
                  <span className={styles.infoValue}>{selectedClient?.phone || 'Non renseigné'}</span>
                </div>
              </div>
              )}
            </div>

            {/* Notes & Allergies Card */}
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Notes & Allergies</h3>
                <div className={styles.cardIcons}>
                  <button
                    className={styles.iconBtn}
                    style={{ borderColor: 'transparent' }}
                    onClick={() => {
                      if (blockReadOnlyAction()) return;
                      setIsEditingHealth(true);
                    }}
                    disabled={!selectedClient || isSavingClient || isReadOnlyAccess}
                    title="Modifier notes et allergies"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              {isEditingHealth ? (
                <div className={styles.editForm}>
                  <label className={styles.formField}>
                    <span className={styles.infoLabel}>Note cliente</span>
                    <textarea
                      className={styles.formTextarea}
                      value={clientForm.note}
                      onChange={(e) => setClientForm({ ...clientForm, note: e.target.value })}
                      rows={4}
                      placeholder="Preferences, habitudes, points importants..."
                    />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.infoLabel}>Allergies</span>
                    <textarea
                      className={styles.formTextarea}
                      value={clientForm.allergiesText}
                      onChange={(e) => setClientForm({ ...clientForm, allergiesText: e.target.value })}
                      rows={4}
                      placeholder={"Une allergie par ligne. Exemple : Colle cils - reaction legere"}
                    />
                  </label>
                  <div className={styles.formActions}>
                    <button className={styles.btnOutline} onClick={resetClientForm} disabled={isSavingClient}>Annuler</button>
                    <button className={styles.btnNewRdv} onClick={handleSaveClient} disabled={isSavingClient || isReadOnlyAccess}>
                      {isSavingClient ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
              <div className={styles.infoGrid}>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Note</span>
                  <span className={styles.infoValue}>{selectedClientNote || "Aucune note enregistree."}</span>
                </div>
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
              )}
            </div>

            {/* Vigilance cliente */}
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>Vigilance cliente</h3>
                  {isSelectedClientUnderVigilance ? (
                    <span className={styles.vigilanceBadge}>
                      Cliente a surveiller - Risque {CLIENT_RISK_LEVEL_LABELS[selectedClientRiskLevel].toLowerCase()}
                    </span>
                  ) : (
                    <span className={styles.vigilanceMuted}>Aucune vigilance active</span>
                  )}
                </div>
                <div className={styles.vigilanceActions}>
                  <select
                    className={styles.vigilanceSelect}
                    value={selectedClientRiskLevel}
                    onChange={(event) => handleRiskLevelChange(event.target.value as ClientRiskLevel)}
                    disabled={!selectedClient || isSavingVigilance || isReadOnlyAccess}
                    aria-label="Modifier le niveau de vigilance"
                  >
                    <option value="LOW">Risque faible</option>
                    <option value="MEDIUM">Risque moyen</option>
                    <option value="HIGH">Risque eleve</option>
                  </select>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={handleClearVigilance}
                    disabled={!selectedClient || isSavingVigilance || !isSelectedClientUnderVigilance || isReadOnlyAccess}
                  >
                    Retirer
                  </button>
                </div>
              </div>

              {isSelectedClientUnderVigilance && selectedClientMainRiskReason && (
                <div className={styles.vigilanceNotice}>
                  Motif principal : {selectedClientMainRiskReason}
                </div>
              )}

              <div className={styles.vigilanceForm}>
                <select
                  className={styles.formInput}
                  value={flagForm.type}
                  onChange={(event) => setFlagForm((current) => ({ ...current, type: event.target.value as ClientFlagType }))}
                  disabled={!selectedClient || isSavingVigilance || isReadOnlyAccess}
                  aria-label="Type de signalement"
                >
                  <option value="NO_SHOW">No-show</option>
                  <option value="LATE_CANCEL">Annulation tardive</option>
                  <option value="UNPAID">Paiement non regle</option>
                  <option value="BEHAVIOR">Comportement problematique</option>
                  <option value="OTHER">Autre</option>
                </select>
                <select
                  className={styles.formInput}
                  value={flagForm.severity}
                  onChange={(event) => setFlagForm((current) => ({ ...current, severity: event.target.value as ClientRiskLevel }))}
                  disabled={!selectedClient || isSavingVigilance || isReadOnlyAccess}
                  aria-label="Gravite du signalement"
                >
                  <option value="LOW">Faible</option>
                  <option value="MEDIUM">Moyen</option>
                  <option value="HIGH">Eleve</option>
                </select>
                <input
                  className={styles.formInput}
                  value={flagForm.note}
                  onChange={(event) => setFlagForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Note interne optionnelle"
                  disabled={!selectedClient || isSavingVigilance || isReadOnlyAccess}
                />
                <button
                  type="button"
                  className={styles.btnNewRdv}
                  onClick={handleAddClientFlag}
                  disabled={!selectedClient || isSavingVigilance || isReadOnlyAccess}
                >
                  {isSavingVigilance ? "Enregistrement..." : "Ajouter un signalement"}
                </button>
              </div>

              <div className={styles.vigilanceHistory}>
                <h4>Historique des signalements</h4>
                {selectedClientFlags.length > 0 ? (
                  selectedClientFlags.map((flag: any) => (
                    <div className={styles.vigilanceHistoryItem} key={flag.id}>
                      <div>
                        <strong>{CLIENT_FLAG_TYPE_LABELS[flag.type as ClientFlagType] || "Signalement"}</strong>
                        <span>{flag.note || "Aucune note"}</span>
                      </div>
                      <small>
                        {CLIENT_RISK_LEVEL_LABELS[(flag.severity || "LOW") as ClientRiskLevel]} - {flag.createdAt ? new Date(flag.createdAt).toLocaleDateString("fr-FR") : ""}
                      </small>
                    </div>
                  ))
                ) : (
                  <span className={styles.vigilanceMuted}>Aucun signalement enregistre.</span>
                )}
              </div>
            </div>

            {/* Galerie des projets */}
            <div className={styles.galerieHeader}>
              <h3 className={styles.galerieTitle}>Galerie des projets</h3>
              <div className={styles.galleryHeaderActions}>
                <button
                  type="button"
                  className={styles.projectEditButton}
                  onClick={() => {
                    if (blockReadOnlyAction()) return;
                    if (isAddingProject) {
                      resetNewProjectForm();
                    } else {
                      setIsAddingProject(true);
                      setProjectSaveError(null);
                    }
                  }}
                  disabled={isCreatingProject || isReadOnlyAccess}
                >
                  {isAddingProject ? "Fermer" : "Ajouter un projet"}
                </button>
              </div>
            </div>
            
            <div className={styles.projectGalleryList}>
              {projectSaveError && (
                <div className={styles.formError}>{projectSaveError}</div>
              )}

              {isAddingProject && (
                <div className={styles.projectEditForm}>
                  <label>
                    Titre
                    <input
                      type="text"
                      value={newProjectForm.title}
                      onChange={(event) => setNewProjectForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Nom du projet"
                      disabled={isCreatingProject}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={newProjectForm.description}
                      onChange={(event) => setNewProjectForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Note visible dans la galerie"
                      rows={3}
                      disabled={isCreatingProject}
                    />
                  </label>
                  <div className={styles.projectImages}>
                    {renderNewProjectPhotoSlot("before", "Avant")}
                    {renderNewProjectPhotoSlot("after", "Apres")}
                  </div>
                  <div className={styles.projectEditActions}>
                    <button
                      type="button"
                      className={styles.btnNewRdv}
                      onClick={createGalleryProject}
                      disabled={isCreatingProject}
                    >
                      {isCreatingProject ? "Creation..." : "Creer le projet"}
                    </button>
                    <button
                      type="button"
                      className={styles.projectGhostButton}
                      onClick={resetNewProjectForm}
                      disabled={isCreatingProject}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {galleryProjects.length > 0 ? (
                <>
                {visibleGalleryProjects.map((project: any) => (
                  <article className={styles.projectCard} key={project.id}>
                    <div className={styles.projectCardHeader}>
                      <div>
                        <h4 className={styles.projectTitle}>{project.title || "Projet cliente"}</h4>
                        {project.description ? (
                          <p className={styles.projectDescription}>{project.description}</p>
                        ) : (
                          <p className={styles.projectDescription}>Portfolio avant/après de la séance cliente.</p>
                        )}
                      </div>
                      {project.createdAt && (
                        <span className={styles.projectDate}>{formatProjectDate(project.createdAt)}</span>
                      )}
                    </div>

                    {(project.sessionId || project.isDirectGalleryProject) && editingProjectId !== project.id && (
                      <div className={styles.projectCardActions}>
                        <button
                          type="button"
                          className={styles.projectEditButton}
                          onClick={() => startEditingProject(project)}
                          disabled={deletingProjectId === project.id}
                        >
                          Modifier le projet
                        </button>
                        <button
                          type="button"
                          className={styles.projectDeleteButton}
                          onClick={() => deleteGalleryProject(project)}
                          disabled={deletingProjectId === project.id}
                        >
                          {deletingProjectId === project.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    )}

                    {editingProjectId === project.id && (
                      <div className={styles.projectEditForm}>
                        <label>
                          Titre
                          <input
                            type="text"
                            value={projectForm.title}
                            onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                            placeholder="Nom du projet"
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            value={projectForm.description}
                            onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Note visible dans la galerie"
                            rows={3}
                          />
                        </label>
                        <div className={styles.projectEditActions}>
                          <button
                            type="button"
                            className={styles.btnNewRdv}
                            onClick={() => saveGalleryProject(project)}
                            disabled={savingProjectId === project.id}
                          >
                            {savingProjectId === project.id ? "Sauvegarde..." : "Sauvegarder"}
                          </button>
                          <button
                            type="button"
                            className={styles.projectGhostButton}
                            onClick={cancelEditingProject}
                            disabled={savingProjectId === project.id}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={styles.projectImages}>
                      <div className={styles.projectImageCard}>
                        <span className={styles.projectImageBadge}>Avant</span>
                        {project.before ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={project.before.url}
                              alt={project.before.alt || "Photo avant"}
                              className={styles.projectImage}
                            />
                          </>
                        ) : (
                          <div className={styles.projectImagePlaceholder}>Photo avant non renseignee</div>
                        )}
                      </div>

                      <div className={styles.projectImageCard}>
                        <span className={styles.projectImageBadge}>Apres</span>
                        {project.after ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={project.after.url}
                              alt={project.after.alt || "Photo après"}
                              className={styles.projectImage}
                            />
                          </>
                        ) : (
                          <div className={styles.projectImagePlaceholder}>Photo après non renseignee</div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {hasMultipleGalleryProjects && (
                  <div className={styles.galleryPagination}>
                    <button
                      type="button"
                      className={styles.galleryPageButton}
                      onClick={() => setCurrentProjectIndex((current) => Math.max(current - 1, 0))}
                      disabled={currentProjectIndex === 0}
                    >
                      Pr&eacute;c&eacute;dent
                    </button>
                    <span>{currentProjectIndex + 1} / {galleryProjects.length}</span>
                    <button
                      type="button"
                      className={styles.galleryPageButton}
                      onClick={() => setCurrentProjectIndex((current) => Math.min(current + 1, galleryProjects.length - 1))}
                      disabled={currentProjectIndex >= galleryProjects.length - 1}
                    >
                      Suivant
                    </button>
                  </div>
                )}
                </>
              ) : !isAddingProject ? (
                <div className={styles.galerieEmpty}>
                  Les photos prises pendant les séances apparaîtront ici sur la fiche cliente.
                </div>
              ) : null}
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
                      <th>MODIFIER</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRdv.length > 0 ? (
                      historyRdv.map((rdv: any) => (
                        <tr key={rdv.id}>
                          <td data-label="Date">{rdv.date}</td>
                          <td data-label="Heure">{rdv.time}</td>
                          <td data-label="Cliente">
                            <div className={styles.tdClient}>
                              <span>{rdv.client}</span>
                            </div>
                          </td>
                          <td data-label="Prestation">{rdv.presta}</td>
                          <td data-label="Statut">
                            <span className={`${styles.statusBadge} ${(COMPLETED_APPOINTMENT_STATUSES as readonly string[]).includes(rdv.originalApp.status) ? styles.statusGreen : (LOST_APPOINTMENT_STATUSES as readonly string[]).includes(rdv.originalApp.status) ? styles.statusRed : styles.statusOrange}`}>
                              {rdv.status}
                            </span>
                          </td>
                          <td data-label="Montant">
                            <div className={styles.paymentAmountCell}>
                              <span>{rdv.amount}</span>
                              {rdv.remainingAmount > 0 && (
                                <small>Reste {(rdv.remainingAmount / 100).toFixed(2)} €</small>
                              )}
                            </div>
                          </td>
                          <td data-label="Modifier" className={styles.tableActionCell}>
                            <button
                              className={styles.btnModifierRdv}
                              onClick={() => openAppointmentEditor(rdv)}
                              title="Modifier le rendez-vous"
                              type="button"
                            >
                              Modifier
                            </button>
                          </td>
                          <td className={styles.tableActionCell}>
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
                        <td colSpan={8} className={styles.emptyRowCell}>Aucun rendez-vous trouvé</td>
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
                          <td data-label="Prestation">
                            <div className={styles.tdClient}>
                              <div className={styles.tdAvatarSquare}></div>
                              <span>{presta.name}</span>
                            </div>
                          </td>
                          <td data-label="Catégorie">
                            <span className={styles.catBadge}>
                              {presta.cat === 'Cils' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11h-6V5h6v6z"/><path d="M11 19H5v-6h6v6z"/><path d="M19 19h-6v-6h6v6z"/><path d="M11 11H5V5h6v6z"/></svg>
                              )}
                              {presta.cat}
                            </span>
                          </td>
                          <td data-label="Nombre">{presta.count}</td>
                          <td data-label="Chiffre d'affaires">{presta.ca}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className={styles.emptyRowCell}>Aucune prestation terminée</td>
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
            <div className={styles.consentActionsRow}>
              <p className={styles.consentDesc}>
                Consentement aux soins, informations de sensibilite et autorisation d'image. Une nouvelle version signee est archivee a chaque sauvegarde.
              </p>
              {!isEditingConsent ? (
                <button
                  className={styles.btnNewRdv}
                  onClick={() => {
                    if (blockReadOnlyAction()) return;
                    setIsEditingConsent(true);
                  }}
                  disabled={isLoadingConsent || !selectedClient || isReadOnlyAccess}
                >
                  {consentSignedAt ? "Renouveler" : "Remplir"}
                </button>
              ) : (
                <div className={styles.consentActionButtons}>
                  <button className={styles.btnNewRdv} onClick={() => { setIsEditingConsent(false); loadConsent(); }} disabled={isLoadingConsent}>
                    Annuler
                  </button>
                  <button className={styles.btnNewRdv} onClick={handleSaveConsent} disabled={isLoadingConsent || isReadOnlyAccess}>
                    {isLoadingConsent ? "Enregistrement..." : "Signer et enregistrer"}
                  </button>
                </div>
              )}
            </div>

            {(consentError || consentSuccess) && (
              <div className={styles.feedbackStack}>
                {consentError && <div className={styles.feedbackError}>{consentError}</div>}
                {consentSuccess && <div className={styles.feedbackSuccess}>{consentSuccess}</div>}
              </div>
            )}

            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div className={styles.consentTitleBox}>
                  <div className={styles.consentIconBoxPink}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </div>
                  <div>
                    <h3 className={styles.tableTitle}>Bilan sante & sensibilites</h3>
                    <span className={styles.consentSub}>Derniere signature : {consentSignedAt ? new Date(consentSignedAt).toLocaleDateString("fr-FR") : "non signee"}</span>
                  </div>
                </div>
                {consentSignedAt ? (
                  <span className={`${styles.statusBadge} ${styles.statusGreen}`}>A jour</span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.statusRed}`}>Non rempli</span>
                )}
              </div>

              <div className={styles.consentGrid}>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Port de lentilles de contact</span>
                  {isEditingConsent ? (
                    <select className={styles.modalSelect} value={consentData.contactLenses} onChange={(e) => setConsentData({ ...consentData, contactLenses: e.target.value === "Oui" ? "Oui" : "Non" })}>
                      <option value="Non">Non</option>
                      <option value="Oui">Oui</option>
                    </select>
                  ) : (
                    <span className={styles.consentValue}>{consentData.contactLenses}</span>
                  )}
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Allergie cyanoacrylate / colle cils</span>
                  {isEditingConsent ? (
                    <input type="text" className={styles.modalInput} value={consentData.cyanoacrylateAllergy} onChange={(e) => setConsentData({ ...consentData, cyanoacrylateAllergy: e.target.value })} />
                  ) : (
                    <span className={styles.consentValue}>{consentData.cyanoacrylateAllergy}</span>
                  )}
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Sensibilite acrylates / gels UV</span>
                  {isEditingConsent ? (
                    <input type="text" className={styles.modalInput} value={consentData.acrylatesSensitivity} onChange={(e) => setConsentData({ ...consentData, acrylatesSensitivity: e.target.value })} />
                  ) : (
                    <span className={styles.consentValue}>{consentData.acrylatesSensitivity}</span>
                  )}
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Traitement medical en cours</span>
                  {isEditingConsent ? (
                    <input type="text" className={styles.modalInput} value={consentData.medicalTreatment} onChange={(e) => setConsentData({ ...consentData, medicalTreatment: e.target.value })} />
                  ) : (
                    <span className={styles.consentValue}>{consentData.medicalTreatment}</span>
                  )}
                </div>
                <div className={styles.consentItemFull}>
                  <span className={styles.consentLabel}>Contre-indications / remarques sante</span>
                  {isEditingConsent ? (
                    <textarea className={styles.modalInput} value={consentData.contraindications} onChange={(e) => setConsentData({ ...consentData, contraindications: e.target.value })} rows={3} />
                  ) : (
                    <span className={styles.consentValue}>{consentData.contraindications || "Aucune"}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div className={styles.consentTitleBox}>
                  <div className={styles.consentIconBoxRed}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </div>
                  <div>
                    <h3 className={styles.tableTitle}>Autorisations</h3>
                    <span className={styles.consentSub}>Image, soins et conservation des donnees</span>
                  </div>
                </div>
              </div>
              <div className={styles.consentList}>
                <label className={`${styles.consentRow} ${isEditingConsent ? styles.consentRowEditable : ""}`}>
                  <div className={styles.consentRowText}>
                    <h4>Consentement aux soins</h4>
                    <p>La cliente confirme avoir transmis les informations utiles et autorise la realisation de la prestation.</p>
                  </div>
                  <input type="checkbox" checked={consentData.careConsentAccepted} disabled={!isEditingConsent || isReadOnlyAccess} onChange={(e) => setConsentData({ ...consentData, careConsentAccepted: e.target.checked })} />
                </label>
                <label className={`${styles.consentRow} ${isEditingConsent ? styles.consentRowEditable : ""}`}>
                  <div className={styles.consentRowText}>
                    <h4>Conservation des donnees de suivi</h4>
                    <p>Autorise Glowea a conserver cette fiche pour le suivi client et la tracabilite des soins.</p>
                  </div>
                  <input type="checkbox" checked={consentData.dataConsentAccepted} disabled={!isEditingConsent || isReadOnlyAccess} onChange={(e) => setConsentData({ ...consentData, dataConsentAccepted: e.target.checked })} />
                </label>
                <div className={styles.consentRow}>
                  <div className={styles.consentRowText}>
                    <h4>Publication avant/après</h4>
                    <p>Autorise l&apos;utilisation de photos ou videos du resultat sur les reseaux sociaux.</p>
                  </div>
                  <div className={`${styles.toggleWrapper} ${isEditingConsent ? styles.toggleWrapperEditable : ""}`} onClick={() => isEditingConsent && setConsentData({ ...consentData, mediaConsent: !consentData.mediaConsent })}>
                    <span className={consentData.mediaConsent ? styles.toggleTextOn : styles.toggleTextOff}>{consentData.mediaConsent ? "Autorise" : "Refuse"}</span>
                    <div className={consentData.mediaConsent ? styles.toggleActive : styles.toggleInactive}>
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                </div>
                <div className={styles.consentRow}>
                  <div className={styles.consentRowText}>
                    <h4>Anonymat des contenus</h4>
                    <p>Si publication autorisee, cadrage sans visage complet ni element identifiant.</p>
                  </div>
                  <div className={`${styles.toggleWrapper} ${isEditingConsent ? styles.toggleWrapperEditable : ""}`} onClick={() => isEditingConsent && setConsentData({ ...consentData, anonymizeMedia: !consentData.anonymizeMedia })}>
                    <span className={consentData.anonymizeMedia ? styles.toggleTextOn : styles.toggleTextOff}>{consentData.anonymizeMedia ? "Oui" : "Non"}</span>
                    <div className={consentData.anonymizeMedia ? styles.toggleActive : styles.toggleInactive}>
                      <div className={styles.toggleThumb}></div>
                    </div>
                  </div>
                </div>
                <div className={styles.consentItemFull}>
                  <span className={styles.consentLabel}>Nom de la signataire</span>
                  {isEditingConsent ? (
                    <input type="text" className={styles.modalInput} value={consentData.signedBy} onChange={(e) => setConsentData({ ...consentData, signedBy: e.target.value })} />
                  ) : (
                    <div className={styles.signatureBox}>
                      <span className={styles.signatureText}>
                        {consentSignedAt ? `Signe par ${consentData.signedBy} le ${new Date(consentSignedAt).toLocaleString("fr-FR")}` : "Non signe"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Historique des consentements</h3>
                {consentExpiresAt && <span className={styles.consentSub}>Expiration indicative : {new Date(consentExpiresAt).toLocaleDateString("fr-FR")}</span>}
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th>DOCUMENT</th>
                      <th>DATE</th>
                      <th>SIGNATAIRE</th>
                      <th>STATUT</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consentHistory.length > 0 ? (
                      consentHistory.map((document) => {
                        const snapshot = (document.snapshotJson || {}) as Partial<ConsentSnapshot>;
                        const isExpired = document.expiresAt ? new Date(document.expiresAt) < new Date() : false;
                        return (
                          <tr key={document.id}>
                            <td data-label="Document">
                              <div className={styles.tdDoc}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                Consentement soins & image
                              </div>
                            </td>
                            <td data-label="Date">{document.signedAt ? new Date(document.signedAt).toLocaleString("fr-FR") : "-"}</td>
                            <td data-label="Signataire">{snapshot.signedBy || "-"}</td>
                            <td data-label="Statut"><span className={`${styles.statusBadge} ${isExpired ? styles.statusOrange : styles.statusGreen}`}>{isExpired ? "A renouveler" : "Signe"}</span></td>
                            <td data-label="PDF">{document.pdfUrl ? <a className={styles.voirTout} href={document.pdfUrl} target="_blank">Ouvrir</a> : <span className={styles.mutedText}>Non genere</span>}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className={styles.emptyRowCell}>Aucun consentement signe</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {false && activeTab === 'consentement' && (
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

      <SendClientTemplateModal
        isOpen={isSendTemplateModalOpen}
        onClose={() => setSendTemplateModalOpen(false)}
        selectedClients={selectedClientsForAction}
      />

      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        onSave={handleClientCreated}
      />

      <SessionModal 
        isOpen={isSessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        clientName={selectedRdv?.client}
        time={selectedRdv?.time}
        category={selectedRdv?.presta}
        appointmentId={selectedRdv?.id ? String(selectedRdv.id) : undefined}
        clientId={selectedClientId || undefined}
        isReadOnly={false}
        startOnOpen={false}
      />
      <NewAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setAppointmentModalOpen(false);
          setAppointmentToEdit(null);
        }}
        clients={appointmentClientOptions}
        services={appointmentServiceOptions}
        initialData={appointmentToEdit}
        initialClient={selectedClient ? {
          id: selectedClient.id,
          name: `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim(),
        } : null}
      />
    </main>
  );
}

"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deletePublicService,
  savePublicService,
  updatePublicProfile,
  type getPresencePageConfig,
} from "../../actions/publicPageActions";
import styles from "./presence.module.css";

type ConfigData = Extract<Awaited<ReturnType<typeof getPresencePageConfig>>, { success: true }>;
type ProfileState = ConfigData["profile"];
type ServiceState = ConfigData["services"][number];
type GalleryState = ConfigData["gallery"][number];
type ServiceDraft = ServiceState & { localId: string; isEditing: boolean };

const emptyService: ServiceState = {
  id: "",
  name: "",
  description: "",
  durationMin: 60,
  price: 0,
  category: "",
  imageUrl: "",
  isPublic: true,
  isActive: true,
};

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDraft(service: ServiceState): ServiceDraft {
  return { ...service, localId: createLocalId(), isEditing: false };
}

function createDraft(): ServiceDraft {
  return { ...emptyService, localId: createLocalId(), isEditing: true };
}

export default function PresenceClient({
  initialData,
  checkoutSuccess,
  checkoutSyncState,
}: {
  initialData: ConfigData;
  checkoutSuccess: boolean;
  checkoutSyncState: "activated" | "pending" | "error" | null;
}) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<ProfileState>(initialData.profile);
  const [services, setServices] = useState<ServiceDraft[]>(() => initialData.services.map(toDraft));
  const [gallery, setGallery] = useState<GalleryState[]>(initialData.gallery);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return initialData.publicPath;
    return `${window.location.origin}/pro/${profile.slug || initialData.profile.slug}`;
  }, [initialData.profile.slug, initialData.publicPath, profile.slug]);

  function updateProfileField<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateService(localId: string, patch: Partial<ServiceState>) {
    setServices((current) => current.map((service) => (
      service.localId === localId ? { ...service, ...patch } : service
    )));
  }

  function setServiceEditing(localId: string, isEditing: boolean) {
    setServices((current) => current.map((service) => (
      service.localId === localId ? { ...service, isEditing } : service
    )));
  }

  function addServiceDraft() {
    setServices((current) => [createDraft(), ...current]);
  }

  function saveProfile() {
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await updatePublicProfile(profile);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setFeedback("Informations du salon enregistrees.");
      router.refresh();
    });
  }

  function saveService(service: ServiceDraft) {
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await savePublicService({
        id: service.id || undefined,
        name: service.name,
        description: service.description,
        durationMin: service.durationMin,
        price: service.price,
        category: service.category,
        imageUrl: service.imageUrl,
        isPublic: service.isPublic,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setServices((current) => current.map((item) => (
        item.localId === service.localId
          ? { ...result.service, localId: service.localId, isEditing: false }
          : item
      )));
      setFeedback("Prestation enregistree.");
      router.refresh();
    });
  }

  function removeService(service: ServiceDraft) {
    if (!service.id) {
      setServices((current) => current.filter((item) => item.localId !== service.localId));
      return;
    }

    const confirmed = window.confirm(`Supprimer ${service.name || "cette prestation"} de la page publique ?`);
    if (!confirmed) return;

    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await deletePublicService(service.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setServices((current) => current.filter((item) => item.localId !== service.localId));
      setFeedback("Prestation supprimee.");
      router.refresh();
    });
  }

  async function uploadGallery(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    setFeedback(null);

    try {
      const uploaded: GalleryState[] = [];
      let failedCount = 0;

      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("alt", file.name.replace(/\.[^.]+$/, ""));
          const response = await fetch("/api/public-profile/gallery/upload", {
            method: "POST",
            body: formData,
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            failedCount += 1;
            continue;
          }
          uploaded.push({
            id: result.image.id,
            imageUrl: result.image.imageUrl,
            alt: result.image.alt || "",
            sortOrder: result.image.sortOrder,
            isPublic: result.image.isPublic,
          });
        } catch {
          failedCount += 1;
        }
      }

      if (uploaded.length) {
        setGallery((current) => [...uploaded, ...current]);
        setFeedback(failedCount ? "Certaines images n'ont pas pu etre importees." : "Images ajoutees.");
      } else {
        setError("Upload impossible.");
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  function removeImage(id: string) {
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/public-profile/gallery/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Image introuvable.");
        return;
      }
      setGallery((current) => current.filter((image) => image.id !== id));
      setFeedback("Image supprimee.");
      router.refresh();
    });
  }

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setFeedback("Lien public copie.");
    } catch {
      setError("Copie impossible. Selectionnez le lien manuellement.");
    }
  }

  async function upgradeToEssential() {
    setIsUpgrading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "essential", billing: "monthly" }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Impossible d'ouvrir Stripe.");
      }
      window.location.href = result.url;
    } catch (upgradeError) {
      setError(upgradeError instanceof Error ? upgradeError.message : "Impossible d'ouvrir Stripe.");
      setIsUpgrading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Glowea Presence</span>
          <h1>Votre page professionnelle</h1>
          <p>Gerez les informations publiques de votre salon, vos prestations et votre galerie.</p>
        </div>
        <div className={styles.previewBox}>
          <span>Lien public</span>
          <strong>{publicUrl}</strong>
          <div>
            <a href={publicUrl} target="_blank" rel="noreferrer">Voir ma page publique</a>
            <button type="button" onClick={copyPublicLink}>Copier le lien</button>
          </div>
        </div>
      </header>

      {checkoutSuccess && (
        <section className={styles.notice} role="status">
          {checkoutSyncState === "activated"
            ? "Paiement confirme. Votre offre Presence est active."
            : checkoutSyncState === "error"
              ? "Paiement confirme. La synchronisation finale sera terminee par Stripe."
              : "Paiement confirme. Votre offre sera active apres confirmation Stripe."}
        </section>
      )}

      {feedback && <section className={styles.success} role="status">{feedback}</section>}
      {error && <section className={styles.error} role="alert">{error}</section>}

      <section className={styles.upgradeBand}>
        <div>
          <span>Upgrade</span>
          <strong>Trouvez davantage de clientes grace a la reservation en ligne.</strong>
        </div>
        <button type="button" onClick={upgradeToEssential} disabled={isUpgrading}>
          {isUpgrading ? "Ouverture..." : "Passer a Essential"}
        </button>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span>Salon</span>
            <h2>Informations publiques</h2>
          </div>
          <button type="button" onClick={saveProfile} disabled={isPending}>Enregistrer</button>
        </div>
        <div className={styles.formGrid}>
          <label>Nom du salon<input value={profile.businessName} onChange={(event) => updateProfileField("businessName", event.target.value)} /></label>
          <label>Ville<input value={profile.city} onChange={(event) => updateProfileField("city", event.target.value)} /></label>
          <label className={styles.full}>Description<textarea rows={4} value={profile.description} onChange={(event) => updateProfileField("description", event.target.value)} /></label>
          <label>Adresse<input value={profile.address} onChange={(event) => updateProfileField("address", event.target.value)} /></label>
          <label>Telephone<input value={profile.phone} onChange={(event) => updateProfileField("phone", event.target.value)} /></label>
          <label>Email<input value={profile.email} onChange={(event) => updateProfileField("email", event.target.value)} /></label>
          <label>Instagram<input value={profile.instagramUrl} onChange={(event) => updateProfileField("instagramUrl", event.target.value)} /></label>
          <label>Site web<input value={profile.websiteUrl} onChange={(event) => updateProfileField("websiteUrl", event.target.value)} /></label>
          <label className={styles.full}>Horaires affiches<textarea rows={3} value={profile.openingHours} onChange={(event) => updateProfileField("openingHours", event.target.value)} /></label>
          <label className={styles.toggleLine}><input type="checkbox" checked={profile.isPublished} onChange={(event) => updateProfileField("isPublished", event.target.checked)} /> Page publiee</label>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span>Prestations</span>
            <h2>Catalogue visible</h2>
          </div>
          <button type="button" onClick={addServiceDraft}>Ajouter une prestation</button>
        </div>
        <div className={styles.serviceList}>
          {services.length === 0 && <p className={styles.empty}>Aucune prestation visible pour le moment.</p>}
          {services.map((service) => (
            <article className={styles.serviceItem} key={service.localId}>
              {service.isEditing ? (
                <div className={styles.serviceEditor}>
                  <label>Nom<input value={service.name} onChange={(event) => updateService(service.localId, { name: event.target.value })} /></label>
                  <label>Prix EUR<input type="number" min="0" step="0.01" value={service.price} onChange={(event) => updateService(service.localId, { price: Number(event.target.value) })} /></label>
                  <label>Duree min<input type="number" min="15" step="15" value={service.durationMin} onChange={(event) => updateService(service.localId, { durationMin: Number(event.target.value) })} /></label>
                  <label className={styles.full}>Description<textarea rows={3} value={service.description} onChange={(event) => updateService(service.localId, { description: event.target.value })} /></label>
                  <label className={styles.toggleLine}><input type="checkbox" checked={service.isPublic} onChange={(event) => updateService(service.localId, { isPublic: event.target.checked })} /> Visible sur la page</label>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => saveService(service)} disabled={isPending}>Enregistrer</button>
                    <button type="button" onClick={() => removeService(service)} disabled={isPending}>Supprimer</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <strong>{service.name}</strong>
                    <span>{service.durationMin} min - {service.price ? `${service.price} EUR` : "Sur devis"}</span>
                    <p>{service.description || "Aucune description."}</p>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => setServiceEditing(service.localId, true)}>Modifier</button>
                    <button type="button" onClick={() => removeService(service)} disabled={isPending}>Supprimer</button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span>Galerie</span>
            <h2>Photos publiques</h2>
          </div>
          <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Upload..." : "Importer des photos"}
          </button>
        </div>
        <input ref={galleryInputRef} className={styles.hiddenInput} type="file" accept="image/*" multiple onChange={(event) => uploadGallery(event.target.files)} />
        <div className={styles.galleryGrid}>
          {gallery.length === 0 && <p className={styles.empty}>Ajoutez des photos pour presenter votre travail.</p>}
          {gallery.map((image) => (
            <article className={styles.galleryItem} key={image.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Uploaded Supabase public URL. */}
              <img src={image.imageUrl} alt={image.alt || ""} />
              <button type="button" onClick={() => removeImage(image.id)} disabled={isPending}>Supprimer</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

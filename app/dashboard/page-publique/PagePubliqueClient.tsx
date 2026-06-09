"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  deletePublicService,
  deleteReview,
  savePublicService,
  saveReview,
  updatePublicProfile,
  type getPublicPageConfig,
} from "../../actions/publicPageActions";
import styles from "./pagePublique.module.css";

type ConfigData = Awaited<ReturnType<typeof getPublicPageConfig>>;
type ProfileState = ConfigData["profile"];
type ServiceState = ConfigData["services"][number];
type GalleryState = ConfigData["gallery"][number];
type ReviewState = ConfigData["reviews"][number];
type TabId = "profil" | "prestations" | "galerie" | "avis" | "apercu";
type ServiceEditorState = ServiceState & { localId: string };

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

const emptyReview: ReviewState = {
  id: "",
  authorName: "",
  rating: 5,
  comment: "",
  isVisible: true,
  createdAt: new Date().toISOString(),
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "profil", label: "Profil" },
  { id: "prestations", label: "Prestations" },
  { id: "galerie", label: "Galerie" },
  { id: "avis", label: "Avis" },
  { id: "apercu", label: "Apercu" },
];

function formatPrice(value: number) {
  if (!value) return "Sur devis";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} EUR`;
}

function formatDuration(value: number) {
  return `${value || 60} min`;
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toServiceEditorState(service: ServiceState): ServiceEditorState {
  return { ...service, localId: createLocalId() };
}

function createEmptyServiceDraft(): ServiceEditorState {
  return { ...emptyService, localId: createLocalId() };
}

function createEmptyReviewDraft(): ReviewState {
  return { ...emptyReview, createdAt: new Date().toISOString() };
}

export default function PagePubliqueClient({ initialData }: { initialData: ConfigData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("profil");
  const [profile, setProfile] = useState<ProfileState>(initialData.profile);
  const [services, setServices] = useState<ServiceEditorState[]>(() => initialData.services.map(toServiceEditorState));
  const [gallery, setGallery] = useState<GalleryState[]>(initialData.gallery);
  const [reviews, setReviews] = useState<ReviewState[]>(initialData.reviews);
  const [editingServices, setEditingServices] = useState<Record<string, boolean>>({});
  const [serviceSnapshots, setServiceSnapshots] = useState<Record<string, ServiceState>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return initialData.publicPath;
    return `${window.location.origin}/pro/${profile.slug || initialData.profile.slug}`;
  }, [initialData.profile.slug, initialData.publicPath, profile.slug]);

  const visibleServices = services.filter((service) => service.isPublic && service.name);
  const visibleReviews = reviews.filter((review) => review.isVisible && review.authorName && review.comment);
  const averageRating = visibleReviews.length
    ? visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length
    : 0;

  function updateProfileField<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateService(index: number, patch: Partial<ServiceState>) {
    setServices((current) => current.map((service, serviceIndex) => (
      serviceIndex === index ? { ...service, ...patch } : service
    )));
  }

  function startEditingService(service: ServiceEditorState) {
    setEditingServices((current) => ({ ...current, [service.localId]: true }));
    setServiceSnapshots((current) => (
      current[service.localId]
        ? current
        : {
            ...current,
            [service.localId]: {
              id: service.id,
              name: service.name,
              description: service.description,
              durationMin: service.durationMin,
              price: service.price,
              category: service.category,
              imageUrl: service.imageUrl,
              isPublic: service.isPublic,
              isActive: service.isActive,
            },
          }
    ));
  }

  function stopEditingService(localId: string) {
    setEditingServices((current) => {
      const next = { ...current };
      delete next[localId];
      return next;
    });
    setServiceSnapshots((current) => {
      const next = { ...current };
      delete next[localId];
      return next;
    });
  }

  function addServiceDraft() {
    const draft = createEmptyServiceDraft();
    setServices((current) => [draft, ...current]);
    setEditingServices((current) => ({ ...current, [draft.localId]: true }));
  }

  function cancelServiceEditing(localId: string) {
    const snapshot = serviceSnapshots[localId];
    setServices((current) => {
      const target = current.find((service) => service.localId === localId);
      if (!target) return current;
      if (!target.id && !snapshot) {
        return current.filter((service) => service.localId !== localId);
      }
      return current.map((service) => (
        service.localId === localId
          ? { ...service, ...(snapshot || emptyService) }
          : service
      ));
    });
    stopEditingService(localId);
  }

  function updateReview(index: number, patch: Partial<ReviewState>) {
    setReviews((current) => current.map((review, reviewIndex) => (
      reviewIndex === index ? { ...review, ...patch } : review
    )));
  }

  async function handleProfileUpload(file: File | undefined, field: "coverImageUrl" | "avatarUrl") {
    if (!file) return;
    setUploadingField(field);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", field === "coverImageUrl" ? "cover" : "avatar");

      const response = await fetch("/api/public-profile/profile-images/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Upload impossible.");
        return;
      }

      updateProfileField(field, result.imageUrl);
      setFeedback("Image importee. Pensez a enregistrer la page.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload impossible.");
    } finally {
      setUploadingField(null);
    }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadingField("gallery");
    setError(null);
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

          if (result.success) {
            uploaded.push({
              id: result.image.id,
              imageUrl: result.image.imageUrl,
              alt: result.image.alt || "",
              sortOrder: result.image.sortOrder,
              isPublic: result.image.isPublic,
            });
          } else {
            failedCount += 1;
          }
        } catch {
          failedCount += 1;
        }
      }

      if (uploaded.length) {
        setGallery((current) => [...uploaded, ...current]);
        setFeedback(
          failedCount
            ? `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} ajoutee${uploaded.length > 1 ? "s" : ""}, ${failedCount} echec${failedCount > 1 ? "s" : ""}.`
            : "Images ajoutees a la galerie."
        );
        router.refresh();
      } else if (failedCount) {
        setError("Upload impossible.");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload impossible.");
    } finally {
      setUploadingField(null);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function handleServiceImageUpload(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingField(`service-image-${index}`);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/public-profile/services/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Upload impossible.");
        return;
      }

      updateService(index, { imageUrl: result.imageUrl });
      setFeedback("Image de prestation importee. Pensez a enregistrer la prestation.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload impossible.");
    } finally {
      setUploadingField(null);
    }
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
      setFeedback("Page publique mise a jour.");
      router.refresh();
    });
  }

  function saveService(index: number) {
    setFeedback(null);
    setError(null);
    const service = services[index];
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
      setServices((current) => current.map((item, itemIndex) => (
        itemIndex === index ? { ...result.service, localId: item.localId } : item
      )));
      stopEditingService(service.localId);
      setFeedback("Prestation enregistree.");
      router.refresh();
    });
  }

  function removeService(localId: string) {
    const service = services.find((item) => item.localId === localId);
    if (!service) return;

    const confirmed = window.confirm(
      `Supprimer ${service.name || "cette prestation"} du catalogue public ?`
    );
    if (!confirmed) return;

    if (!service.id) {
      setServices((current) => current.filter((item) => item.localId !== localId));
      stopEditingService(localId);
      setFeedback("Brouillon supprime.");
      return;
    }

    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await deletePublicService(service.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setServices((current) => current.filter((item) => item.localId !== localId));
      stopEditingService(localId);
      setFeedback("Prestation supprimee.");
      router.refresh();
    });
  }

  function saveReviewAt(index: number) {
    setFeedback(null);
    setError(null);
    const review = reviews[index];
    startTransition(async () => {
      const result = await saveReview(review);
      if (!result.success) {
        setError(result.error);
        return;
      }
      updateReview(index, result.review);
      setFeedback("Avis enregistre.");
      router.refresh();
    });
  }

  function addReviewDraft() {
    setReviews((current) => [createEmptyReviewDraft(), ...current]);
  }

  function removeImage(id: string) {
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/public-profile/gallery/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGallery((current) => current.filter((image) => image.id !== id));
      setFeedback("Image retiree.");
      router.refresh();
    });
  }

  function clearProfileImage(field: "coverImageUrl" | "avatarUrl") {
    updateProfileField(field, "");
  }

  function clearServiceImage(index: number) {
    updateService(index, { imageUrl: "" });
  }

  function removeReview(index: number, id: string) {
    if (!id) {
      setReviews((current) => current.filter((_, reviewIndex) => reviewIndex !== index));
      return;
    }
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await deleteReview(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReviews((current) => current.filter((review) => review.id !== id));
      setFeedback("Avis supprime.");
      router.refresh();
    });
  }

  function copyPublicLink() {
    void navigator.clipboard?.writeText(publicUrl);
    setFeedback("Lien public copie.");
  }

  if (!initialData.isPro) {
    return (
      <main className={styles.page}>
        <section className={styles.lockedCard}>
          <span className={styles.kicker}>Glowea Pro</span>
          <h1>La page publique est disponible avec Glowea Pro</h1>
          <p>Activez votre mini-site beaute pour presenter vos prestations, votre galerie et recevoir des demandes de rendez-vous.</p>
          <Link className={styles.primaryButton} href="/pricing">Passer au Pro</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.kicker}>Mini-site public</span>
          <h1>Page publique Glowea</h1>
          <p>Configurez votre vitrine, ajoutez vos visuels et partagez votre lien de reservation.</p>
        </div>
        <div className={profile.isPublished ? styles.publishBadge : styles.unpublishedBadge}>
          {profile.isPublished ? "Page publiee" : "Page non publiee"}
        </div>
        <div className={styles.linkBox}>
          <span>Lien public</span>
          <strong>{publicUrl}</strong>
          <div className={styles.linkActions}>
            <button type="button" onClick={copyPublicLink}>Copier le lien</button>
            <Link href={`/pro/${profile.slug}`} target="_blank">Voir ma page</Link>
          </div>
        </div>
      </section>

      {(feedback || error) && (
        <div className={error ? styles.error : styles.success}>{error || feedback}</div>
      )}

      <nav className={styles.tabs} aria-label="Configuration page publique">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? styles.tabActive : ""}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={styles.workspace}>
        {activeTab === "profil" && (
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.kicker}>Profil</span>
                <h2>Informations publiques</h2>
              </div>
              <label className={styles.publishToggle}>
                <input
                  type="checkbox"
                  checked={profile.isPublished}
                  onChange={(event) => updateProfileField("isPublished", event.target.checked)}
                />
                Publier la page
              </label>
            </div>

            <div className={styles.imageUploadGrid}>
              <div className={styles.uploadGroup}>
                <label className={styles.uploadTile}>
                  <span>Image de couverture</span>
                  {profile.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Uploaded Supabase public URL.
                    <img src={profile.coverImageUrl} alt="" />
                  ) : (
                    <strong>Importer une image</strong>
                  )}
                  <input type="file" accept="image/*" onChange={(event) => handleProfileUpload(event.target.files?.[0], "coverImageUrl")} />
                </label>
                {profile.coverImageUrl && <button className={styles.textButton} type="button" onClick={() => clearProfileImage("coverImageUrl")}>Retirer l&apos;image</button>}
              </div>
              <div className={styles.uploadGroup}>
                <label className={styles.uploadTile}>
                  <span>Logo ou photo</span>
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Uploaded Supabase public URL.
                    <img src={profile.avatarUrl} alt="" />
                  ) : (
                    <strong>Importer une image</strong>
                  )}
                  <input type="file" accept="image/*" onChange={(event) => handleProfileUpload(event.target.files?.[0], "avatarUrl")} />
                </label>
                {profile.avatarUrl && <button className={styles.textButton} type="button" onClick={() => clearProfileImage("avatarUrl")}>Retirer l&apos;image</button>}
              </div>
            </div>
            {uploadingField && uploadingField !== "gallery" && <p className={styles.helperText}>Upload en cours...</p>}

            <div className={styles.formGrid}>
              <label>Slug<input value={profile.slug} onChange={(event) => updateProfileField("slug", event.target.value)} placeholder="clara-beauty" /></label>
              <label>Nom du salon<input value={profile.businessName} onChange={(event) => updateProfileField("businessName", event.target.value)} /></label>
              <label>Nom de la professionnelle<input value={profile.ownerName} onChange={(event) => updateProfileField("ownerName", event.target.value)} /></label>
              <label>Ville<input value={profile.city} onChange={(event) => updateProfileField("city", event.target.value)} /></label>
              <label className={styles.full}>Description<textarea value={profile.description} onChange={(event) => updateProfileField("description", event.target.value)} rows={4} /></label>
              <label>Adresse<input value={profile.address} onChange={(event) => updateProfileField("address", event.target.value)} /></label>
              <label>Telephone<input value={profile.phone} onChange={(event) => updateProfileField("phone", event.target.value)} /></label>
              <label>Email<input value={profile.email} onChange={(event) => updateProfileField("email", event.target.value)} /></label>
              <label>Instagram<input value={profile.instagramUrl} onChange={(event) => updateProfileField("instagramUrl", event.target.value)} placeholder="@votrecompte" /></label>
              <label>Site web<input value={profile.websiteUrl} onChange={(event) => updateProfileField("websiteUrl", event.target.value)} /></label>
              <label>Horaires<input value={profile.openingHours} onChange={(event) => updateProfileField("openingHours", event.target.value)} /></label>
            </div>

            <button className={styles.primaryButton} type="button" onClick={saveProfile} disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer la page"}
            </button>
          </article>
        )}

        {activeTab === "prestations" && (
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.kicker}>Prestations</span>
                <h2>Catalogue public</h2>
                <p className={styles.sectionDescription}>Choisissez les prestations visibles sur votre page publique.</p>
              </div>
              <button className={styles.secondaryButton} type="button" onClick={addServiceDraft}>
                Ajouter une prestation
              </button>
            </div>
            {services.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <span className={styles.emptyStateIcon}>+</span>
                <h3>Aucune prestation publique pour le moment</h3>
                <p>Créez votre catalogue pour commencer à présenter votre savoir-faire sur la page publique.</p>
                <button className={styles.primaryButton} type="button" onClick={addServiceDraft}>
                  Ajouter ma premiere prestation
                </button>
              </div>
            ) : (
              <div className={styles.serviceList}>
                {services.map((service, index) => {
                  const isEditing = Boolean(editingServices[service.localId]);
                  const isVisible = service.isPublic;

                  return (
                    <div className={styles.serviceCard} key={service.localId}>
                      <div className={styles.serviceCardHeader}>
                        <div className={styles.serviceCardTitleBlock}>
                          <div className={styles.serviceCardTitleRow}>
                            <h3>{service.name || "Nouvelle prestation"}</h3>
                            <span className={isVisible ? styles.statusBadgeVisible : styles.statusBadgeHidden}>
                              {isVisible ? "Visible" : "Masquee"}
                            </span>
                          </div>
                          <span className={styles.serviceCategoryLine}>{service.category || "Categorie a renseigner"}</span>
                        </div>
                      </div>

                      {!isEditing ? (
                        <>
                          <div className={styles.serviceReadGrid}>
                            <div className={styles.serviceImagePreview}>
                              {service.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- Uploaded Supabase public URL.
                                <img src={service.imageUrl} alt={service.name || "Illustration de la prestation"} />
                              ) : (
                                <div className={styles.serviceImagePlaceholder}>
                                  <strong>Aucune image de fond</strong>
                                  <span>Ajoutez une image pour personnaliser la card publique.</span>
                                </div>
                              )}
                            </div>
                            <div className={styles.serviceReadBlock}>
                              <span className={styles.serviceReadLabel}>Description</span>
                              <p>{service.description || "Ajoutez une courte description pour rassurer et donner envie de reserver."}</p>
                            </div>
                            <div className={styles.serviceReadMeta}>
                              <div>
                                <span className={styles.serviceReadLabel}>Duree</span>
                                <strong>{formatDuration(service.durationMin)}</strong>
                              </div>
                              <div>
                                <span className={styles.serviceReadLabel}>Prix</span>
                                <strong>{service.price ? formatPrice(service.price) : "Sur devis"}</strong>
                              </div>
                            </div>
                          </div>
                          <div className={styles.serviceCardActions}>
                            <button className={styles.secondaryButton} type="button" onClick={() => startEditingService(service)}>
                              Modifier
                            </button>
                            <button className={styles.ghostDangerButton} type="button" onClick={() => removeService(service.localId)} disabled={isPending}>
                              Supprimer
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.serviceEditGrid}>
                            <label>
                              Nom
                              <input
                                value={service.name}
                                onChange={(event) => updateService(index, { name: event.target.value })}
                                placeholder="Nom de la prestation"
                              />
                            </label>
                            <label>
                              Categorie
                              <input
                                value={service.category}
                                onChange={(event) => updateService(index, { category: event.target.value })}
                                placeholder="Cils, ongles, sourcils..."
                              />
                            </label>
                            <label className={styles.full}>
                              Description
                              <textarea
                                value={service.description}
                                onChange={(event) => updateService(index, { description: event.target.value })}
                                placeholder="Description courte"
                                rows={4}
                              />
                            </label>
                            <div className={`${styles.uploadGroup} ${styles.full}`}>
                              <label className={`${styles.uploadTile} ${styles.serviceUploadTile}`}>
                                <span>Image de fond de la card</span>
                                {service.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- Uploaded Supabase public URL.
                                  <img src={service.imageUrl} alt={service.name || "Image de fond de la prestation"} />
                                ) : (
                                  <strong>Importer une image</strong>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => handleServiceImageUpload(index, event.target.files?.[0])}
                                />
                              </label>
                              {service.imageUrl && (
                                <button className={styles.textButton} type="button" onClick={() => clearServiceImage(index)}>
                                  Retirer l&apos;image
                                </button>
                              )}
                              {uploadingField === `service-image-${index}` && (
                                <p className={styles.helperText}>Upload de l&apos;image en cours...</p>
                              )}
                            </div>
                            <label>
                              Duree en minutes
                              <input
                                type="number"
                                min="15"
                                step="15"
                                value={service.durationMin}
                                onChange={(event) => updateService(index, { durationMin: Number(event.target.value) })}
                                placeholder="60"
                              />
                            </label>
                            <label>
                              Prix
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={service.price}
                                onChange={(event) => updateService(index, { price: Number(event.target.value) })}
                                placeholder="0"
                              />
                            </label>
                            <div className={styles.serviceToggleField}>
                              <span>Visible sur la page publique</span>
                              <label className={styles.serviceToggleControl}>
                                <input
                                  className={styles.serviceToggleInput}
                                  type="checkbox"
                                  checked={service.isPublic}
                                  onChange={(event) => updateService(index, { isPublic: event.target.checked })}
                                />
                                <span className={styles.serviceToggleSwitch} aria-hidden="true">
                                  <span className={styles.serviceToggleThumb}></span>
                                </span>
                                <span className={styles.serviceToggleText}>
                                  <strong>{service.isPublic ? "Visible" : "Masquee"}</strong>
                                  <small>
                                    {service.isPublic
                                      ? "Cette prestation apparaitra sur votre page publique."
                                      : "Cette prestation reste masquee tant que vous ne l'activez pas."}
                                  </small>
                                </span>
                              </label>
                            </div>
                          </div>
                          <div className={styles.serviceCardActions}>
                            <button className={styles.primaryButton} type="button" onClick={() => saveService(index)} disabled={isPending}>
                              {isPending ? "Enregistrement..." : "Enregistrer"}
                            </button>
                            <button className={styles.secondaryButton} type="button" onClick={() => cancelServiceEditing(service.localId)} disabled={isPending}>
                              Annuler
                            </button>
                            <button className={styles.ghostDangerButton} type="button" onClick={() => removeService(service.localId)} disabled={isPending}>
                              Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        )}

        {activeTab === "galerie" && (
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div><span className={styles.kicker}>Galerie</span><h2>Portfolio public</h2></div>
              <button className={styles.secondaryButton} type="button" onClick={() => galleryInputRef.current?.click()}>Importer</button>
            </div>
            <input ref={galleryInputRef} className={styles.hiddenInput} type="file" accept="image/*" multiple onChange={(event) => handleGalleryUpload(event.target.files)} />
            {uploadingField === "gallery" && <p className={styles.helperText}>Upload des images en cours...</p>}
            <div className={styles.galleryGrid}>
              {gallery.length === 0 && <p className={styles.emptyText}>Importez des photos pour presenter votre travail.</p>}
              {gallery.map((image) => (
                <div className={styles.galleryItem} key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Gallery URLs are uploaded by the user. */}
                  <img src={image.imageUrl} alt={image.alt || ""} />
                  <div><span>{image.alt || "Image galerie"}</span><button type="button" onClick={() => removeImage(image.id)} disabled={isPending}>Supprimer</button></div>
                </div>
              ))}
            </div>
          </article>
        )}

        {activeTab === "avis" && (
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div><span className={styles.kicker}>Avis clientes</span><h2>Avis visibles</h2></div>
              <button className={styles.secondaryButton} type="button" onClick={addReviewDraft}>Ajouter</button>
            </div>
            <div className={styles.reviewSummary}>
              <strong>{averageRating ? averageRating.toFixed(1) : "-"} / 5</strong>
              <span>{visibleReviews.length} avis visible{visibleReviews.length > 1 ? "s" : ""}</span>
            </div>
            {reviews.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <span className={styles.emptyStateIcon}>+</span>
                <h3>Aucun avis pour le moment</h3>
                <p>Ajoutez quelques retours clientes pour rassurer et enrichir votre page publique.</p>
                <button className={styles.primaryButton} type="button" onClick={addReviewDraft}>
                  Ajouter mon premier avis
                </button>
              </div>
            ) : (
              <div className={styles.reviewList}>
                {reviews.map((review, index) => (
                  <div className={styles.reviewEditor} key={`${review.id || "new"}-${index}`}>
                    <div className={styles.serviceMetaGrid}>
                      <input value={review.authorName} onChange={(event) => updateReview(index, { authorName: event.target.value })} placeholder="Nom de la cliente" />
                      <input type="number" min="1" max="5" value={review.rating} onChange={(event) => updateReview(index, { rating: Number(event.target.value) })} />
                      <label className={styles.inlineCheck}><input type="checkbox" checked={review.isVisible} onChange={(event) => updateReview(index, { isVisible: event.target.checked })} />Visible</label>
                      <button type="button" onClick={() => saveReviewAt(index)} disabled={isPending}>Enregistrer</button>
                    </div>
                    <textarea value={review.comment} onChange={(event) => updateReview(index, { comment: event.target.value })} rows={3} placeholder="Commentaire" />
                    <button className={styles.dangerButton} type="button" onClick={() => removeReview(index, review.id)} disabled={isPending}>Supprimer l&apos;avis</button>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {activeTab === "apercu" && (
          <article className={styles.previewCard}>
            <div className={styles.previewHero}>
              {profile.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- Uploaded Supabase public URL.
                <img src={profile.coverImageUrl} alt="" />
              )}
              <div>
                <span>{profile.city || "Votre ville"}</span>
                <h2>{profile.businessName || "Votre salon"}</h2>
                <p>{profile.description || "Votre description apparaitra ici."}</p>
              </div>
            </div>
            <div className={styles.previewStats}>
              <span>{visibleServices.length} prestations</span>
              <span>{averageRating ? `${averageRating.toFixed(1)}/5` : "Avis a ajouter"}</span>
              <span>{profile.isPublished ? "Publiee" : "Non publiee"}</span>
            </div>
            <div className={styles.previewServices}>
              {visibleServices.slice(0, 3).map((service) => (
                <div key={service.id || service.name}>
                  <strong>{service.name}</strong>
                  <span>{service.durationMin} min - {formatPrice(service.price)}</span>
                </div>
              ))}
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

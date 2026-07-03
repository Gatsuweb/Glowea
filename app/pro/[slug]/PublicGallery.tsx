"use client";

import { useState } from "react";
import styles from "./publicProfile.module.css";

type GalleryImage = {
  imageUrl: string;
  alt: string;
};

const initialGalleryCount = 9;

export default function PublicGallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const hasHiddenImages = images.length > initialGalleryCount;
  const visibleImages = showAll ? images : images.slice(0, initialGalleryCount);
  const activeImage = activeIndex === null ? null : visibleImages[activeIndex];

  function goTo(delta: number) {
    if (activeIndex === null) return;
    setIsZoomed(false);
    setActiveIndex((activeIndex + delta + visibleImages.length) % visibleImages.length);
  }

  if (images.length === 0) {
    return (
      <div className={styles.galleryEmptyState}>
        Aucune image n&apos;est disponible actuellement.
      </div>
    );
  }

  return (
    <>
      <div className={styles.galleryGrid} id="public-gallery-grid">
        {visibleImages.map((image, index) => (
          <button
            className={styles.galleryItem}
            key={`${image.imageUrl}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Public gallery URLs are user-configured and not constrained to Next image domains. */}
            <img
              src={image.imageUrl}
              alt={image.alt || "Galerie beaute"}
              loading="lazy"
              decoding="async"
              width={640}
              height={640}
              sizes="(max-width: 640px) calc(50vw - 20px), (max-width: 980px) 30vw, 320px"
            />
          </button>
        ))}
      </div>

      {hasHiddenImages && (
        <div className={styles.showMoreWrap}>
          <button
            type="button"
            className={styles.showMoreButton}
            onClick={() => setShowAll((value) => !value)}
            aria-controls="public-gallery-grid"
            aria-expanded={showAll}
          >
            {showAll ? "Afficher moins de photos" : `Voir toute la galerie (${images.length})`}
          </button>
        </div>
      )}

      {activeImage && (
        <div className={styles.lightboxOverlay} role="dialog" aria-modal="true" aria-label="Galerie">
          <div className={styles.lightboxChrome}>
            <button type="button" onClick={() => goTo(-1)} aria-label="Image precedente">‹</button>
            <button type="button" onClick={() => setIsZoomed((value) => !value)} aria-label="Zoomer l'image">
              {isZoomed ? "Reduire" : "Zoom"}
            </button>
            <button type="button" onClick={() => goTo(1)} aria-label="Image suivante">›</button>
            <button type="button" onClick={() => { setActiveIndex(null); setIsZoomed(false); }} aria-label="Fermer">×</button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Public gallery URLs are user-configured and not constrained to Next image domains. */}
          <img
            className={isZoomed ? styles.lightboxImageZoomed : styles.lightboxImage}
            src={activeImage.imageUrl}
            alt={activeImage.alt || "Galerie beaute"}
            loading="eager"
            decoding="async"
            width={1200}
            height={900}
          />
        </div>
      )}
    </>
  );
}

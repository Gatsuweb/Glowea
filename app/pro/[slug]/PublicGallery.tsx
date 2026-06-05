"use client";

import { useState } from "react";
import styles from "./publicProfile.module.css";

type GalleryImage = {
  imageUrl: string;
  alt: string;
};

export default function PublicGallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const activeImage = activeIndex === null ? null : images[activeIndex];

  function goTo(delta: number) {
    if (activeIndex === null) return;
    setIsZoomed(false);
    setActiveIndex((activeIndex + delta + images.length) % images.length);
  }

  return (
    <>
      <div className={styles.galleryGrid}>
        {images.map((image, index) => (
          <button
            className={styles.galleryItem}
            key={`${image.imageUrl}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Public gallery URLs are user-configured and not constrained to Next image domains. */}
            <img src={image.imageUrl} alt={image.alt || "Galerie beaute"} />
          </button>
        ))}
      </div>

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
          />
        </div>
      )}
    </>
  );
}

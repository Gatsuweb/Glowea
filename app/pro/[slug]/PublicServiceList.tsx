"use client";

import { useState } from "react";
import PublicBookingModal from "./PublicBookingModal";
import styles from "./publicProfile.module.css";

type PublicService = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  category: string;
  imageUrl: string;
};

type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

const initialServiceCount = 6;

function formatPrice(value: number) {
  if (!value) return "Sur devis";
  return `A partir de ${new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export default function PublicServiceList({
  services,
  bookingServices,
  slug,
  title,
}: {
  services: PublicService[];
  bookingServices: BookingService[];
  slug: string;
  title: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasHiddenServices = services.length > initialServiceCount;
  const visibleServices = showAll ? services : services.slice(0, initialServiceCount);

  return (
    <>
      <div className={styles.serviceGrid} id="public-services-grid">
        {visibleServices.map((service) => (
          <PublicBookingModal
            key={service.id}
            slug={slug}
            services={bookingServices}
            initialServiceId={service.id}
            triggerClassName={styles.serviceCardButton}
            triggerLabel={`Reserver ${service.name}`}
            triggerContent={(
              <>
                {service.imageUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Public service URLs are user-configured and not constrained to Next image domains. */}
                    <img
                      src={service.imageUrl}
                      alt={`Prestation ${service.name} chez ${title}`}
                      className={styles.serviceCardImage}
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={480}
                      sizes="(max-width: 640px) calc(100vw - 60px), (max-width: 980px) 33vw, 45vw"
                    />
                  </>
                )}
                <div className={styles.serviceCardTop}>
                  <span className={styles.serviceCategory}>{service.category}</span>
                  <div className={styles.serviceCardCopy}>
                    <h3>{service.name}</h3>
                    <p className={styles.serviceDescription}>{service.description}</p>
                  </div>
                </div>
                <div className={styles.serviceMeta}>
                  <span className={styles.serviceMetaTag}>{service.durationMin} min</span>
                  <strong>{formatPrice(service.price)}</strong>
                </div>
                <div className={styles.serviceCardCta}>
                  <span>Reserver cette prestation</span>
                  <span aria-hidden="true">↗</span>
                </div>
              </>
            )}
          />
        ))}
      </div>

      {hasHiddenServices && (
        <div className={styles.showMoreWrap}>
          <button
            type="button"
            className={styles.showMoreButton}
            onClick={() => setShowAll((value) => !value)}
            aria-controls="public-services-grid"
            aria-expanded={showAll}
          >
            {showAll ? "Afficher moins de prestations" : `Voir toutes les prestations (${services.length})`}
          </button>
          {!showAll && (
            <p className={styles.showMoreHint}>
              Les prestations principales sont affichees en premier pour faciliter le choix.
            </p>
          )}
        </div>
      )}
    </>
  );
}

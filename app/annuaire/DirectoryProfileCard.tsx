/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { DirectoryProfile } from "../../lib/directory";
import styles from "./annuaire.module.css";

function formatPrice(value: number | null) {
  if (!value) return null;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getServiceSummary(profile: DirectoryProfile) {
  if (profile.services.length === 0) return "Prestations beauté";
  return profile.services.slice(0, 3).map((service) => service.name).join(", ");
}

function formatServiceTagLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getServiceTags(profile: DirectoryProfile) {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const service of profile.services) {
    const sourceLabel = (service.category || service.name).trim();
    if (!sourceLabel) continue;

    const normalizedLabel = sourceLabel
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (seen.has(normalizedLabel)) continue;

    seen.add(normalizedLabel);
    tags.push(formatServiceTagLabel(sourceLabel));

    if (tags.length === 3) break;
  }

  return tags;
}

function getStartingPrice(profile: DirectoryProfile) {
  const prices = profile.services
    .map((service) => service.price)
    .filter((price): price is number => Boolean(price && price > 0));

  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function getProfileInitial(profile: DirectoryProfile) {
  return profile.businessName.trim().charAt(0).toUpperCase() || "G";
}

export default function DirectoryProfileCard({ profile }: { profile: DirectoryProfile }) {
  const startingPrice = getStartingPrice(profile);
  const hasRating = profile.reviewCount > 0 && profile.averageRating;
  const serviceTags = getServiceTags(profile);

  return (
    <article className={styles.profileCard}>
      <Link className={styles.profileImageLink} href={`/pro/${profile.slug}`} aria-label={`Voir le profil de ${profile.businessName}`}>
        <img
          className={styles.profileImage}
          src={profile.coverImageUrl || profile.imageUrl || "/landing/fond.png"}
          alt={`Photo de couverture de ${profile.businessName}`}
        />
        <span className={styles.profileBadge} aria-hidden="true">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            getProfileInitial(profile)
          )}
        </span>
      </Link>

      <div className={styles.profileBody}>
        <div className={styles.profileHeader}>
          <div>
            <h2>{profile.businessName}</h2>
            {profile.city && profile.citySlug && (
              <Link className={styles.cityLink} href={`/annuaire/${profile.citySlug}`}>
                {profile.city}
              </Link>
            )}
          </div>

          <div className={styles.ratingBlock}>
            {hasRating ? (
              <>
                <strong>★ {profile.averageRating!.toFixed(1)}</strong>
                <span>{profile.reviewCount} avis</span>
              </>
            ) : (
              <>
                <strong>Nouveau</strong>
                <span>Avis à venir</span>
              </>
            )}
          </div>
        </div>

        <p className={styles.profileDescription}>
          {profile.description || "Profil public Glowea avec prestations beauté et réservation en ligne selon disponibilité."}
        </p>

        <p className={styles.serviceSummary}>{getServiceSummary(profile)}</p>

        {serviceTags.length > 0 && (
          <div className={styles.serviceTags}>
            {serviceTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.profileFooter}>
          <span>{startingPrice ? `À partir de ${formatPrice(startingPrice)}` : "Tarif sur profil"}</span>
          <Link className={styles.profileCta} href={`/pro/${profile.slug}`}>
            Voir le profil
          </Link>
        </div>
      </div>
    </article>
  );
}

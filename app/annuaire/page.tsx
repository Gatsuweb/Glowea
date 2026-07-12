/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../lib/seo";
import {
  filterDirectoryProfiles,
  getDirectoryCitiesFromProfiles,
  getDirectoryProfiles,
  slugifyDirectorySegment,
} from "../../lib/directory";
import DirectoryProfileCard from "./DirectoryProfileCard";
import styles from "./annuaire.module.css";

export const dynamic = "force-dynamic";

type DirectorySearchParams = {
  q?: string | string[];
  ville?: string | string[];
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getDirectoryDescription(profileCount: number) {
  if (profileCount <= 0) {
    return "L'annuaire Glowea reference les profils publics des professionnelles beaute utilisant Glowea.";
  }

  return `Consultez ${profileCount} profil${profileCount > 1 ? "s" : ""} public${profileCount > 1 ? "s" : ""} de professionnelles beaute sur Glowea, avec prestations, avis visibles et lien de reservation.`;
}

function getDirectoryJsonLd(profiles: Awaited<ReturnType<typeof getDirectoryProfiles>>) {
  const url = absoluteUrl("/annuaire");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Annuaire des professionnelles beauté Glowea",
        description: getDirectoryDescription(profiles.length),
        url,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: profiles.length,
          itemListElement: profiles.slice(0, 50).map((profile, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/pro/${profile.slug}`),
            name: profile.businessName,
            item: {
              "@type": "BeautySalon",
              name: profile.businessName,
              url: absoluteUrl(`/pro/${profile.slug}`),
              ...(profile.city
                ? {
                    address: {
                      "@type": "PostalAddress",
                      addressLocality: profile.city,
                      addressCountry: "FR",
                    },
                  }
                : {}),
            },
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Annuaire",
            item: url,
          },
        ],
      },
    ],
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const profiles = await getDirectoryProfiles();
  const description = getDirectoryDescription(profiles.length);

  return {
    title: "Annuaire des professionnelles beauté",
    description,
    alternates: {
      canonical: absoluteUrl("/annuaire"),
    },
    robots: {
      index: profiles.length > 0,
      follow: true,
    },
    openGraph: {
      title: "Annuaire des professionnelles beauté Glowea",
      description,
      url: absoluteUrl("/annuaire"),
      siteName: "Glowea",
      type: "website",
      locale: "fr_FR",
      images: [
        {
          url: absoluteUrl("/logo-mini.png"),
          alt: "Glowea",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "Annuaire des professionnelles beauté Glowea",
      description,
      images: [absoluteUrl("/logo-mini.png")],
    },
  };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<DirectorySearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = getSearchParam(resolvedSearchParams.q).trim();
  const citySlug = slugifyDirectorySegment(getSearchParam(resolvedSearchParams.ville));
  const profiles = await getDirectoryProfiles();
  const cities = getDirectoryCitiesFromProfiles(profiles);
  const filteredProfiles = filterDirectoryProfiles(profiles, { query, citySlug });
  const hasFilters = Boolean(query || citySlug);
  const directoryJsonLd = getDirectoryJsonLd(profiles);
  const selectedCity = cities.find((city) => city.slug === citySlug);

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryJsonLd) }}
      />
      <div className={styles.shell}>
        <nav className={styles.topbar} aria-label="Navigation annuaire">
          <Link className={styles.brandLink} href="/">
            <img src="/logo-glowea-fonce.png" alt="Glowea" />
          </Link>
          <div className={styles.navLinks}>
            <Link className={styles.navLinkActive} href="/annuaire">Annuaire</Link>
            <Link href="/">À propos</Link>
            <Link href="/pricing?plan=presence">Pour les professionnelles</Link>
          </div>
          <Link className={styles.proButton} href="/dashboard">Espace pro</Link>
        </nav>

        <section className={styles.hero} aria-labelledby="directory-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Annuaire public Glowea</span>
            <h1 id="directory-title">Trouvez votre professionnelle beauté</h1>
            <p>
              Extensions de cils, browlift, onglerie et beauté du regard près de chez vous, avec des profils publics
              lisibles et des liens de réservation.
            </p>
            {/* <div className={styles.stats} aria-label="Statistiques annuaire">
              <div>
                <span className={styles.statIcon} aria-hidden="true">G</span>
                <strong>{profiles.length}</strong>
                <span>professionnelle{profiles.length > 1 ? "s" : ""} referencee{profiles.length > 1 ? "s" : ""}</span>
              </div>
              <div>
                <span className={styles.statIcon} aria-hidden="true">V</span>
                <strong>{cities.length}</strong>
                <span>ville{cities.length > 1 ? "s" : ""} disponible{cities.length > 1 ? "s" : ""}</span>
              </div>
              <div>
                <span className={styles.statIcon} aria-hidden="true">P</span>
                <strong>Public</strong>
                <span>profils publies uniquement</span>
              </div>
            </div> */}
{/* 
            <div className={styles.stats} aria-label="Statistiques annuaire">
              <div>
                <span className={styles.statIcon} aria-hidden="true">G</span>
                <strong>{profiles.length}</strong>
                <span>professionnelle{profiles.length > 1 ? "s" : ""} référencée{profiles.length > 1 ? "s" : ""}</span>
              </div>
              <div>
                <span className={styles.statIcon} aria-hidden="true">V</span>
                <strong>{cities.length}</strong>
                <span>ville{cities.length > 1 ? "s" : ""} disponible{cities.length > 1 ? "s" : ""}</span>
              </div>
              <div>
                <span className={styles.statIcon} aria-hidden="true">R</span>
                <strong>24/7</strong>
                <span>réservation en ligne</span>
              </div>
            </div> */}
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <img src="/sourcils.png" alt="" />
          </div>

          <form className={styles.filters} action="/annuaire">
            <label>
              <span>Rechercher</span>
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Rechercher une professionnelle, une ville ou une prestation..."
              />
            </label>

            <label>
              <span>Ville</span>
              <select name="ville" defaultValue={citySlug}>
                <option value="">Toutes les villes</option>
                {cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">Rechercher</button>
            {hasFilters && <Link className={styles.resetLink} href="/annuaire">Réinitialiser</Link>}
          </form>
        </section>

        <section className={styles.professionalCta} aria-labelledby="directory-pro-cta">
          <div>
            <span className={styles.eyebrow}>Pour les professionnelles</span>
            <h2 id="directory-pro-cta">Vous etes professionnelle de la beauté ?</h2>
            <p>
              Créez votre page web professionnelle, présentez vos prestations et rejoignez l&apos;annuaire Glowea.
            </p>
          </div>
          <Link href="/pricing?plan=presence">Créer ma page professionnelle</Link>
        </section>

        {cities.length > 0 && (
          <section className={styles.citySection} aria-labelledby="directory-cities">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="directory-cities">Explorer par ville</h2>
                <p>Des adresses beauté sélectionnées parmi les profils publics actifs.</p>
              </div>
              <a href="#seo-cities">Voir toutes les villes</a>
            </div>
            <div className={styles.cityList}>
              {cities.map((city) => (
                <Link className={styles.cityCard} href={`/annuaire/${city.slug}`} key={city.slug}>
                  {/* <span className={styles.cityIcon} aria-hidden="true">
                    {city.name.charAt(0).toUpperCase()}
                  </span> */}
                  <span className={styles.cityCardContent}>
                    <strong>{city.name}</strong>
                    <small>{city.profileCount} professionnelle{city.profileCount > 1 ? "s" : ""}</small>
                  </span>
                  <em aria-hidden="true">→</em>
                </Link>
              ))}
            </div>
          </section>
        )}

        {cities.length === 0 && (
          <section className={styles.emptyState} aria-labelledby="directory-no-cities">
            <h2 id="directory-no-cities">Aucune ville disponible pour le moment</h2>
            <p>
              Les pages villes apparaissent automatiquement des qu&apos;un profil public actif renseigne une ville.
            </p>
          </section>
        )}

        <section className={styles.resultsSection} aria-labelledby="directory-results">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="directory-results">Les professionnelles</h2>
              <p>
                {selectedCity
                  ? `Profils disponibles à ${selectedCity.name}.`
                  : "Découvrez les professionnelles beauté disponibles près de chez vous."}
              </p>
            </div>
            <span className={styles.resultCount}>
              {filteredProfiles.length} résultat{filteredProfiles.length > 1 ? "s" : ""}
            </span>
          </div>

          {filteredProfiles.length > 0 ? (
            <div className={styles.grid}>
              {filteredProfiles.map((profile) => (
                <DirectoryProfileCard profile={profile} key={profile.slug} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h2>Aucun profil public trouvé</h2>
              <p>
                Modifiez votre recherche ou revenez plus tard : l&apos;annuaire affiche uniquement les profils publiés
                et actifs.
              </p>
            </div>
          )}
        </section>

        <section className={styles.trustSection} aria-labelledby="directory-trust">
          <h2 id="directory-trust">Pourquoi réserver avec Glowea ?</h2>
          <div className={styles.trustGrid}>
            <article>
              <span aria-hidden="true">R</span>
              <h3>Réservation en ligne</h3>
              <p>Prenez rendez-vous depuis les profils publics, selon les disponibilités de chaque professionnelle.</p>
            </article>
            <article>
              <span aria-hidden="true">P</span>
              <h3>Professionnelles vérifiées</h3>
              <p>Les fiches affichent uniquement les informations publiques publiées par les prestataires actifs.</p>
            </article>
            <article>
              <span aria-hidden="true">S</span>
              <h3>Paiement sécurisé</h3>
              <p>Lorsque les arrhes sont activées, le paiement est géré via les outils sécurisés de Glowea.</p>
            </article>
          </div>
        </section>

        {cities.length > 0 && (
          <footer className={styles.seoFooter} id="seo-cities">
            <p>Professionnelles beauté disponibles à :</p>
            <div>
              {cities.map((city) => (
                <Link href={`/annuaire/${city.slug}`} key={city.slug}>
                  {city.name}
                </Link>
              ))}
            </div>
            <span aria-hidden="true">G</span>
          </footer>
        )}
      </div>
    </main>
  );
}

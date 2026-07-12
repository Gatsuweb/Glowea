/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectoryCityPage } from "../../../lib/directory";
import { absoluteUrl } from "../../../lib/seo";
import DirectoryProfileCard from "../DirectoryProfileCard";
import styles from "../annuaire.module.css";

export const dynamic = "force-dynamic";

function getCityDescription(cityName: string, profileCount: number) {
  return `Découvrez ${profileCount} profil${profileCount > 1 ? "s" : ""} public${profileCount > 1 ? "s" : ""} de professionnelles beauté à ${cityName} sur Glowea, avec prestations, avis visibles et lien vers chaque page de réservation.`;
}

function getCityJsonLd(page: NonNullable<Awaited<ReturnType<typeof getDirectoryCityPage>>>) {
  const url = absoluteUrl(`/annuaire/${page.city.slug}`);
  const title = `Professionnelles beauté à ${page.city.name}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description: getCityDescription(page.city.name, page.profiles.length),
        url,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: page.profiles.length,
          itemListElement: page.profiles.slice(0, 50).map((profile, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/pro/${profile.slug}`),
            name: profile.businessName,
            item: {
              "@type": "BeautySalon",
              name: profile.businessName,
              url: absoluteUrl(`/pro/${profile.slug}`),
              address: {
                "@type": "PostalAddress",
                addressLocality: page.city.name,
                addressCountry: "FR",
              },
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
            item: absoluteUrl("/annuaire"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.city.name,
            item: url,
          },
        ],
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ville: string }>;
}): Promise<Metadata> {
  const { ville } = await params;
  const page = await getDirectoryCityPage(ville);

  if (!page) {
    return {
      title: "Ville indisponible",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `Professionnelles beauté à ${page.city.name}`;
  const description = getCityDescription(page.city.name, page.profiles.length);
  const url = absoluteUrl(`/annuaire/${page.city.slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${title} | Glowea`,
      description,
      url,
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
      title: `${title} | Glowea`,
      description,
      images: [absoluteUrl("/logo-mini.png")],
    },
  };
}

export default async function DirectoryCityPage({
  params,
}: {
  params: Promise<{ ville: string }>;
}) {
  const { ville } = await params;
  const page = await getDirectoryCityPage(ville);

  if (!page) {
    notFound();
  }

  const directoryJsonLd = getCityJsonLd(page);

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
            <Link href="/annuaire">Annuaire</Link>
            <Link href="/">À propos</Link>
            <Link href="/pricing?plan=presence">Pour les professionnelles</Link>
          </div>
          <Link className={styles.proButton} href="/dashboard">Espace pro</Link>
        </nav>

        <section className={`${styles.hero} ${styles.cityHero}`} aria-labelledby="city-title">
          <div className={styles.heroCopy}>
            <Link className={styles.backLink} href="/annuaire">
              Retour à l&apos;annuaire
            </Link>
            <span className={styles.eyebrow}>Annuaire local</span>
            <h1 id="city-title">Professionnelles beauté à {page.city.name}</h1>
            <p>
              Consultez les profils publics Glowea disponibles à {page.city.name}. Chaque fiche présente les
              prestations visibles, les avis publics et le lien vers la page de réservation.
            </p>

            {/* <div className={styles.stats} aria-label={`Statistiques annuaire ${page.city.name}`}>
              <div>
                <span className={styles.statIcon} aria-hidden="true">G</span>
                <strong>{page.profiles.length}</strong>
                <span>profil{page.profiles.length > 1 ? "s" : ""} actif{page.profiles.length > 1 ? "s" : ""}</span>
              </div>
              <div>
                <span className={styles.statIcon} aria-hidden="true">V</span>
                <strong>{page.city.name}</strong>
                <span>ville indexable</span>
              </div>
              <div>
                <span className={styles.statIcon} aria-hidden="true">R</span>
                <strong>24/7</strong>
                <span>réservation en ligne</span>
              </div>
            </div> */}
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <img src="/cils.png" alt="" />
          </div>
        </section>

        <section className={styles.professionalCta} aria-labelledby="city-pro-cta">
          <div>
            <span className={styles.eyebrow}>Pour les professionnelles</span>
            <h2 id="city-pro-cta">Vous etes professionnelle de la beaute ?</h2>
            <p>
              Creez votre page web professionnelle, presentez vos prestations et rejoignez l&apos;annuaire Glowea.
            </p>
          </div>
          <Link href="/pricing?plan=presence">Creer ma page professionnelle</Link>
        </section>

        <section className={styles.resultsSection} aria-labelledby="city-results">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="city-results">Profils publiés à {page.city.name}</h2>
              <p>Cette page existe uniquement parce qu&apos;au moins un profil public actif est disponible dans cette ville.</p>
            </div>
            <span className={styles.resultCount}>
              {page.profiles.length} résultat{page.profiles.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className={styles.grid}>
            {page.profiles.map((profile) => (
              <DirectoryProfileCard profile={profile} key={profile.slug} />
            ))}
          </div>
        </section>

        <section className={styles.trustSection} aria-labelledby="city-trust">
          <h2 id="city-trust">Pourquoi réserver avec Glowea ?</h2>
          <div className={styles.trustGrid}>
            <article>
              <span aria-hidden="true">R</span>
              <h3>Réservation en ligne</h3>
              <p>Accédez à la page publique de chaque professionnelle et réservez selon ses disponibilités.</p>
            </article>
            <article>
              <span aria-hidden="true">P</span>
              <h3>Informations visibles</h3>
              <p>Les profils affichent uniquement les informations publiques choisies par la professionnelle.</p>
            </article>
            <article>
              <span aria-hidden="true">S</span>
              <h3>Expérience sécurisée</h3>
              <p>Glowea centralise les profils publics, avis visibles et liens de réservation dans un cadre clair.</p>
            </article>
          </div>
        </section>

        <footer className={styles.seoFooter}>
          <p>Continuer votre recherche :</p>
          <div>
            <Link href="/annuaire">Annuaire Glowea</Link>
            <Link href={`/annuaire/${page.city.slug}`}>{page.city.name}</Link>
          </div>
          <span aria-hidden="true">G</span>
        </footer>
      </div>
    </main>
  );
}

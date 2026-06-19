import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import prisma from "../../../lib/prisma";
import { syncAppointmentPaymentFromCheckoutSessionId } from "../../../lib/stripeAppointmentSync";
import { getSubscriptionAccessFromTenant } from "../../../lib/subscription";
import PublicBookingModal from "./PublicBookingModal";
import PublicGallery from "./PublicGallery";
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

const fallbackGallery = [
  { imageUrl: "/cils.png", alt: "Pose de cils" },
  { imageUrl: "/ongles.png", alt: "Prestation ongles" },
  { imageUrl: "/sourcils.png", alt: "Sourcils" },
  { imageUrl: "/cils.png", alt: "Volume russe" },
];

const iconPaths = {
  location: "M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.25-1.25a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M22 6l-10 7L2 6",
  instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z M17.5 6.5h.01",
  web: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z",
  clock: "M12 6v6l4 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  services: "M4 7h16 M4 12h16 M4 17h10",
};

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPaths[name]} />
    </svg>
  );
}

function formatPrice(value: number) {
  if (!value) return "Sur devis";
  return `A partir de ${new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function normalizeInstagram(value: string | null) {
  if (!value) return null;
  if (value.includes("instagram.com")) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

function getServiceCardImage(service: PublicService) {
  if (service.imageUrl) return service.imageUrl;

  const text = `${service.name} ${service.category} ${service.description}`.toLowerCase();

  if (text.includes("volume russe")) return "/volume-russe.png";
  if (text.includes("mega")) return "/mega-volume.png";
  if (text.includes("mixte")) return "/mixte.png";
  if (text.includes("cil") || text.includes("lash")) return "/cils.png";
  if (text.includes("ongle") || text.includes("manuc") || text.includes("gel") || text.includes("semi")) return "/ongles.png";
  if (text.includes("sourcil") || text.includes("brow")) return "/sourcils.png";

  return "/card-1.png";
}

export default async function PublicProPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ booking?: string; appointmentId?: string; session_id?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const profile = await prisma.publicProfile.findUnique({
    where: { slug },
    include: {
      Tenant: {
        include: {
          Service: {
            where: { isActive: true, isPublic: true },
            orderBy: [{ category: "asc" }, { name: "asc" }],
          },
          GalleryImage: {
            where: { isPublic: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          },
          Review: {
            where: { isVisible: true },
            orderBy: { createdAt: "desc" },
            take: 12,
          },
        },
      },
    },
  });

  if (
    !profile ||
    !profile.isPublished ||
    !getSubscriptionAccessFromTenant(profile.Tenant).canUsePublicPage
  ) {
    notFound();
  }

  if (resolvedSearchParams.booking === "success" && resolvedSearchParams.session_id) {
    try {
      await syncAppointmentPaymentFromCheckoutSessionId(
        resolvedSearchParams.session_id,
        resolvedSearchParams.appointmentId || null
      );
    } catch (error) {
      console.error("[stripe:public-booking] checkout sync failed", error);
    }
  }

  const services: PublicService[] = profile.Tenant.Service.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description || "Prestation realisee avec un suivi personnalise.",
    durationMin: service.durationMin || 60,
    price: service.price ? Number(service.price.toString()) : 0,
    category: service.category || "Prestation",
    imageUrl: service.imageUrl || "",
  }));

  const gallery = profile.Tenant.GalleryImage.length > 0 ? profile.Tenant.GalleryImage : fallbackGallery;
  const galleryImages = gallery.map((image) => ({ imageUrl: image.imageUrl, alt: image.alt || "Galerie beaute" }));
  const bookingServices = services.map((service) => ({
    id: service.id,
    name: service.name,
    durationMin: service.durationMin,
    price: service.price,
  }));
  const instagramUrl = normalizeInstagram(profile.instagramUrl);
  const title = profile.businessName || profile.Tenant.name;
  const reviews = profile.Tenant.Review;
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.coverWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Public profile URLs are user-configured and not constrained to Next image domains. */}
              <img src={profile.coverImageUrl || "/landing/fond.png"} alt="" className={styles.coverImage} />
            </div>
            <div className={styles.identityRow}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Public avatar URLs are user-configured and not constrained to Next image domains. */}
              <img src={profile.avatarUrl || "/logo-mini.png"} alt="" className={styles.avatar} />
              <div>
                <span className={styles.kicker}>Studio beaute</span>
                <h1>{title}</h1>
                {profile.city && <p className={styles.cityLine}>{profile.city}</p>}
              </div>
            </div>
            <p className={styles.description}>
              {profile.description || "Des prestations beaute soignees, avec reservation simple et suivi personnalise."}
            </p>

            <PublicBookingModal
              slug={profile.slug}
              services={bookingServices}
              triggerClassName={styles.primaryCta}
              triggerLabel="Reserver un rendez-vous"
            />

            <div className={styles.infoList}>
              {(profile.address || profile.city) && (
                <div><Icon name="location" /><span>Adresse</span><strong>{[profile.address, profile.city].filter(Boolean).join(", ")}</strong></div>
              )}
              {profile.phone && (
                <div><Icon name="phone" /><span>Telephone</span><a href={`tel:${profile.phone}`}>{profile.phone}</a></div>
              )}
              {profile.email && (
                <div><Icon name="mail" /><span>Email</span><a href={`mailto:${profile.email}`}>{profile.email}</a></div>
              )}
              {instagramUrl && (
                <div><Icon name="instagram" /><span>Instagram</span><a href={instagramUrl} target="_blank" rel="noreferrer">Voir le profil</a></div>
              )}
              {profile.websiteUrl && (
                <div><Icon name="web" /><span>Site web</span><a href={profile.websiteUrl} target="_blank" rel="noreferrer">Ouvrir le site</a></div>
              )}
              {profile.openingHours && (
                <div><Icon name="clock" /><span>Horaires</span><strong>{profile.openingHours}</strong></div>
              )}
            </div>
          </div>
        </aside>

        <div className={styles.content}>
          <section className={styles.hero}>
            <h2>Catalogue des Services</h2>
            <p>Découvrez notre sélection soigneusement élaborée de soins de beauté haut de gamme, conçus pour sublimer votre élégance naturelle grâce à un savoir-faire minutieux.</p>
          </section>

          <section className={styles.catalogSection}>
            {/* <div className={styles.sectionHeader}>
              <p>{services.length} prestation{services.length > 1 ? "s" : ""} disponible{services.length > 1 ? "s" : ""} a la reservation.</p>
            </div> */}
            <div className={styles.serviceGrid}>
              {services.map((service) => (
                <PublicBookingModal
                  key={service.id}
                  slug={profile.slug}
                  services={bookingServices}
                  initialServiceId={service.id}
                  triggerClassName={styles.serviceCardButton}
                  triggerLabel={`Reserver ${service.name}`}
                  triggerStyle={
                    {
                      "--service-card-image": `url("${getServiceCardImage(service)}")`,
                    } as CSSProperties
                  }
                  triggerContent={(
                    <>
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
          </section>

          <section className={styles.gallerySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.kicker}>NOS CRÉATIONS</span>
              <h3>Portfolio & Galerie</h3>
              <p>Un apercu du travail, des details et de l&apos;univers du studio.</p>
            </div>
            <PublicGallery images={galleryImages} />
          </section>

          {reviews.length > 0 && (
            <section className={styles.reviewsSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.kicker}>Avis clientes</span>
                <h2>{averageRating.toFixed(1)}/5</h2>
                <p>Base sur {reviews.length} avis cliente{reviews.length > 1 ? "s" : ""}.</p>
              </div>
              <div className={styles.reviewGrid}>
                {reviews.map((review) => (
                  <article className={styles.reviewCard} key={review.id}>
                    <div className={styles.stars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                    <p>{review.comment}</p>
                    <strong>{review.authorName}</strong>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className={styles.mobileStickyCta}>
        <PublicBookingModal
          slug={profile.slug}
          services={bookingServices}
          triggerClassName={styles.stickyCtaButton}
          triggerLabel="Reserver maintenant"
        />
      </div>
    </main>
  );
}

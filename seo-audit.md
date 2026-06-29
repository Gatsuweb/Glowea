# Audit SEO Glowea

Date: 2026-06-29  
Scope: audit technique SEO du projet Next.js, sans suppression ni modification de fonctionnalite applicative.

## Synthese

Glowea n'est pas encore pret pour une forte indexation Google en tant que plateforme de reservation beaute.

Le point bloquant est l'indexabilite: la route publique strategique `/pro/[slug]` est actuellement protegee par Clerk via `proxy.ts`. Meme si la page est rendue cote serveur et contient du contenu utile, Google ne peut pas la crawler comme page publique.

Les autres manques critiques sont l'absence de metadata dynamiques, canonical, Open Graph, Twitter cards, JSON-LD, `robots.txt` et `sitemap.xml`. La home est statique et contient du contenu HTML indexable, mais elle herite d'un title et d'une description "Dashboard", ce qui affaiblit fortement son affichage en recherche.

Points positifs:

- `/` est generee en statique au build.
- `/pro/[slug]` est rendue cote serveur avec Prisma.
- Les donnees publiques du profil utilisent deja des filtres utiles: profil publie, services actifs/publics, galerie publique, avis visibles.
- Les slugs sont propres: minuscules, sans accents, separes par tirets.

## Verification effectuee

Commande executee:

```bash
npm.cmd run build
```

Resultat: build OK.

Rendu observe dans la sortie Next:

- `/` est statique.
- `/pro/[slug]` est dynamique, rendu serveur a la demande.
- `/pricing` est dynamique.
- `/dashboard/*`, `/settings/*` et les API sont dynamiques.

Limite de l'audit: pas de mesure Lighthouse/PageSpeed reelle lancee. La partie Core Web Vitals ci-dessous est donc une analyse statique fondee sur le code, les assets et le HTML genere.

## Carte des pages

| Route | Statut actuel | SEO attendu | Risque |
|---|---:|---:|---|
| `/` | publique, statique | indexable | title/description incorrects, pas de canonical, pas d'OG/Twitter/schema |
| `/pro/[slug]` | rendue serveur, mais protegee par Clerk | indexable si profil publie | P0: inaccessible aux crawlers |
| `/pricing` | dynamique et protegee par Clerk | a clarifier | si page marketing, elle doit etre publique; si checkout, noindex |
| `/sign-in`, `/sign-up` | publiques | noindex | actuellement heritent de metadata generiques |
| `/dashboard/*` | protegees | noindex/non crawlable | protection OK, mais ajouter noindex defensif |
| `/settings/*` | protegees | noindex/non crawlable | protection OK, mais ajouter noindex defensif |
| `/api/*` | majoritairement protegees | non indexable | attention a ouvrir seulement les API strictement publiques |

## P0 - Bloquants SEO

### P0.1 - Les profils publics `/pro/[slug]` sont bloques par Clerk

Fichiers:

- `proxy.ts`
- `app/pro/[slug]/page.tsx`
- `app/api/public-booking/[slug]/availability/route.ts`

Constat:

- `proxy.ts` ne declare comme publiques que `/`, `/sign-in`, `/sign-up`, `/api/cron` et `/api/stripe/webhook`.
- Toute route non listee appelle `auth.protect()`.
- `/pro/[slug]` n'est pas dans la liste publique.
- `/api/public-booking/[slug]/availability` n'est pas publique non plus.

Impact:

- Googlebot ne peut pas crawler les pages professionnelles.
- Les pages de reservation publiques ne peuvent pas devenir des landing pages locales.
- Si `/pro/[slug]` est ouverte sans ouvrir l'API de disponibilite necessaire, la page sera visible mais l'experience de reservation publique restera cassee.

Recommendation:

- Ajouter explicitement aux routes publiques:
  - `/pro(.*)`
  - `/api/public-booking(.*)`
- Ne pas ouvrir `/dashboard(.*)`, `/settings(.*)`, `/api/public-profile(.*)` ni les APIs de gestion tenant.
- Apres ouverture, tester en navigation privee et avec `curl` sans cookie.

Risque multi-tenant:

- L'ouverture doit rester limitee aux routes qui re-filtrent par `slug`, `isPublished`, `isPublic`, `isVisible` et `tenantId`.
- Ne jamais rendre publiques les routes d'upload ou d'administration du profil public.

### P0.2 - Metadata globales incorrectes et non dynamiques

Fichier:

- `app/layout.tsx`

Constat:

```ts
title: "Glowéa - Dashboard"
description: "Dashboard pour techniciennes de cils et ongles"
```

Ces metadata sont appliquees globalement, y compris a la home, aux pages auth, a `/pricing` et aux profils `/pro/[slug]`.

Impact:

- La home apparait comme un dashboard, pas comme une plateforme de reservation beaute.
- Tous les profils professionnels risquent d'avoir le meme title et la meme description.
- Google recommande des titles descriptifs, concis et distincts par page.

Recommendation:

- Definir des metadata par segment:
  - `/`: title et description marketing Glowea.
  - `/pro/[slug]`: `generateMetadata()` dynamique depuis `PublicProfile`.
  - `/sign-in`, `/sign-up`: noindex.
  - `/dashboard/*`, `/settings/*`: noindex defensif.
- Ajouter `metadataBase` avec l'URL de production.

Exemple attendu pour un profil:

```ts
title: `${businessName} - Réservation beauté à ${city} | Glowea`
description: `${businessName} propose ${topServices} à ${city}. Consultez les prestations, avis, horaires et réservez en ligne.`
```

### P0.3 - Pas de canonical

Fichiers:

- `app/layout.tsx`
- `app/page.tsx`
- `app/pro/[slug]/page.tsx`

Constat:

- Aucun `alternates.canonical`.
- Aucun canonical dans le HTML genere.
- `/pro/[slug]` peut etre appelee avec des query params de booking: `?booking=success&appointmentId=...&session_id=...`.

Impact:

- Risque de duplication entre `/pro/slug` et `/pro/slug?booking=...`.
- Les URLs de retour Stripe peuvent etre partagees ou crawlees accidentellement.
- Les signaux SEO des profils peuvent etre dilues.

Recommendation:

- Ajouter un canonical self-referent sur `/` et `/pro/[slug]`.
- Pour toute URL de confirmation ou annulation, canonicaliser vers `/pro/[slug]`.
- Idealement, deplacer le retour booking vers une page ou route noindex, par exemple `/pro/[slug]/reservation/confirmation`.

### P0.4 - Pas de sitemap

Fichiers attendus:

- `app/sitemap.ts` ou `public/sitemap.xml`

Constat:

- Aucun `app/sitemap.ts`.
- Aucun `public/sitemap.xml`.

Impact:

- Les profils publies ne sont pas decouvrables automatiquement.
- Une plateforme avec beaucoup de pages locales a besoin d'un sitemap dynamique.

Recommendation:

- Creer `app/sitemap.ts`.
- Inclure:
  - `/`
  - `/pricing` seulement si elle devient une page marketing publique.
  - `/pro/[slug]` seulement si:
    - `PublicProfile.isPublished = true`
    - l'abonnement autorise `canUsePublicPage`
    - le tenant existe.
- Exclure:
  - `/dashboard/*`
  - `/settings/*`
  - `/sign-in`
  - `/sign-up`
  - toutes les API
  - les profils non publies ou sans acces public.

Risque Prisma:

- La requete sitemap doit inclure le tenant et les donnees d'abonnement necessaires pour ne jamais lister une page inactive.
- Ajouter une limite ou un sitemap index si le nombre de profils grandit fortement.

### P0.5 - Pas de robots.txt ni de strategie robots par page

Fichiers attendus:

- `app/robots.ts` ou `public/robots.txt`
- metadata robots par layout/page

Constat:

- Aucun `robots.txt`.
- Aucun `app/robots.ts`.
- Aucun `robots` dans les metadata applicatives.

Impact:

- Les pages auth peuvent etre indexees.
- Les pages privees sont protegees par Clerk, mais il manque un signal SEO defensif.
- Les moteurs ne recoivent pas l'emplacement du sitemap.

Recommendation:

- Ajouter `app/robots.ts` avec:
  - `Allow: /`
  - `Allow: /pro/`
  - `Disallow: /dashboard/`
  - `Disallow: /settings/`
  - `Disallow: /api/`
  - `Disallow: /sign-in`
  - `Disallow: /sign-up`
  - `Sitemap: https://www.domaine-production.fr/sitemap.xml`
- Ajouter `robots: { index: false, follow: false }` sur auth/dashboard/settings.

Important:

- `robots.txt` ne doit pas etre considere comme une barriere de securite.
- La securite multi-tenant reste assuree par auth, tenantId et controles serveur.

## P1 - Priorite forte

### P1.1 - Open Graph et Twitter cards absents

Constat:

- Aucun `openGraph`.
- Aucun `twitter`.
- Aucun `metadataBase`.
- Aucune image sociale specifique.

Impact:

- Partages LinkedIn, Instagram, WhatsApp, X et autres plateformes peu qualitatifs.
- Les pages professionnelles ne mettent pas en avant le salon, la ville ou les prestations.

Recommendation:

- Ajouter OG/Twitter pour la home:
  - `og:title`
  - `og:description`
  - `og:url`
  - `og:type: website`
  - `og:image`
  - `twitter:card: summary_large_image`
- Ajouter OG/Twitter dynamiques pour `/pro/[slug]`:
  - `og:title = businessName + city`
  - `og:description = description courte`
  - `og:image = coverImageUrl || avatarUrl || image par defaut`
  - `og:type = profile` ou `website`

### P1.2 - Aucun schema.org / JSON-LD

Fichiers:

- `app/page.tsx`
- `app/pro/[slug]/page.tsx`

Constat:

- Aucun script `application/ld+json`.
- Aucun schema.org.

Impact:

- Google comprend moins bien la nature locale des pages professionnelles.
- Pas de donnees structurees pour salon, adresse, avis, services, reservation.

Recommendation home:

- Ajouter `Organization`.
- Ajouter `WebSite`.
- Ajouter `SoftwareApplication` ou `WebApplication` pour Glowea.

Recommendation profils `/pro/[slug]`:

- Ajouter `BeautySalon` ou `HealthAndBeautyBusiness`.
- Champs utiles:
  - `name`
  - `description`
  - `url`
  - `image`
  - `address`
  - `telephone`
  - `email`
  - `sameAs` pour Instagram/site externe
  - `openingHours` si formatable
  - `aggregateRating` si avis visibles
  - `review` si avis visibles
  - `makesOffer` ou `hasOfferCatalog` pour services publics.

Contraintes qualite:

- Ne mettre en JSON-LD que les donnees visibles sur la page.
- Ne pas inventer d'adresse, prix, horaires ou note.
- Ne pas inclure les services masques, inactifs ou non publics.

### P1.3 - `/pricing` doit etre clarifiee: page publique marketing ou checkout prive

Fichiers:

- `app/pricing/page.tsx`
- `app/pricing/PricingCheckoutClient.tsx`
- `proxy.ts`

Constat:

- `/pricing` est force-dynamic.
- Elle utilise `useSearchParams`.
- Elle declenche Stripe checkout.
- Elle n'est pas publique dans `proxy.ts`.

Impact:

- Si Glowea veut ranker sur "logiciel rendez-vous beaute", "logiciel extension de cils", "tarif logiciel institut", la page pricing doit etre publique, indexable et enrichie.
- Si c'est une page de paiement post-auth, elle doit rester privee et noindex.

Recommendation:

- Separarer:
  - `/tarifs` ou section home indexable pour le marketing.
  - `/pricing` ou `/checkout` privee/noindex pour Stripe.
- Eviter de melanger SEO acquisition et flux paiement authentifie.

### P1.4 - LCP et poids image de la home

Fichiers:

- `app/components/HeroTabletShowcase.tsx`
- `public/mockup-dashboard-glowea.png`
- `app/globals.css`
- `public/paper-texture.png`

Constat:

- L'image hero `/mockup-dashboard-glowea.png` pese environ 1,43 Mo.
- Elle est en `priority`, avec `width={1712}` et `height={1072}`, mais sans `sizes`.
- Le HTML genere precharge des variantes jusqu'a 3840 px.
- Le body charge `/paper-texture.png` en background global, fichier d'environ 1,61 Mo.

Impact:

- Risque LCP eleve sur mobile.
- Risque de bande passante excessive.
- Les backgrounds CSS ne beneficient pas de l'optimisation `next/image`.

Recommendation:

- Convertir le hero en WebP/AVIF responsive.
- Ajouter `sizes` sur l'image hero.
- Reduire les dimensions source si l'image n'a pas besoin de 1712 px sur mobile.
- Remplacer la texture globale lourde par une version compressee, un motif CSS leger ou une image beaucoup plus petite.

### P1.5 - Clerk charge sur la home publique

Fichier:

- `app/layout.tsx`

Constat:

- `ClerkProvider` enveloppe tout le site.
- Le HTML genere de la home charge le script Clerk et precharge l'UI Clerk.

Impact:

- JS tiers supplementaire sur la page d'acquisition.
- Risque INP/TBT plus eleve.
- Dependence externe inutile sur les pages qui n'ont pas besoin d'etat auth immediat.

Recommendation:

- Isoler Clerk dans un route group prive/auth, par exemple:
  - layout public sans Clerk pour `/` et `/pro/[slug]`
  - layout auth pour `/sign-in`, `/sign-up`
  - layout app pour `/dashboard`, `/settings`
- Si Clerk doit rester global, verifier s'il existe une configuration de chargement plus paresseuse adaptee.

### P1.6 - Images des profils publics non optimisees

Fichiers:

- `app/pro/[slug]/page.tsx`
- `app/pro/[slug]/PublicGallery.tsx`
- `next.config.ts`
- `app/api/public-profile/*/upload/route.ts`

Constat:

- Les images utilisateur sont rendues avec `<img>` car les domaines distants ne sont pas configures pour `next/image`.
- `next.config.ts` autorise seulement `img.clerk.com`.
- Le fallback cover `/landing/fond.png` pese environ 3,81 Mo.
- Les images de services sont affichees en CSS `background-image`, pas en `<img>`.

Impact:

- Mauvais LCP possible sur `/pro/[slug]`.
- Images moins bien exploitees par Google Images.
- Pas de resize responsive automatique.

Recommendation:

- Ajouter les domaines Supabase publics dans `images.remotePatterns`.
- Utiliser `next/image` pour cover, avatar et galerie lorsque possible.
- Generer des variantes compressees lors de l'upload.
- Remplacer les images de service en background par des `<img>` avec `alt`.
- Eviter le fallback `/landing/fond.png` trop lourd.

### P1.7 - Slug change sans redirection permanente

Fichiers:

- `app/actions/publicPageActions.ts`
- `prisma/schema.prisma`
- `app/pro/[slug]/page.tsx`

Constat:

- Le slug est editable.
- `revalidatePath()` est appele sur l'ancien et le nouveau slug.
- Il n'y a pas de table d'historique de slugs ni redirect 301 observee.

Impact:

- Si une professionnelle change son slug, l'ancienne URL peut devenir 404.
- Perte de backlinks, signaux locaux et partages sociaux.

Recommendation:

- Ajouter une table `PublicProfileSlugRedirect` ou un champ historique.
- Quand un slug change, rediriger l'ancien vers le nouveau avec 301.
- Conserver le canonical sur le nouveau slug.

### P1.8 - Retour Stripe et side-effect dans la page publique

Fichier:

- `app/pro/[slug]/page.tsx`

Constat:

- La page lit `searchParams`.
- Si `booking=success` et `session_id` existent, elle synchronise le paiement Stripe pendant le rendu serveur.

Impact:

- La page publique devient dependante de query params transactionnels.
- Cela empeche une strategie de cache/ISR simple pour `/pro/[slug]`.
- Les URLs de confirmation peuvent polluer l'index si elles deviennent accessibles.

Recommendation:

- Deplacer la synchronisation dans une route dediee ou un webhook.
- Afficher la confirmation via une page noindex ou via etat client.
- Garder `/pro/[slug]` comme page canonique stable, sans effet transactionnel au rendu.

## P2 - Optimisations et croissance SEO

### P2.1 - Alt images incomplets

Fichiers:

- `app/page.tsx`
- `app/pro/[slug]/page.tsx`
- `app/pro/[slug]/PublicGallery.tsx`
- `app/dashboard/page-publique/PagePubliqueClient.tsx`

Constat:

- Home:
  - l'image session a un alt descriptif.
  - les images specialites ont `alt=""`.
- Profil public:
  - cover et avatar ont `alt=""`.
  - galerie utilise un alt DB ou fallback generique.
  - service cards utilisent une image de fond CSS sans alt.

Recommendation:

- Home specialites:
  - `Illustration prestations cils`
  - `Illustration prestations sourcils`
  - `Illustration prestations ongles`
- Profil public:
  - cover: `Photo de couverture de ${businessName}`
  - avatar: `Logo ou portrait de ${businessName}`
  - galerie: rendre le champ alt obligatoire ou fortement suggere dans l'UI.
- Services:
  - utiliser `<img>` ou `next/image` avec alt base sur le nom de la prestation.

### P2.2 - Fonts lourdes en TTF

Fichiers:

- `app/globals.css`
- `public/fonts/*`

Constat:

- `Inter-VariableFont_opsz,wght.ttf` pese environ 875 Ko.
- Les fonts sont chargees via `@font-face`.
- Pas de `next/font`.

Impact:

- Poids initial eleve.
- Risque de retard de rendu texte selon reseau.

Recommendation:

- Convertir en WOFF2 ou utiliser `next/font/local`.
- Subsetter les graisses necessaires.
- Garder `font-display: swap`.

### P2.3 - Manifest PWA oriente dashboard

Fichier:

- `public/manifest.json`

Constat:

- Description: dashboard.
- `start_url`: `/dashboard`.

Impact:

- Correct pour l'app authentifiee, moins coherent pour une plateforme publique.

Recommendation:

- Si Glowea reste une PWA metier: garder `/dashboard`.
- Si Glowea veut etre aussi une plateforme publique installable: creer une strategie manifest plus large ou ajuster description/iconographie.

### P2.4 - Pas de pages annuaire, ville ou categorie

Constat:

- Les seules pages publiques SEO observees sont `/` et, une fois debloquees, `/pro/[slug]`.
- Il n'existe pas de pages crawlables de type:
  - `/beaute/paris`
  - `/extensions-de-cils/lyon`
  - `/ongles/bordeaux`
  - `/instituts/[ville]`

Impact:

- Difficile d'obtenir une forte indexation Google seulement avec une home et des profils isoles.
- Peu de maillage interne entre profils.

Recommendation MVP progressive:

1. D'abord corriger les P0 techniques.
2. Ensuite creer une page annuaire publique simple, par ville ou specialite, avec seulement les profils publies.
3. Ajouter pagination crawlable et liens vers les profils.
4. Eviter le contenu duplique: chaque page ville/specialite doit avoir une vraie proposition locale.

### P2.5 - Pagination non applicable aujourd'hui, a prevoir pour l'annuaire

Constat:

- Pas de pagination publique SEO actuellement.
- Les listes dashboard sont privees, donc hors scope SEO.

Recommendation future:

- Pour un annuaire public, eviter l'infinite scroll seul.
- Preferer des URLs crawlables:
  - `/beaute/paris?page=2`
  - ou `/beaute/paris/page/2`
- Ajouter canonical self-referent par page paginee.
- Ne pas canonicaliser toutes les pages paginees vers la page 1 si leur contenu differe.
- Garder des liens HTML classiques vers page suivante/precedente.

### P2.6 - URLs SEO a renforcer

Fichiers:

- `app/actions/publicPageActions.ts`
- `prisma/schema.prisma`

Constat:

- `slugify()` nettoie correctement les accents, caracteres speciaux et limite a 60 caracteres.
- `Service.slug` existe mais n'est pas utilise pour des pages publiques.
- Les profils ont une URL simple `/pro/[slug]`.

Recommendation:

- Conserver `/pro/[slug]` pour la beta.
- Plus tard, ajouter des URLs de decouverte:
  - `/pro/[slug]/prestations/[serviceSlug]` si les prestations ont assez de contenu unique.
  - `/reservation/[slug]` seulement si besoin produit, avec canonical coherent.
- Ne pas changer les slugs existants sans redirects 301.

### P2.7 - TypeScript ignore les erreurs au build

Fichier:

- `next.config.ts`

Constat:

```ts
typescript: {
  ignoreBuildErrors: true,
}
```

Impact:

- Une erreur de type dans `generateMetadata`, sitemap, robots ou JSON-LD pourrait passer en production.

Recommendation:

- A terme, retirer `ignoreBuildErrors`.
- Au minimum, ajouter des tests ou validations dediees pour metadata/sitemap/schema quand ces fichiers seront ajoutes.

## Checklist par sujet demande

| Sujet | Etat | Priorite |
|---|---|---|
| Metadata dynamiques | absentes | P0 |
| Title | global et incorrect | P0 |
| Description | globale et incorrecte | P0 |
| Canonical | absent | P0 |
| Robots | absent | P0 |
| Sitemap | absent | P0 |
| Open Graph | absent | P1 |
| Twitter cards | absent | P1 |
| Schema.org | absent | P1 |
| JSON-LD | absent | P1 |
| Alt images | partiel | P2 |
| Core Web Vitals | risques forts sur JS tiers, images, fonts | P1 |
| SSR / SSG | home statique, profil SSR dynamique | P1 |
| Indexabilite pages publiques | `/pro/[slug]` bloque | P0 |
| Pagination | pas de pagination publique | P2 |
| URL SEO | base correcte, redirects manquants | P1 |

## Plan d'action recommande

### Etape 1 - Debloquer l'indexation publique

Fichiers probables:

- `proxy.ts`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/layout.tsx`
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`

Actions:

- Ouvrir `/pro(.*)` et `/api/public-booking(.*)` dans Clerk.
- Ajouter `robots.ts`.
- Ajouter `sitemap.ts`.
- Ajouter metadata globales propres avec `metadataBase`.
- Ajouter noindex sur auth et espaces prives.

### Etape 2 - Rendre les profils SEO-ready

Fichiers probables:

- `app/pro/[slug]/page.tsx`
- eventuellement `app/pro/[slug]/layout.tsx`
- `next.config.ts`

Actions:

- Ajouter `generateMetadata()`.
- Ajouter canonical dynamique.
- Ajouter OG/Twitter dynamiques.
- Ajouter JSON-LD `BeautySalon`.
- Optimiser cover/avatar/galerie.
- Sortir les query params transactionnels de la page canonique.

### Etape 3 - Optimiser la home

Fichiers probables:

- `app/page.tsx`
- `app/components/HeroTabletShowcase.tsx`
- `app/globals.css`
- assets dans `public/`

Actions:

- Corriger title/description.
- Ajouter JSON-LD `Organization`, `WebSite`, `SoftwareApplication`.
- Optimiser hero image et texture.
- Sortir Clerk du layout public si possible.

### Etape 4 - Construire la croissance SEO

Fichiers futurs:

- routes publiques annuaire
- composants de listing
- requetes Prisma filtrees par publication/abonnement

Actions:

- Creer des pages ville/specialite.
- Ajouter pagination crawlable.
- Ajouter maillage interne home -> annuaire -> profils -> prestations.
- Ajouter redirects 301 sur changement de slug.

## Risques Prisma et multi-tenant a surveiller

Actuellement correct sur `/pro/[slug]`:

- recherche du profil par slug;
- blocage si profil absent, non publie ou sans acces public;
- services filtres `isActive: true` et `isPublic: true`;
- galerie filtree `isPublic: true`;
- avis filtres `isVisible: true`;
- creation de booking avec verification `tenantId: profile.tenantId`.

Points a surveiller lors des corrections:

- Le sitemap ne doit jamais lister des profils non publies, expirés ou sans droit public.
- Les pages annuaire futures doivent toujours filtrer par `isPublished`, abonnement public actif et donnees publiques.
- Les APIs d'upload et de configuration doivent rester protegees.
- Les JSON-LD ne doivent pas exposer de donnees privees tenant/client.
- Les pages publiques ne doivent pas afficher de donnees client issues des rendez-vous.

## References externes utilisees

- Google Search Central - robots.txt: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Google Search Central - sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google Search Central - canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search Central - title links: https://developers.google.com/search/docs/appearance/title-link
- Google Search Central - meta descriptions: https://developers.google.com/search/docs/appearance/snippet
- Google Search Central - structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google Search Central - image SEO: https://developers.google.com/search/docs/appearance/google-images
- Google Search Central - Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Schema.org - BeautySalon: https://schema.org/BeautySalon

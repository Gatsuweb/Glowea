# Glowea Architecture

## Objectif

Glowea est un SaaS multi-tenant pour professionnelles beaute : cils, lash lift, browlift et ongles.

Objectif actuel : livrer une beta privee simple, stable et vendable.

## Stack

- Next.js App Router
- React
- TypeScript
- Prisma
- Supabase PostgreSQL
- Supabase Storage
- Clerk
- Stripe et Stripe Connect
- Web Push
- Twilio SMS
- Vercel

## Structure principale

- `app/dashboard` : application connectee.
- `app/actions` : server actions metier.
- `app/api` : routes API, webhooks et integrations externes.
- `app/components` : composants client reutilises entre pages.
- `lib` : services partages, helpers metier, integrations.
- `prisma` : schema et migrations.
- `public` : assets statiques.
- `docs` : documentation release et reference projet.

## Principes d'architecture

- Une fonctionnalite doit rester localisee dans son domaine.
- La logique partagee doit aller dans `lib`.
- Les mutations tenant doivent verifier `tenantId`.
- Les mutations payantes doivent verifier l'acces abonnement si necessaire.
- Les routes serveur ne doivent jamais exposer les secrets.
- Les composants client ne doivent pas contenir de logique serveur critique.

## Multi-tenant

Regle obligatoire : toutes les lectures et mutations de donnees tenant doivent filtrer par `tenantId`, ou par une relation prouvee a un objet deja filtre par `tenantId`.

Points sensibles :
- clients
- rendez-vous
- sessions
- media
- paiements
- notifications
- templates
- produits et stock
- page publique

## Authentification

Clerk gere l'identite utilisateur.

`getTenantId()` est le point central pour resoudre le tenant courant. Toute nouvelle logique serveur doit s'appuyer sur ce tenant.

## Integrations externes

- Stripe classique : abonnement Glowea.
- Stripe Connect : paiements clientes vers le compte de la professionnelle.
- Supabase Storage : images publiques et photos.
- Web Push : notifications navigateur/PWA.
- Twilio : rappels SMS.

## Risques connus

- Des erreurs TypeScript existent encore hors perimetre release.
- Certaines fonctionnalites Pro doivent rester bloquees selon abonnement.
- Les paiements clientes et l'abonnement Glowea sont deux flux Stripe distincts.
- Les notifications doivent respecter les preferences utilisateur.


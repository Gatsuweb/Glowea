# Glowea Deployment

## Cible

Plateforme prevue : Vercel.

Base : Supabase PostgreSQL.

Storage : Supabase Storage.

Auth : Clerk.

Paiements : Stripe.

## Commandes

Developpement :

```bash
npm run dev
```

Build :

```bash
npm run build
```

Lint :

```bash
npm run lint
```

Typecheck recommande :

```bash
npx tsc --noEmit
```

## Variables d'environnement

Voir `docs/release/release-checklist.md`.

Categories :
- Clerk ;
- PostgreSQL/Supabase ;
- Supabase Storage ;
- Stripe ;
- Stripe Connect ;
- Twilio ;
- Web Push ;
- App URL.

## Pre-production

Avant production :
- base staging ;
- projet Clerk staging ;
- compte Stripe test ;
- bucket Supabase staging ;
- VAPID staging ;
- domaine de test ;
- webhooks Stripe de test.

## Risques connus

- `tsc --noEmit` ne passe pas actuellement.
- Les webhooks Stripe doivent etre testes avec Stripe CLI ou environnement staging.
- La PWA necessite HTTPS pour les push.
- Les politiques Supabase Storage doivent etre validees avant production.
- La route `/api/dev/reset-user` doit rester strictement indisponible en production.

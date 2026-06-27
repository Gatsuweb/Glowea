# Glowea Bugs

## Critiques

### TypeScript ne passe pas

- description : `npx tsc --noEmit` echoue sur plusieurs erreurs TypeScript hors dernier perimetre modifie.
- impact : bloque une release professionnelle fiable et peut cacher des regressions.
- statut : corrige
- date : 2026-06-25
- correction : `npx tsc --noEmit` passe. Les derniers blocages corriges concernaient `ProblemOrbitSection`, `StockClientWrapper`, `dashboard/page`, `settings/payments/page`, `appointmentPayments` et le build `next/font/google`.

## Importants

### Widget didacticiel absent apres inscription

- description : le composant `OnboardingChecklist` existait mais n'etait pas rendu dans le dashboard.
- impact : les nouveaux utilisateurs ne voyaient pas le guide de demarrage.
- statut : corrige
- date : 2026-06-25
- correction : rendu ajoute dans `app/dashboard/layout.tsx`.

### Textes avec caracteres mal encodes

- description : plusieurs textes francais affichent des caracteres mojibake.
- impact : perception produit degradee et risque UX.
- statut : corrige
- date : 2026-06-25
- correction : scan cible sur `app` et `lib` sans reste `Ã`, `â`, `�` ou texte visible `?` connu. Dernier texte corrige dans `NewProductModal`.

### Toggle publicBookingChange sans flux metier complet

- description : la preference existe en base/API mais le flux public d'annulation/modification n'existe pas encore.
- impact : risque de promettre une notification non fonctionnelle.
- statut : mitige
- date : 2026-06-25
- correction : toggle retire de l'UI tant que le flux metier n'est pas implemente.

## Mineurs

### Warnings ESLint existants

- description : warnings sur `HeroTabletShowcase.tsx` et `StockClientWrapper.tsx`.
- impact : bruit qualite, non bloquant.
- statut : corrige
- date : 2026-06-25
- correction : warnings ESLint corriges dans `HeroTabletShowcase.tsx` et `StockClientWrapper.tsx`.

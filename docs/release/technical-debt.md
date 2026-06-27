# Glowea Technical Debt

## Critique

- `tsc --noEmit` ne passe pas.
- Certaines erreurs TypeScript indiquent des contrats de donnees incomplets.
- Plusieurs textes visibles ont un encodage degrade.

## Architecture

- Centraliser davantage les notifications metier dans `lib/notificationEvents.ts`.
- Eviter la duplication de logique paiement push entre webhook Stripe et helper dedie.
- Continuer a extraire les gros wrappers client si leur taille gene la maintenabilite.

## Prisma et multi-tenant

- Auditer toutes les requetes sans `tenantId`.
- Documenter les exceptions ou les relations parent qui garantissent le tenant.
- Preferer les suppressions logiques quand l'historique depend de la donnee.

## Notifications

- `publicBookingChangeEnabled` existe mais n'a pas encore de flux metier.
- Ajouter tests pour les preferences push.
- Ajouter monitoring des echecs push.

## Stripe

- Renforcer tests d'idempotence webhook.
- Unifier les helpers de notification paiement.
- Verifier tous les statuts paiement utilises par Prisma et UI.

## UI

- Corriger mojibake.
- Harmoniser les boutons destructifs.
- Auditer les layouts mobiles avec captures.

## Tests

- Ajouter tests unitaires pour helpers critiques.
- Ajouter tests integration pour routes API critiques.
- Ajouter checklist manuelle de beta par appareil.


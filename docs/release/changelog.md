# Glowea Changelog

## 0.1.0-beta-onboarding

### Ajout

- Ajout du rendu du widget de guide de demarrage dans le layout dashboard.

### Modification

- Le guide de demarrage est disponible sur toutes les pages du dashboard connecte.

### Correction

- Correction du widget didacticiel qui ne s'affichait pas apres inscription car le composant n'etait pas monte.

## 0.1.0-beta-auth-reset

### Ajout

- Ajout d'une route dev-only `POST /api/dev/reset-user` pour supprimer un utilisateur local par email et repartir sur un compte vierge.

### Modification

- `getTenantId()` cherche maintenant d'abord par `clerkUserId`, puis par email avant de creer un tenant.
- En cas d'email deja existant avec un autre compte Clerk, `getTenantId()` echoue explicitement au lieu de creer un tenant partiel.
- La creation tenant/user est idempotente pour eviter les collisions quand plusieurs requetes arrivent pendant l'inscription.

### Correction

- Correction du risque `Unique constraint failed on email` lors de la recreation locale d'un compte avec le meme email apres suppression Clerk.
- Correction du risque `Unique constraint failed on Tenant.id` pendant l'inscription.

## 0.1.0-beta-notifications

### Ajout

- Ajout du filtrage push par preference utilisateur.
- Ajout des notifications stock faible.
- Ajout des notifications cliente fidele.
- Ajout du push pour les rappels automatiques J-1.

### Modification

- Les push reservation en ligne respectent `onlineBookingEnabled`.
- Les push paiement recu respectent `paymentReceivedEnabled`.
- Le toggle annulation/modification page publique est masque tant que le flux metier n'existe pas.

### Correction

- Les toggles de notifications affiches correspondent maintenant a des evenements push reels.

## 0.1.0-beta-templates

### Ajout

- Ajout de la suppression logique des templates personnalises.

### Modification

- Les templates systeme restent non supprimables.

### Correction

- Les templates crees manuellement par un tenant peuvent etre retires de la liste sans supprimer l'historique.

## 0.1.0-beta-docs

### Ajout

- Ajout du dossier `/docs`.
- Ajout des documents release.
- Ajout de la checklist beta.
- Ajout de la checklist production.
- Ajout du suivi bugs et dette technique.

### Modification

- Documentation initiale alignee sur l'architecture actuelle Glowea.

### Correction

- Aucune correction code dans cette version documentaire.

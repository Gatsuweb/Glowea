# Glowea Database

## Technologie

Base de donnees : Supabase PostgreSQL.

ORM : Prisma.

Schema principal : `prisma/schema.prisma`.

## Modeles critiques

- `Tenant` : espace client SaaS.
- `User` : utilisateur Clerk lie a un tenant.
- `Client` : cliente finale de la professionnelle.
- `Appointment` : rendez-vous.
- `Session` : seance technique.
- `Media`, `ClientMedia`, `SessionMedia` : photos et galerie.
- `Service`, `ServiceCategory` : prestations.
- `Product`, `ProductLot`, `StockMovement` : stock.
- `Notification`, `NotificationPreference`, `PushSubscription` : notifications.
- `MessageTemplate`, `Campaign`, `MessageLog` : campagnes.
- `Subscription`, `PaymentUser`, `BillingProfile` : abonnement et paiements.
- `PublicProfile`, `GalleryImage`, `Review` : page publique.

## Regles multi-tenant

- Toujours filtrer les modeles tenant par `tenantId`.
- Ne jamais faire confiance a un `clientId`, `appointmentId`, `mediaId` ou `templateId` venant du client sans verifier le tenant.
- Pour les modeles sans `tenantId` direct, verifier via la relation parent.
- Les suppressions doivent etre logiques quand l'historique peut dependre de la donnee.

## Resolution tenant et utilisateur

`getTenantId()` doit rester robuste face aux recreations de compte Clerk.

Ordre attendu :
- chercher le `User` par `clerkUserId` ;
- sinon lire l'email Clerk courant ;
- chercher un `User` existant par email ;
- si l'email existe deja avec un autre `clerkUserId`, ne pas creer automatiquement un nouveau tenant ;
- en production, traiter ce cas prudemment et ne jamais supprimer les donnees automatiquement ;
- en developpement, utiliser la route dev-only de reset si un compte vierge est necessaire.

Route dev-only :

```text
POST /api/dev/reset-user
```

Body :

```json
{
  "email": "test@example.com",
  "confirm": "RESET_DEV_USER"
}
```

Cette route est indisponible hors `NODE_ENV=development`.

## Migrations

Les migrations Prisma sont dans `prisma/migrations`.

Avant production :
- verifier que toutes les migrations passent sur une base vierge ;
- verifier que les migrations passent sur une base de staging avec donnees ;
- verifier que les champs obligatoires ont des valeurs par defaut si ajoute tardivement ;
- executer `prisma generate` avant build.

## Donnees sensibles

- Secrets Stripe : jamais en base publique ni cote client.
- Service role Supabase : jamais cote client.
- Donnees clientes : protegees par tenant et Clerk.
- Consentements : doivent rester historises.

## Risques connus

- `tsc --noEmit` echoue actuellement sur plusieurs erreurs hors perimetre.
- Certaines suppressions doivent rester logiques pour preserver l'historique.
- Les notifications stock et fidelite creent des entrees `Notification` selon evenements metier.

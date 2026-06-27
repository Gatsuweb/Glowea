# Glowea Notifications

## Types

Glowea gere :
- notifications in-app dans la cloche ;
- notifications push navigateur/PWA ;
- SMS de rappel ;
- emails et templates de campagnes.

## Preferences utilisateur

Modele : `NotificationPreference`.

Toggles visibles dans `/dashboard/profil`, onglet Notifications :
- `pushEnabled` : activation globale push ;
- `stockLowEnabled` : stock faible ;
- `loyalClientThanksEnabled` : cliente fidele a remercier ;
- `onlineBookingEnabled` : nouvelle reservation en ligne ;
- `paymentReceivedEnabled` : paiement recu ;
- `automaticFollowUpEnabled` : relances automatiques.

Le toggle `publicBookingChangeEnabled` existe en base et API, mais n'est pas affiche tant qu'il n'existe pas de flux public d'annulation/modification.

## Push

Service central : `lib/push.ts`.

Regles :
- `pushEnabled` doit etre actif ;
- le toggle specifique doit etre actif quand fourni ;
- les subscriptions invalides 404/410 sont supprimees ;
- les cles VAPID sont obligatoires pour envoyer en production.

## Evenements cables

- Stock faible : `stockLowEnabled`.
- Cliente fidele : `loyalClientThanksEnabled`.
- Nouvelle reservation en ligne : `onlineBookingEnabled`.
- Paiement recu : `paymentReceivedEnabled`.
- Rappel rendez-vous J-1 : `automaticFollowUpEnabled`.

## SMS

Les rappels SMS utilisent Twilio et les parametres de tenant.

Points a verifier :
- opt-in SMS ;
- statut abonnement Pro ;
- logs d'envoi ;
- idempotence ;
- fuseau horaire.

## Emails

Les templates SMS/email sont dans `MessageTemplate`.

Regles :
- templates systeme non supprimables ;
- templates personnalises supprimables logiquement ;
- filtrage par `tenantId` obligatoire ;
- validation taille nom, objet et contenu.

## Risques connus

- Les notifications stock faible declenchent uniquement au franchissement du seuil.
- Les notifications fidelite declenchent au 5e rendez-vous termine.
- Le flux public d'annulation/modification n'est pas encore implemente.


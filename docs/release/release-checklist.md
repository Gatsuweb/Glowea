# Glowea Release Checklist

## Produit

- [ ] Parcours beta defini clairement
- [ ] Proposition de valeur beta validee
- [ ] Perimetre MVP fige
- [ ] Fonctionnalites hors MVP masquees ou bloquees

## Fonctionnalites

- [ ] Authentification Clerk fonctionnelle
- [ ] Gestion clientes fonctionnelle
- [ ] Fiche cliente complete fonctionnelle
- [ ] Rendez-vous fonctionnels
- [ ] Sessions techniques fonctionnelles
- [ ] Galerie cliente fonctionnelle
- [ ] Stock fonctionnel
- [ ] Comptabilite fonctionnelle
- [ ] Page publique fonctionnelle
- [ ] Templates SMS/email fonctionnels

## Bugs critiques

- [ ] `npm run build` passe
- [ ] `npx tsc --noEmit` passe
- [ ] Aucun crash bloquant sur dashboard
- [ ] Aucun crash bloquant sur agenda
- [ ] Aucun crash bloquant sur clients
- [ ] Aucun crash bloquant sur page publique

## Bugs mineurs

- [ ] Warnings ESLint traites ou acceptes
- [ ] Textes mojibake corriges
- [ ] Etats vides harmonises
- [ ] Messages erreur harmonises

## Dette technique

- [ ] Dettes critiques documentees
- [ ] Logiques temporaires documentees
- [ ] Duplications critiques reduites
- [ ] Helpers metier reutilisables

## UX

- [ ] Navigation dashboard claire
- [ ] Formulaires comprehensibles
- [ ] Feedback succes/erreur visible
- [ ] Chargements visibles
- [ ] Actions destructives confirmees

## Responsive

- [ ] Mobile 360px teste
- [ ] Mobile 390px teste
- [ ] Tablette testee
- [ ] Desktop teste
- [ ] Aucun chevauchement texte/bouton

## Accessibilite

- [ ] Boutons avec labels explicites
- [ ] Etats disabled visibles
- [ ] Contrastes suffisants
- [ ] Navigation clavier verifiee
- [ ] Modales avec fermeture claire

## Performance

- [ ] Pages dashboard chargees sans lenteur critique
- [ ] Images optimisees ou contraintes
- [ ] Requetes Prisma principales auditees
- [ ] Build production verifie

## Securite

- [ ] Secrets absents du client
- [ ] Routes API protegees
- [ ] Mutations serveur protegees
- [ ] Uploads valident type et taille
- [ ] Actions destructives verifiees serveur

## Multi-tenant

- [ ] Toutes les lectures tenant filtrent par `tenantId`
- [ ] Toutes les mutations tenant filtrent par `tenantId`
- [ ] Media verifies par tenant
- [ ] Rendez-vous verifies par tenant
- [ ] Templates verifies par tenant
- [ ] Paiements verifies par tenant

## Stripe

- [ ] Checkout abonnement teste
- [ ] Customer Portal teste
- [ ] Stripe Connect onboarding teste
- [ ] Paiement arrhes teste
- [ ] Paiement complet teste
- [ ] Webhook Stripe teste
- [ ] Idempotence webhook verifiee

## Clerk

- [ ] Connexion testee
- [ ] Inscription testee
- [ ] Recreation compte avec meme email testee en developpement
- [ ] Redirections protegees testees
- [ ] Tenant cree correctement
- [ ] Deconnexion testee

## Notifications Push

- [ ] Permission navigateur testee
- [ ] Inscription subscription testee
- [ ] Desactivation globale testee
- [ ] Stock faible teste
- [ ] Cliente fidele testee
- [ ] Reservation en ligne testee
- [ ] Paiement recu teste
- [ ] Relance automatique testee

## Emails

- [ ] Creation template email testee
- [ ] Modification template email testee
- [ ] Suppression template personnalise testee
- [ ] Template systeme non supprimable
- [ ] Variables template verifiees

## SMS

- [ ] Configuration Twilio verifiee
- [ ] Toggle rappels SMS teste
- [ ] Envoi rappel SMS teste
- [ ] Logs SMS testes
- [ ] Erreurs SMS gerees

## PWA

- [ ] Manifest valide
- [ ] Service worker valide
- [ ] Installation mobile testee
- [ ] Push en contexte HTTPS teste

## Supabase Storage

- [ ] Bucket public configure
- [ ] Policies validees
- [ ] Upload galerie publique teste
- [ ] Upload photos session teste
- [ ] Suppression media testee
- [ ] Chemins incluent `tenantId`

## Variables d'environnement

- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_APPLICATION_FEE_AMOUNT` ou `STRIPE_APPLICATION_FEE_PERCENT`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_SUBJECT`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`

## Base de donnees

- [ ] Migrations appliquees staging
- [ ] Migrations appliquees production
- [ ] Seed non necessaire en production
- [ ] Backup configure
- [ ] Donnees sensibles protegees

## Juridique

- [ ] CGU
- [ ] CGV
- [ ] Politique de confidentialite
- [ ] Politique cookies
- [ ] Mentions legales
- [ ] Consentement RGPD
- [ ] Suppression de compte
- [ ] Export des donnees

## Tests fonctionnels

- [ ] Parcours inscription
- [ ] Parcours creation cliente
- [ ] Parcours rendez-vous
- [ ] Parcours session
- [ ] Parcours paiement
- [ ] Parcours page publique

## Tests mobiles

- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] Tablette
- [ ] PWA installee
- [ ] Navigation tactile

## Beta privee

- [ ] Liste beta testeuses
- [ ] Support beta defini
- [ ] Canal feedback defini
- [ ] Monitoring erreurs actif
- [ ] Procedure rollback definie

## Production

- [ ] Domaine configure
- [ ] Vercel configure
- [ ] Webhooks production actifs
- [ ] Monitoring actif
- [ ] Backup actif
- [ ] Decision go/no-go documentee

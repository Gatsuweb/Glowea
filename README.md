# Glowea

Glowea est un SaaS pour les professionnelles beaute : cils, lash lift, browlift et ongles.

## Lancer le projet

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Stripe Connect Express

Stripe Connect Express permet a chaque professionnelle de beaute de connecter son propre compte Stripe pour recevoir les arrhes et paiements de ses clientes.

Glowea agit comme plateforme :
- la cliente paie via Stripe Checkout ;
- Stripe transfere l'argent vers le compte Stripe Express de la professionnelle ;
- Glowea peut ajouter une commission via `STRIPE_APPLICATION_FEE_AMOUNT` ou `STRIPE_APPLICATION_FEE_PERCENT`.

## Variables d'environnement

Les paiements Stripe Connect ont besoin de ces variables :

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optionnel pour la commission Glowea :

```env
STRIPE_APPLICATION_FEE_AMOUNT=100
STRIPE_APPLICATION_FEE_PERCENT=2
```

Les montants sont en centimes cote API Stripe. Par exemple `100` signifie `1,00 EUR`.

## Acceder aux parametres paiements

La page de configuration est :

```text
/settings/payments
```

En local :

```text
http://localhost:3000/settings/payments
```

Actuellement, on y accede de deux facons :
- directement par l'URL `/settings/payments` ;
- depuis l'agenda, si la professionnelle clique sur un bouton de paiement alors que Stripe n'est pas encore configure, Glowea la redirige vers cette page.

## Connecter le compte Stripe d'une professionnelle

1. Se connecter a Glowea avec le compte de la professionnelle.
2. Aller sur `/settings/payments`.
3. Cliquer sur `Connecter mon compte Stripe`.
4. Stripe ouvre l'onboarding Express.
5. La professionnelle renseigne ses informations Stripe.
6. A la fin, Stripe renvoie vers `/settings/payments`.
7. Cliquer sur `Rafraichir le statut` si le statut ne s'actualise pas automatiquement.

Les paiements clients restent bloques tant que Stripe n'indique pas que le compte peut recevoir des paiements.

Les statuts affiches sont :
- `Non connecte` : aucun compte Stripe Express n'est cree ;
- `Configuration incomplete` : un compte existe, mais l'onboarding n'est pas termine ;
- `Paiements actifs` : le compte Stripe peut recevoir des paiements.

## Configurer les arrhes par defaut

Sur `/settings/payments`, la section `Arrhes par defaut` permet de choisir :
- `Montant fixe` : exemple `20` pour demander `20,00 EUR` ;
- `Pourcentage` : exemple `30` pour demander `30%` du prix du rendez-vous.

Ces arrhes par defaut sont utilisees quand un rendez-vous n'a pas encore de montant d'arrhes specifique.

Exemple :
- prestation a `80 EUR` ;
- arrhes par defaut `25%` ;
- Glowea demandera `20 EUR` d'arrhes.

## Demander des arrhes a une cliente

1. Aller dans `/dashboard/agenda`.
2. Trouver le rendez-vous de la cliente.
3. Verifier le bloc paiement du rendez-vous :
   - `Prix`
   - `Arrhes`
   - `Reste`
   - badge de statut paiement
4. Cliquer sur `Demander les arrhes`.
5. Glowea cree une session Stripe Checkout.
6. La professionnelle est redirigee vers l'URL Stripe Checkout.
7. Cette URL peut etre envoyee a la cliente.
8. Quand la cliente paie, le webhook Stripe met le rendez-vous en `Arrhes payees`.

Si Stripe Connect n'est pas encore actif, Glowea redirige vers `/settings/payments` au lieu de creer le paiement.

## Demander le paiement complet

1. Aller dans `/dashboard/agenda`.
2. Trouver le rendez-vous.
3. Cliquer sur `Paiement complet`.
4. Glowea cree une session Stripe Checkout pour le prix total du rendez-vous.
5. Quand la cliente paie, le webhook Stripe met le rendez-vous en `Paye`.

Le bouton est bloque si le rendez-vous est deja paye.

## Statuts paiement des rendez-vous

Les statuts utilises sont :

- `none` : aucun paiement demande ou recu ;
- `deposit_pending` : un lien d'arrhes a ete cree ;
- `deposit_paid` : les arrhes ont ete payees ;
- `paid` : le paiement complet a ete recu ;
- `refunded` : paiement rembourse.

Dans l'interface agenda, ces statuts sont affiches en francais :

- `Non paye`
- `Arrhes demandees`
- `Arrhes payees`
- `Paye`
- `Rembourse`

## Webhook Stripe

La route webhook est :

```text
POST /api/stripe/webhook
```

Elle traite deja les abonnements Glowea. Elle traite aussi les paiements rendez-vous quand la session Stripe contient :

```text
appointmentId
tenantId
userId
paymentType
```

Pour les rendez-vous :
- `paymentType = deposit` met le rendez-vous en `deposit_paid` ;
- `paymentType = full` met le rendez-vous en `paid` ;
- `stripePaymentIntentId` est sauvegarde sur le rendez-vous.

## Points de securite importants

- Ne jamais exposer `STRIPE_SECRET_KEY` cote client.
- Ne jamais creer un paiement si `paymentsEnabled` est faux.
- Toujours filtrer les rendez-vous par `tenantId`.
- Les montants envoyes a Stripe sont en centimes.
- L'abonnement Glowea et les paiements clientes sont deux flux differents :
  - abonnement Glowea : Stripe classique avec `stripeCustomerId` sur le tenant ;
  - paiement cliente : Stripe Connect avec `stripeAccountId` sur l'utilisateur professionnel.

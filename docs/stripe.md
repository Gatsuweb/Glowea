# Glowea Stripe

## Flux Stripe

Glowea utilise deux flux Stripe distincts.

## Abonnement Glowea

Objectif : facturer la professionnelle pour utiliser Glowea.

Elements :
- Checkout abonnement.
- Customer Portal.
- Webhook Stripe.
- Donnees sur `Tenant` et `Subscription`.

Points critiques :
- verifier `stripeCustomerId`;
- synchroniser le statut d'abonnement ;
- bloquer les fonctionnalites selon l'abonnement ;
- gerer trial, annulation, reactivation, past due.

## Stripe Connect

Objectif : permettre a chaque professionnelle de recevoir les paiements clientes.

Elements :
- compte Stripe Express ;
- onboarding Stripe Connect ;
- statut `paymentsEnabled` ;
- sessions Checkout rendez-vous ;
- transfert vers le compte connecte ;
- commission Glowea optionnelle.

Variables :
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_APPLICATION_FEE_AMOUNT`
- `STRIPE_APPLICATION_FEE_PERCENT`

## Paiements rendez-vous

Types :
- arrhes ;
- paiement complet ;
- paiement restant.

Regles :
- montants en centimes ;
- verifier `tenantId` et `appointmentId` ;
- ne pas creer de paiement si Stripe Connect n'est pas actif ;
- webhook idempotent ;
- notification push `paymentReceivedEnabled`.

## Risques Stripe

- Melange possible entre abonnement Glowea et paiement cliente.
- Webhook doit rester idempotent.
- Les montants doivent toujours etre convertis correctement.
- Les paiements doivent etre bloques si le compte Connect ne peut pas recevoir de fonds.
- Tester les retours success/cancel et les webhooks sur staging.


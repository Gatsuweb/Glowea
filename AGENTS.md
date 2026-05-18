<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
# Glowea - Instructions pour Codex

Glowea est un SaaS pour les professionnelles beauté :
- extensions de cils
- lash lift
- browlift
- ongles

Stack :
- Next.js
- TypeScript
- Prisma
- Supabase PostgreSQL
- Clerk
- Stripe plus tard
- Vercel

Objectif actuel :
Sortir une version bêta utilisable, simple et vendable.

Priorités produit :
1. Authentification
2. Gestion des clientes
3. Fiche cliente complète
4. Rendez-vous
5. Séances techniques
6. Historique client
7. Responsive mobile/tablette
8. Sécurité multi-tenant

Règles importantes :
- Ne jamais modifier plusieurs modules à la fois sans raison.
- Ne jamais créer une grosse feature sans plan.
- Toujours expliquer les fichiers modifiés.
- Toujours vérifier les risques Prisma et multi-tenant.
- Toujours vérifier que les données sont filtrées par tenantId ou userId.
- Toujours éviter les fonctionnalités non nécessaires au MVP.
- Toujours privilégier une solution simple, lisible et maintenable.

Avant de modifier du code :
- analyser le problème
- proposer un plan
- lister les fichiers concernés
- attendre confirmation si la modification est large

Après modification :
- indiquer les changements
- indiquer les tests à faire
- signaler les risques restants

<!-- END:nextjs-agent-rules -->

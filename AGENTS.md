# Guide des agents — Plume

Ce document décrit les conventions du dépôt, les commandes fiables et les garde-fous à respecter. Il complète `README.md` et `apps/mobile/AGENTS.md` (instructions spécifiques à Expo).

---

## 1. Ce qu'est Plume

Plume est un atelier d'écriture et une bibliothèque de lecture **Android-first**, en **français**. Le produit repose sur une règle non négociable :

> **L'IA enseigne, questionne et critique. Elle n'écrit jamais à la place de l'auteur.**

Trois invariants en découlent :

1. **Propriété.** Les manuscrits privés appartiennent à leur auteur. Rien n'est publié par défaut.
2. **Vérité des citations.** Toute citation présentée comme provenant du manuscrit doit être vérifiée mot pour mot dans le texte enregistré.
3. **Honnêteté.** Ne jamais présenter une fonctionnalité non testée comme opérationnelle. Signaler clairement les simulations.

---

## 2. Structure

```text
apps/api/        Fastify 5 + tRPC 11 + Drizzle + PGlite/PostgreSQL
apps/mobile/     Expo SDK 58 + React Native 0.88 + Expo Router
packages/shared/ Tokens, schémas Zod, contenu pédagogique, utilitaires texte
docs/            Spécification, architecture, design, base, IA, roadmap, décisions, tests
scripts/         Génération d'assets (Sharp)
```

Le dépôt utilise **npm workspaces**. Les paquets sont `@plume/api`, `@plume/mobile`, `@plume/shared`.

---

## 3. Commandes

```bash
npm install

# Développement
npm run dev:api                 # API sur :4000
npm run dev:mobile              # Expo
PORT=4000 npm run dev:api       # force le port

# Base
npm run db:migrate --workspace @plume/api
npm run db:seed --workspace @plume/api

# Vérifications
npm test
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck
npm run typecheck --workspace @plume/mobile
npm run test --workspace @plume/shared
NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api
```

Notes :

- L'API exige de la mémoire pour le typecheck et les tests : `--max-old-space-size=4096`.
- Expo web exige la même option, sinon le rendu SSR peut manquer de mémoire.
- Le seed est idempotent : s'il trouve déjà les données de démonstration, il ne réinsère rien.
- La base PGlite vit dans `apps/api/data/pglite`. **Arrêter l'API avant un seed manuel.**

---

## 4. Conventions de code

### Général

- **TypeScript strict** partout. Pas de `any` non justifié.
- Les textes visibles sont en **français**, avec apostrophes typographiques dans les contenus littéraires.
- Les commentaires expliquent une décision ou un invariant, pas la syntaxe.
- Les montants, quotas et limites vivent dans `packages/shared` ou `apps/api/src/services/plans.ts`, jamais dupliqués dans l'UI.

### API

- Une procédure tRPC reste mince : validation Zod, appel de service, retour.
- La logique métier va dans `apps/api/src/services/`.
- Toute ressource privée vérifie **propriété et existence** avant de répondre. Un accès non autorisé renvoie `NOT_FOUND`, pas `FORBIDDEN`, pour ne pas révéler l'existence d'un manuscrit.
- Les erreurs métier utilisent `TRPCError` avec un message français actionnable.
- Les conflits de chapitre portent `cause.details.code = "CHAPTER_CONFLICT"`.
- Les suppressions sont logiques (`deletedAt`) pour les histoires et chapitres ; la suppression de compte est réelle et en cascade.

### Mobile

- Routes dans `apps/mobile/app/`, code non-route dans `apps/mobile/src/`.
- Les écrans protégés vivent sous `app/(protected)/` et passent par `useSessionGate`.
- Les composants de design system viennent de `src/components` ; ne pas réinventer un bouton ou une carte dans un écran.
- Les couleurs, tailles et espacements viennent de `@plume/shared` (`palette`, `semantic`, `spacing`, `radii`, `typography`).
- Les mutations passent par TanStack Query / tRPC ; les brouillons locaux par `src/lib/drafts.ts`.
- Toute action destructive demande une confirmation explicite.

### Base de données

- Modifier `apps/api/src/db/schema.ts`, puis générer la migration :

```bash
npm run db:generate --workspace @plume/api
npm run db:migrate --workspace @plume/api
```

- Ne jamais éditer une migration déjà appliquée. Créer une nouvelle migration.
- Les nouvelles tables doivent avoir des index sur les colonnes de jointure et de tri fréquentes.

---

## 5. Garde-fous produit et IA

### Interdits

- Écrire, réécrire ou poursuivre un passage à la place de l'auteur.
- Inventer une citation, un personnage, un lieu ou un événement absent du manuscrit et de la bible.
- Afficher un score comme une vérité littéraire absolue. Les scores sont pédagogiques, avec un niveau de confiance.
- Activer un fournisseur IA payant sans accord explicite de l'utilisateur.
- Committer un secret, une clé API ou un fichier `.env`.
- Lancer un déploiement public, une dépense ou une suppression irréversible sans accord.

### Obligations

- Le moteur `mock` doit rester **signalé comme simulation** dans l'interface et les réponses.
- Toute citation doit passer par la vérification existante (`citationExists` / service d'analyse).
- Les quotas sont appliqués côté serveur, pas seulement dans l'UI.
- Les manuscrits privés ne doivent jamais apparaître dans le catalogue public.
- Un chapitre publié dans une histoire privée reste inaccessible.

---

## 6. Tests

Avant de déclarer une tâche terminée :

```bash
npm run test --workspace @plume/shared
NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck --workspace @plume/api
npm run typecheck --workspace @plume/mobile
```

Pour toute modification de l'éditeur, ajouter ou adapter un test couvrant :

- idempotence (`clientMutationId`) ;
- conflit de version ;
- création de snapshot ;
- restauration de version ;
- isolation entre comptes.

Pour toute modification de l'IA, vérifier :

- refus de réécriture ;
- citations réelles uniquement ;
- quota épuisé ;
- isolation entre comptes ;
- refus d'un passage trop court (< 30 mots).

---

## 7. Vérifications manuelles

L'environnement de développement ne permet pas de compiler un APK (pas de Java/Android SDK). Les vérifications disponibles sont :

- typecheck ;
- tests ;
- bundle web Expo ;
- routes HTTP ;
- script de parcours API de bout en bout.

Ne pas affirmer qu'un écran a été « validé visuellement » sans capture ou inspection réelle. Documenter les limites dans `docs/TEST_PLAN.md`.

---

## 8. Sécurité

- Mots de passe : `scrypt` avec sel aléatoire, comparaison en temps constant.
- Access token : JWT HS256, 15 minutes par défaut.
- Refresh token : opaque, haché en SHA-256, rotatif, réutilisation détectée.
- Rate limit global : 300 requêtes/minute ; limite renforcée sur l'authentification.
- CORS : origines explicites, jamais `*` en production.
- En production : `JWT_SECRET` ≥ 32 caractères aléatoires et `DATABASE_URL` PostgreSQL obligatoires.
- Journaux : ne jamais journaliser mots de passe, jetons ou contenu de manuscrit.

---

## 9. Style de collaboration

- Répondre en français, de façon directe.
- Dire ce qui a été fait, ce qui a été vérifié, et ce qui ne l'a pas été.
- Ne pas masquer un échec de test ou une limite d'environnement.
- Demander avant toute action coûteuse, publique ou irréversible.

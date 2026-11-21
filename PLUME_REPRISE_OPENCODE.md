# Plume : reprise de développement (nouvelle session OpenCode)

> État au **19/11/2026**. Ce résumé se suffit à lui-même. Pour le détail et les références de lignes, voir **`PLUME_DOCUMENTATION_COMPLETE.md`**.
> Ordre de priorité des documents : **ce fichier** > `PLUME_DOCUMENTATION_COMPLETE.md` > `REPRISE_PLUME.md` (périmé depuis la 0.6.1) > `docs/*` et `README.md` (largement périmés) > `TRANSFERT_OPENCODE_PLUME.md` (obsolète).

---

## 1. Ce qu'est Plume

- Atelier d'écriture et bibliothèque de lecture **Android-first**, entièrement **en français**.
- **Règle absolue :** l'IA enseigne, questionne et critique, mais **n'écrit jamais à la place de l'auteur**.
  - Toute citation est vérifiée mot pour mot côté serveur (`citationExists`).
  - Le moteur simulé (`mock`) est toujours signalé comme tel.
  - Un manuscrit est privé par défaut.
- Quatre usages :
  - **Écrire** : manuscrits, éditeur, publication, Studio.
  - **Lire** : Découvrir, lecteur, social.
  - **Apprendre** : 7 compétences, ateliers.
  - **Coach IA** : diagnostics, 7 compétences, conversation.
- Profil choisi à l'inscription (`profiles.goal`) : `read`, `write` ou `both`. Le **Studio** est réservé à `write` et `both`.

## 2. Emplacement et organisation du code

- **Dépôt :** `/root/chat/2026-11-15/session-61c76742-cbbf-4a2f-9c44-95d8ce318570`. Attention, ce n'est pas le dossier de session courant.
  - Distant : `github.com/publicites93-ship-it/plume`, branche `main`.
- **Monorepo npm workspaces :**
  - `apps/api` : Fastify 5, tRPC 11, Drizzle 0.45, Zod 4. PostgreSQL **Neon** en production, **PGlite** en dev et en test.
    - `src/app.ts` : serveur, CORS, limitation de débit, routes HTTP.
    - `src/config.ts` : variables d'environnement.
    - `src/auth/*` : scrypt, JWT 15 min, refresh rotatif 30 j.
    - `src/trpc/routers/{auth,stories,narrative,reading,ai,learning,billing,studio}.ts` : **105 procédures**.
    - `src/services/*` : logique métier (`stories`, `social`, `discover`, `narrative`, `studio`, `studioAnalysis`, `billing`, `plans`, `email`, `covers`, `ai/*`).
    - `src/routes/*` : pages HTML (légal, e-mail, paiement), webhook Stripe, `/covers`, `/studio-media`.
    - `src/db/schema.ts` : **47 tables**. Migrations `migrations/0000→0007`, `migrate.ts` + `reconcile.ts` (tolérance à une base héritée).
  - `apps/mobile` : Expo SDK 58, React Native 0.88.1, Expo Router 58, TanStack Query, Zustand.
    - `app/` : routes. **Pas `src/app`, contrairement à `apps/mobile/AGENTS.md`.**
    - `app/(tabs)/` : 5 onglets (index, decouvrir, ecrire, apprendre, profil).
    - `app/(tabs)/(protected)/` : écrans détaillés sous la barre (histoire, chapitre = éditeur, bible = Studio, fiche, coach, analyse, atelier, reglages, methode, listes, favoris = signets, bibliotheque, auteur, histoire-publique).
    - `app/(lecture)/lecture/[id].tsx` : lecteur plein écran.
    - `src/components/*`, `src/lib/*` (api, auth, session, drafts, ui…), `src/theme/index.ts` (thèmes Nuit, Sépia, Ivoire).
  - `packages/shared` : design tokens, schémas Zod, formules (`domain/plans.ts`), compétences, Studio (`domain/studio.ts`), ateliers, `text.ts`.

## 3. Communication application ↔ backend

- **URL de l'API :** `EXPO_PUBLIC_API_URL`. Les profils EAS `preview` et `production` la fixent à `https://plume-api-qk9s.onrender.com/trpc`. `extra.apiUrl` n'est pas utilisé.
- **Client :** tRPC `httpBatchLink` + superjson, en-tête `Authorization: Bearer <access>`.
  - Sur 401 : un seul rafraîchissement du jeton (`auth.refresh`), puis nouvel essai.
  - Délais : 30 s par défaut, **120 s** pour `ai.*`, `studio.*` et `learning.reviewExercise`.
  - Seules les lectures sont rejouées automatiquement.
- **Réveil de Render** au lancement : `GET /health`, puis message « Démarrage du serveur… ».
- **Stockage local :**
  - SecureStore : jetons, « Se souvenir de moi », e-mail, thème `plume.app.theme`. Le thème est lu de façon **synchrone** au chargement ; en changer **relance l'application**.
  - AsyncStorage : préférences, brouillons `plume.draft.<id>`, file hors ligne `plume.pending.saves`.

## 4. Gestion des données

- Histoires et chapitres :
  - verrou optimiste (`version`), idempotence (`clientMutationId`), versions dans `chapter_versions` (instantané au plus toutes les 45 s) ;
  - suppression logique (`deleted_at`) ;
  - suppression de compte réelle, en cascade.
- **Images en base64 dans PostgreSQL :**
  - `story_covers` : 600 Ko au plus ;
  - `studio_media` : 300 Ko au plus, 3 par fiche, privées.
- **Crédits du coach :** recalculés depuis `ai_usage_records`, sans table de solde ; vérifiés avant l'appel, débités après réussite seulement.
- **Studio :**
  - fiches dans `characters`, `locations`, etc., avec `origin` et `sources` (JSON champ → source) ;
  - propositions dans `studio_proposals` ;
  - état d'analyse dans `chapter_analysis_state` ;
  - quotas du Studio dans `plan_limits` (avec repli sur `STUDIO_AI_DEFAULT_LIMITS`).
- **Tables présentes mais inutilisées :** `reactions`, `notifications`, `reports`, `moderation_actions`, `entitlements`, `narrative_memory_entries`, `memory_evidence`, `background_jobs`.

## 5. Abonnements

| | Gratuit (`free`) | Plume+ (`plus`) | Plume++ (`premium`) |
|---|---|---|---|
| Prix | 0 € | 4,99 €/mois | 9,99 €/mois |
| Crédits coach / mois | 3 | 15 | 30 |
| Histoires actives | 1 | 5 | 20 |
| Chapitres / 7 jours | 3 | 30 | 100 |
| Analyses Studio / mois | 2 | 25 | 100 |
| Modèle du coach | Haiku 5.5 | Sonnet 5.5 | Sonnet 5.5 |

- Le Studio utilise **toujours Haiku**.
- **Stripe** (appels HTTP directs) :
  - `billing.checkout` : Checkout en mode abonnement ;
  - `billing.portal` : portail client ;
  - `POST /stripe/webhook` : signature HMAC ; l'abonnement est **relu chez Stripe** ; `users.plan` + `plan_expires_at` = fin de période + 3 jours.
- La formule effective est `users.plan`, sauf si la date d'expiration est passée.
- Formule offerte : `npm run db:set-plan --workspace @plume/api -- <email> <plan> [jours]`. Elle est **écrasée** par une synchronisation Stripe ultérieure.
- Production : `billing: true`, mode test d'après la documentation, invérifiable. **Parcours complet jamais validé.**
- Pas de TVA, pas de factures dans l'application, pas de Google Play Billing.
- ⚠️ Avantages affichés mais **inexistants** : « mémoire narrative », « multi-chapitres », « comparaisons ».

## 6. Ce qui fonctionne réellement

**Vérifié pendant l'audit du 19/11 :**
- 85/85 tests API, 10/10 tests shared, typecheck des 3 paquets sans erreur ;
- production (`GET /health`) : `ai: anthropic`, `aiAvailable: true`, `billing: true`, `email: brevo`, `emailVerification: false`.

**En production :**
- comptes : inscription, connexion, rafraîchissement, mot de passe oublié par Brevo, suppression, export ;
- écriture : éditeur, versions, conflits, hors ligne, publication, couvertures, export ;
- lecture : Découvrir, lecteur, favoris, signets, listes, réactions, J'aime, commentaires ;
- coach Claude : diagnostic, 7 compétences, conversation, exercices ;
- Studio phases 1 à 3 : fiches complètes, relations, intrigues, chronologie, idées, images, extraction IA avec citations, propositions, « Réanalyser », panneau dans l'éditeur.

**Validé sur téléphone par l'utilisateur (Expo Go, 18–19/11) :**
- changement de thème, Sépia et Ivoire distincts ;
- Découvrir : sélections Histoires du moment, Best-sellers par défaut, Nouveautés ;
- Réglages ;
- « Réanalyser » et les 7 compétences.

## 7. Écart entre le code local et la production

- **5 commits non poussés :** `6d2a612`, `dbb94da`, `2f15e12` (0.6.1), `99f6de8` (0.6.2), `058cce5` (0.6.3). `origin/main` est sur `dca6f06` (0.6.0).
- **API 0.6.3 non déployée :** la production n'a pas `bestSellers`. L'application se rabat sur « Les plus aimées ».
- **Modifications non commitées (phase 4 du Studio) :**
  - `narrative.reorderEvents` (API + test, non déployé : `NOT_FOUND` en production) ;
  - frise verticale et « Réorganiser la frise » (`bible/[id].tsx`, `TimelineOrder.tsx`) ;
  - carte des relations (`RelationMap.tsx` ; Gratuit = liste, Plume+ = carte, Plume++ = filtre) ;
  - « Ouvrir le Studio » dans Écrire ;
  - icône ⓘ pour la source IA dans les fiches.
- **Dernier APK :** 0.6.0 (`d9c21e89`). App locale en **0.6.3 / versionCode 14**.
- **Pas de build EAS avant le 1er décembre 2026** (quota gratuit épuisé, selon l'utilisateur). Les tests passent par **Expo Go** (§10).

## 8. Ce qui reste à développer

- 🔴 Muse rapide (Haiku) et approfondie (Sonnet) : pistes et questions, jamais de prose, avec un test anti-réécriture.
- 🔴 Vérification de cohérence.
- 🔴 Fusion des doublons de personnages.
- 🔴 Analyse approfondie.
- 🔴 Univers / atmosphère comme entité (à arbitrer).
- 🔴 Phase 6 : quotas par fonction, plafond de dépense par utilisateur, cache des consignes Anthropic (`cache_control`), API Batch.
- 🔴 Parcours Stripe complet en mode test, puis mode live (TVA, rétractation, relecture juridique).
- 🔴 Notifications push, modération et signalements, stockage d'images externe, domaine + Resend + vérification d'e-mail, AAB et Play Store.
- 🟡 Plan d'histoire : API sans interface. `customFields` : sans interface.

## 9. Problèmes à corriger (par priorité)

**Haute**
1. Committer la phase 4, puis **pousser et déployer** (avec l'accord de l'utilisateur).
2. Éditeur : un **titre modifié seul n'est pas sauvegardé** (`chapitre/[id].tsx:285-292, 422`).
3. « **Suivre un auteur** » : colonne héritée `follows.following_id` peut-être NOT NULL dans Neon. Le code ne la connaît pas. À vérifier par une requête de lecture ou un test sur téléphone.
4. `trustProxy: false` derrière Render (`app.ts:60`) : la limite de débit s'applique probablement à tous les utilisateurs ensemble.
5. Lecteur : la position et les signets ne sont **pas restaurés** à l'ouverture.
6. Analyses du Studio exécutées **dans le processus** : perdues si Render se met en veille.

**Moyenne**
- Chargement sans fin si `auth.me` échoue (Accueil, Écrire, Profil, Réglages).
- « Réduire les animations » et `writingTheme` sans effet.
- Essais d'atelier non rechargés.
- Listes de lecture incomplètes, limitées aux 50 premières histoires du catalogue.
- Contournement des quotas (histoire rouverte, `restoreChapter`).
- Double abonnement possible si deux Checkout sont lancés en parallèle.
- Jetons dans les URL journalisées.
- Erreurs SQL possiblement renvoyées au client.
- IA :
  - chapitres **non tronqués** pour le diagnostic et les 7 compétences (coût jusqu'à environ 0,60 $ par crédit) ;
  - température jamais envoyée à Claude ;
  - schémas stricts pour conversation, exercice et extraction ;
  - ordre de la frise incohérent (IA : ×10, réorganisation : 1 à n) ;
  - `role` rempli par l'IA jusqu'à 600 caractères contre 120 côté auteur.
- Export de données incomplet.
- Documentation périmée : `docs/*`, `README.md`, `.env.example`, `render.yaml`.

**Basse**
- Imports inutilisés, code mort, 8 tables inutilisées.
- Textes obsolètes : onboarding, profil, « corbeille ».
- Pas de `helmet`.
- Profil EAS `development` sans URL d'API.

## 10. Commandes et environnement

```bash
cd /root/chat/2026-11-15/session-61c76742-cbbf-4a2f-9c44-95d8ce318570
export NODE_OPTIONS=--max-old-space-size=4096        # obligatoire (sinon OOM)
npm run typecheck                                    # shared + api + mobile
npm test                                             # shared + api (PGlite, IA mock)
cd apps/api && npx vitest run test/<fichier>.test.ts
npx expo export --platform android --no-bytecode     # hermesc x86 inutilisable sur cette machine aarch64
```

**Expo Go (test sur le téléphone de l'utilisateur)**
- Lancer depuis `apps/mobile` :
  ```
  setsid nohup env NODE_OPTIONS=--max-old-space-size=4096 EXPO_PUBLIC_API_URL=https://plume-api-qk9s.onrender.com/trpc npx expo start --go --tunnel > /tmp/opencode/metroN.log 2>&1 &
  ```
- L'URL se trouve dans le journal (« Waiting on https://… ») et se transmet sous la forme `exp://<hôte>`.
- Vérifier avant de la donner : `curl <url>/status` doit renvoyer `packager-status:running`.
- **L'URL change à chaque relance**, et le tunnel peut planter sur une erreur WebSocket 409.
- **Redonner l'URL Expo Go à l'utilisateur après chaque étape terminée.**
- Expo Go utilise **l'API de production** : tout changement d'API reste invisible tant que Render n'est pas redéployé.

**Déploiement de l'API**
- Pousser, puis Render → `plume-api-qk9s` → « Manual Deploy ».
- Le conteneur lance `db:migrate`, puis `start`.
- `render.yaml` n'est **pas** la configuration réelle.

**APK**
- Incrémenter `version` et `versionCode` dans `apps/mobile/app.json`.
- Puis lancer `npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait`.

## 11. Règles de collaboration

- Répondre **en français**, en tutoyant, de façon directe.
- Dire ce qui a été fait, vérifié ou non vérifié. Ne jamais masquer un échec.
- **Demander avant** tout push, déploiement, build EAS, migration sur Neon, ou toute action coûteuse ou irréversible.
- **Ne jamais demander à l'utilisateur de coller un secret.** Lui donner des étapes précises dans les tableaux de bord (Render, Neon, Stripe).
- Ne pas modifier sans accord :
  - la règle « l'IA n'écrit jamais » ;
  - `citationExists` et `nameInText` ;
  - la priorité de l'auteur (l'IA n'écrase jamais un champ rempli) ;
  - les prix, crédits et quotas ;
  - `eas.json`, le package `app.plume.reader` et sa clé de signature ;
  - `migrate.ts`, `reconcile.ts` et le Dockerfile.
- Ne pas remettre `href: null` sur l'onglet `(protected)` : sous expo-router 58, cela renvoie l'utilisateur vers Accueil.
- Couleurs : utiliser `theme.*` de `@/theme`. Les styles sont calculés au chargement ; changer de thème relance l'application.
- Toute nouvelle couleur de texte doit atteindre au moins 4,5:1 de contraste sur tous les fonds de Sépia et d'Ivoire.

## 12. Prochaine tâche prioritaire

1. **Faire valider par l'utilisateur, dans Expo Go, la phase 4** : frise verticale, « Réorganiser la frise », carte des relations, « Ouvrir le Studio », icône ⓘ.
2. **Avec son accord**, faire le commit 0.6.4 (`app.json` : version 0.6.4, versionCode 15), **pousser** les 6 commits, puis lui faire lancer « Manual Deploy » sur Render.
3. **Contrôle :** `reading.discover` renvoie `bestSellers` et `narrative.reorderEvents` ne renvoie plus `NOT_FOUND`.
4. Ensuite :
   - corriger la **sauvegarde du titre de chapitre** ;
   - trancher la question **`follows.following_id`** (test « Suivre un auteur ») ;
   - corriger **`trustProxy`** ;
   - restaurer la **position de lecture**.
5. Puis le **parcours Stripe en mode test**, et la **phase 5** du Studio (Muse, cohérence).

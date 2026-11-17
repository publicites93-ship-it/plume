# TRANSFERT OPENCODE — PROJET PLUME

Document de transmission rédigé le 17/11/2026 à partir de la conversation et du dépôt.
Aucun secret n'y figure (clés, mots de passe, URL de base de données).

**Légende de fiabilité** (utilisée partout) :
- ✅ **Vérifié** : constaté par une commande, un test, un journal ou une réponse HTTP pendant la session.
- ⚠️ **Supposé** : déduit, probable mais non confirmé.
- ❓ **Inconnu** : non vérifié, pas d'accès, ou information manquante.

---

## 0. Résumé en 10 lignes

1. Plume = application Android (français) d'atelier d'écriture + bibliothèque de lecture, avec un **coach IA qui enseigne, questionne, critique, mais n'écrit jamais à la place de l'auteur**.
2. Monorepo npm : `apps/api` (Fastify + tRPC + Drizzle + PostgreSQL), `apps/mobile` (Expo SDK 58 / React Native 0.88), `packages/shared`.
3. Dépôt GitHub : `publicites93-ship-it/plume`, branche `main`. ✅ Dernier commit : `bde52d7` (arbre de travail propre, `git status` vide).
4. API de production : **`https://plume-api-qk9s.onrender.com`** (Render, offre gratuite, endort le service). ✅ En ligne, `"billing":false`.
5. Base de production : PostgreSQL chez **Neon** (⚠️ le fournisseur est déduit des propos de l'utilisateur).
6. Coach en production : **Claude** (`AI_PROVIDER=anthropic`) ; Haiku 5.5 pour Gratuit, Sonnet 5.5 pour Plume+/Plume++. ✅ Analyse réelle testée.
7. E-mails : **Brevo** (sans nom de domaine). ✅ « Mot de passe oublié » testé par l'utilisateur.
8. Crédits coach : 1 crédit = 1 action ; Gratuit 3, Plume+ 15, Plume++ 30 par mois. ✅ en ligne.
9. Paiement : **Stripe** codé et testé en simulation, **non configuré** en production.
10. Dernier APK : **0.3.1** (versionCode 4), build EAS `ff7485a1`. **En cours : retrouver le compte `plume.lecture.ia@gmail.com` pour le passer en Plume++.**

---

## 1. Présentation de Plume

### 1.1 Objectif
Atelier d'écriture et bibliothèque de lecture, Android d'abord, en français. Règle produit non négociable (✅ `AGENTS.md`) :

> L'IA enseigne, questionne et critique. Elle n'écrit jamais à la place de l'auteur.

Trois invariants : (1) **propriété** des manuscrits privés, rien n'est publié par défaut ; (2) **vérité des citations** : toute citation attribuée au manuscrit est vérifiée mot pour mot ; (3) **honnêteté** : ne jamais présenter comme opérationnel ce qui n'est pas testé, signaler les simulations.

### 1.2 Utilisateurs
- **Auteurs** : écrivent des histoires/chapitres, utilisent le coach, publient.
- **Lecteurs** : parcourent le catalogue public, lisent, mettent en favoris, réagissent, commentent.
- Propriétaire du projet : l'utilisateur (français, travaille depuis un téléphone, style terse). ✅ mémoire de collaboration.

### 1.3 Fonctionnalités (vue d'ensemble)
Voir section 4 pour l'état précis. Domaines : comptes et sécurité ; écriture (histoires, chapitres, versions, brouillons locaux, conflits, export) ; bible narrative (personnages, lieux, intrigues, chronologie, idées) ; coach IA (analyse de chapitre, analyse globale des 7 compétences, chat, correction d'exercices) ; ateliers pédagogiques (7 compétences) ; lecture (catalogue, thèmes, police, progression, signets) ; social (réactions, J'aime, favoris, commentaires, compteurs) ; formules et crédits ; paiement Stripe ; pages légales.

### 1.4 Fonctionnement général
L'appli mobile appelle l'API tRPC (`/trpc`) avec un JWT d'accès (15 min) et un refresh token rotatif. L'API applique propriété, quotas et vérification des citations côté serveur. Le coach appelle Claude (ou Gemini, ou le moteur simulé `mock`) puis l'API filtre les citations non retrouvées dans le texte.

---

## 2. Architecture technique

| Couche | Technologie | État |
| --- | --- | --- |
| Mobile | Expo SDK `~58.0.25`, React Native `0.88.1`, Expo Router, TanStack Query, tRPC client, Zustand, react-native-svg | ✅ package.json |
| API | Fastify 5, tRPC 11, Zod 4, Drizzle ORM 0.45, `jose` (JWT), `pg`, PGlite (dev/tests) | ✅ |
| Partagé | `packages/shared` : tokens de design, schémas Zod, contenu pédagogique, plans, utilitaires texte | ✅ |
| Langage | TypeScript strict (TS ~6.0.3), Node ≥ 22 | ✅ |
| Tests | Vitest 5.1 | ✅ |
| Base prod | PostgreSQL (Neon) | ⚠️ fournisseur déduit |
| Base dev/tests | PGlite dans `apps/api/data/pglite` | ✅ |
| Hébergement API | Render, service web **gratuit** (veille), image **Dockerfile** | ✅ journaux de déploiement |
| Build mobile | EAS Build (cloud, file d'attente gratuite 30-60 min), profil `preview` = APK | ✅ |
| Auth | scrypt + sel ; access JWT HS256 15 min ; refresh opaque haché SHA-256, rotatif, réutilisation détectée | ✅ AGENTS.md |
| E-mail | Brevo (prod actuelle), Resend (codé, non utilisé), `console`, `test` | ✅ |
| IA | Anthropic (prod), Gemini (codé), mock (simulation) | ✅ |
| Paiement | Stripe via REST `fetch`, signature webhook vérifiée à la main, sans dépendance | ✅ code/tests ; ❓ réel |

Environnement de la session précédente : machine **aarch64 Android/Linux**, sans Java/Android SDK (pas d'APK local), compilateur Hermes local inutilisable (le build EAS le fait). ✅

---

## 3. Structure du projet

```
AGENTS.md          Conventions et garde-fous (À LIRE EN PREMIER)
README.md          Présentation
Dockerfile         Image API (NODE_ENV=production par défaut)
render.yaml        Blueprint Render (liste des variables d'env)
railway.json       Piste Railway (non utilisée) ⚠️
inspect-db.mts     Script d'inspection de base à la racine ❓ rôle exact non relu
tsconfig.base.json
apps/api/          Backend
apps/mobile/       Application Expo
packages/shared/   Code partagé
docs/              Spécification, architecture, etc.
scripts/generate-assets.mjs  Génération d'icônes (Sharp)
```

### 3.1 `apps/api`
- `src/server.ts`, `src/app.ts` : démarrage Fastify, tRPC, `/health`, enregistrement des routes HTTP.
- `src/config.ts` : validation Zod des variables d'environnement ; en production exige `JWT_SECRET` ≥ 32 car. et `DATABASE_URL`.
- `src/auth/` : `service.ts` (inscription, sessions), `tokens.ts` (JWT), `password.ts` (scrypt), `emailTokens.ts` (jetons vérif./reset, `emailDeliveryConfigured`).
- `src/trpc/` : `router.ts`, `trpc.ts` (contexte, procédures protégées) ; routeurs `auth`, `stories`, `narrative`, `reading`, `ai`, `learning`, `billing`.
- `src/services/` : logique métier — `stories.ts`, `narrative.ts`, `plans.ts` (crédits/quotas), `social.ts` (réactions, J'aime, commentaires), `covers.ts`, `email.ts`, `billing.ts` (Stripe), `ai/` (`analysis.ts`, `provider.ts`, `mock.ts`, `gemini.ts`, `anthropic.ts`, `index.ts`).
- `src/routes/` (HTTP hors tRPC) : `legal.ts` (confidentialité, conditions, suppression de compte), `authPages.ts` (pages web vérif./reset), `covers.ts` (`GET /covers/:id`), `billing.ts` (webhook Stripe, pages retour).
- `src/db/` : `schema.ts` (Drizzle), `client.ts`, `migrate.ts` + `reconcile.ts` (migration tolérante, voir §6), `seed.ts`/`seed-cli.ts`, `cleanup-demo-cli.ts`, `set-plan-cli.ts`.
- `migrations/` : `0000` à `0005` (voir §5).
- `test/` : 13 fichiers de tests (72 tests ✅).

### 3.2 `apps/mobile`
- `app/` : routes Expo Router. `bienvenue`, `connexion`, `inscription`, `onboarding`, `mot-de-passe-oublie`, `reinitialiser-mot-de-passe`, `verifier-email`, `verification-envoyee`, `paiement/[statut].tsx` ; `(tabs)/` : `index`, `ecrire`, `apprendre`, `decouvrir`, `profil` ; `(protected)/` : `histoire`, `chapitre`, `bible`, `analyse`, `coach`, `atelier`, `lecture`, `histoire-publique`, `auteur`, `bibliotheque`, `favoris`, `listes`, `reglages`.
- `src/components/` : design system (Button, Card, Cover, Input, Sheet, Feedback, Misc, StoryCard, Prose, ReaderSocial, etc.).
- `src/lib/` : `api.ts` (client tRPC, refresh de session), `auth.ts` (session + « se souvenir de moi »), `billing.ts` (ouverture Stripe), `covers.ts`, `drafts.ts`, `errors.ts`, `storage.ts` (SecureStore), `ui.ts` (préférences lecture), etc.
- `app.json` (version, permissions bloquées, plugins), `eas.json` (profils de build), `AGENTS.md` (consignes Expo : lire la doc versionnée, utiliser `npx expo install`).

### 3.3 `packages/shared`
`design/tokens.ts` (palette, sémantique, typographie), `domain/plans.ts` (formules/quotas), `domain/skills.ts` (7 compétences), `domain/social.ts`, `validation/schemas.ts` (Zod : mot de passe, inscription…), `text.ts` (`countWords`, `citationExists`, diff), `content/` (ateliers, exercices, histoires de démo, prompts).

### 3.4 `docs/`
`PRODUCT_SPEC`, `ARCHITECTURE`, `DESIGN_SYSTEM`, `DATABASE`, `AI_COACH`, `ROADMAP`, `DECISIONS`, `TEST_PLAN`, `DEPLOY_API`, `EAS_BUILD`. ✅ présents ; ⚠️ certains passages peuvent être en retard sur le code (à relire).

---

## 4. Fonctionnalités : état

### 4.1 Terminé et vérifié (tests API/shared ✅)
- Inscription / connexion / refresh / suppression de compte (cascade) ; mot de passe **6 caractères minimum, sans autre règle** (décision utilisateur « option B »).
- « Se souvenir de moi » (case **décochée par défaut**) : cochée → e-mail pré-rempli et session conservée ; décochée → session en mémoire seulement.
- Mot de passe oublié par e-mail (Brevo) ✅ testé sur téléphone par l'utilisateur.
- Histoires/chapitres, versions, conflits, idempotence, export ; bible narrative.
- Coach : analyse de chapitre, analyse globale 7 compétences, chat, correction d'exercices ; citations vérifiées mot pour mot ; pas de réécriture ; aucun crédit débité en cas d'échec.
- Crédits : 1 crédit = 1 action (analyse chapitre, analyse globale, correction d'exercice, message coach) ; Gratuit 3, Plume+ 15, Plume++ 30/mois ; appliqué côté serveur ; coût estimé en dollars enregistré par action.
- Réactions (😱 Frisson, 😬 Tension, 😍 Love, 😴 Je décroche), J'aime, favoris (= ajout à la bibliothèque), commentaires (suppression par l'auteur), compteurs serveur ; histoire privée → `NOT_FOUND`.
- Couverture personnalisée : photo, recadrage 2:3, réduction 600×900 JPEG, stockée **en base** (table `story_covers`, max 600 Ko, JPEG/PNG/WebP), privée tant que l'histoire est privée.
- Lecteur : thèmes Nuit/Sépia/Ivoire, taille, **police Classique (Lora) / Moderne (Inter)**.
- Écran d'accueil défilable (texte système agrandi).
- Pages légales (confidentialité, conditions avec paragraphe abonnements/Stripe, suppression de compte).
- Commande admin `db:set-plan`.

### 4.2 Codé mais non validé en conditions réelles
- **Stripe** : Checkout, portail client, webhook signé, résiliation à la suppression du compte. Testé **en simulation** (5 tests). ❓ Aucun appel réel ; clés absentes ; `/health` → `"billing":false`.
- Couverture, police, « se souvenir », écran défilable : ❓ **non vérifiés visuellement sur téléphone** (l'utilisateur n'a pas encore rapporté de résultat).
- Avertissement « Coach momentanément indisponible » : dans le code ; ✅ présent dans 0.3.1 (build postérieur) ⚠️ non vérifié visuellement.
- Gemini : code et tests, mais ❌ échec en production (429 sur `gemini-2.5-flash`) ; modèle par défaut changé en `gemini-3.8-flash`, **jamais retesté** car l'utilisateur a basculé sur Claude.

### 4.3 À développer / non fait
- Réactions : la limite « 5 max » demandée a été interprétée de façon incertaine (serveur bloque à 5 par lecteur et par histoire, mais 4 types d'emoji posables une fois → jamais atteinte). ⚠️ à clarifier.
- Écran « Favoris » existant affiche des **signets**, pas les favoris/étoiles ; non modifié.
- Bouton d'analyse globale 7 compétences dans l'UI et exercices adaptés aux forces/faiblesses : ⚠️ le service existe, l'état exact de l'UI n'a pas été revérifié.
- Notifications push (masquées).
- Thème clair global : **abandonné** (« Le lecteur suffit »).
- Vérification d'e-mail obligatoire : volontairement **désactivée** (`REQUIRE_EMAIL_VERIFICATION=false`).
- Relecture juridique des pages légales (juriste).
- Nom de domaine + Resend.
- Publication Play Store / AAB.
- Table `follows` héritée : un `DROP NOT NULL` a échoué sur `follows.following_id` → « suivre un auteur » peut échouer ⚠️ (non testé).

---

## 5. Modifications réalisées (chronologie, ✅ historique git)

Avant la session de cahier du 16/11 : préparation du build EAS, tunnels éphémères (abandonnés), déploiement durable Docker/Render/Railway (`949c342` … `a7b8c0f`).

| Commit | Contenu |
| --- | --- |
| `86d13bd` | Cahier du 16/11 : e-mails (tokens vérif./reset, migration `0001`), coach réel, exercices corrigés (`0002`), réactions/J'aime/commentaires (`0003`), compteurs, corrections TypeScript, textes « simulé » retirés |
| `b2e3903`, `b3fdfe4`, `14a2d90` | Migrations tolérantes à une base de prod créée par une **autre version** de Plume (voir §6) ; `migrate.ts` + `reconcile.ts` + vérification finale du schéma |
| `98ae0aa` | Bascule APK/doc/render.yaml vers `plume-api-qk9s` |
| `707a38e` | Dockerfile : `NODE_ENV=production` (impose un vrai `JWT_SECRET`) |
| `4748610`, `12ec8e3` | Coach : message clair + `available` dans `auth.me` et `/health` (`aiAvailable`) ; journalisation de la cause d'échec IA sans clé ni manuscrit |
| `cadb0c9` | Gemini : modèle par défaut `gemini-3.8-flash`, marge de tokens de sortie |
| `cec7b42` | Fournisseur **Anthropic** (`AI_PROVIDER=anthropic`, clé `ANTHROPIC_API_KEY` ou `CLAUDE_API_KEY`) |
| `0f231d2` | Crédits : 1 action = 1 crédit ; 3/15/30 |
| `375ab2b` | Haiku 5.5 pour Gratuit (`ANTHROPIC_MODEL_FREE`), Sonnet 5.5 sinon (`ANTHROPIC_MODEL`) |
| `c1dba77`, `6882b2f` | Brevo ; `emailDeliveryConfigured` reconnaît Brevo ; message clair si réponse non JSON (visible dans l'APK ≥ 0.3.0/0.3.1) |
| `ad622ba` | Couverture personnalisée (migration `0004`, `story_covers`, route `/covers/:id`, `expo-image-picker`, `expo-image-manipulator`, permissions caméra/micro/etc. bloquées) |
| `07fe97d` | Police de lecture ; version 0.3.0 (versionCode 3) |
| `932aee2` | Correctif build Android : couleurs de recadrage déclarées aussi hors mode nuit |
| `28a0cf5` | Mot de passe 6 caractères |
| `ac67896` | « Se souvenir de moi » ; accueil défilable |
| `5419d91` | `db:set-plan` |
| `bde52d7` | Stripe (migration `0005`, `billing.ts`, routes, `expo-web-browser`, écran `paiement/[statut]`), conditions/confidentialité complétées ; version 0.3.1 (versionCode 4) |

Migrations : `0000` schéma initial ; `0001` auth_tokens ; `0002` colonnes exercice ; `0003` story_reactions, chapter_likes, index ; `0004` story_covers ; `0005` colonnes Stripe sur `subscriptions` (`customer_ref`, `cancel_at_period_end`) + index unique `(provider, provider_ref)`. Les migrations `0001`-`0005` sont écrites de façon idempotente (`IF NOT EXISTS`, archivage `*_legacy_<date>` des tables en conflit).

---

## 6. Problèmes rencontrés

| # | Problème | Cause | Solution / résultat |
| --- | --- | --- | --- |
| 1 | Render servait l'ancien code (`reading.stats` 404) | Service relié à un **autre dépôt/commit** (`913515f`, absent de notre dépôt) | Utilisateur a reconnecté le bon dépôt ; ✅ déploiement du commit `86d13bd` |
| 2 | Migration : `42P07 already exists` (`auth_tokens`…) | Base de prod déjà créée par l'autre version de Plume | Archivage `*_legacy_*` ; ✅ |
| 3 | `relation "bookmarks" already exists` | Historique de migrations Drizzle étranger | `migrate.ts` marque `0000` comme appliquée ; ✅ |
| 4 | `reading_progress does not exist` | Base de l'autre application, schéma différent | `reconcile.ts` : complément additif, colonnes héritées rendues facultatives, vérification finale ; ✅ déployé (`14a2d90`). ⚠️ `follows.following_id` non adaptable |
| 5 | Deux services Render (`plume-api` et `plume-api-qk9s`) | Historique | Décision : garder `-qk9s` ; ancien **suspendu** par l'utilisateur ✅ |
| 6 | Erreurs avec trace serveur, `JWT_SECRET` absent | `NODE_ENV` non « production » (l'utilisateur avait mis « 22 » = version Node) | Dockerfile `NODE_ENV=production` ; `JWT_SECRET` ajouté ; ✅ vérifié (plus de trace) |
| 7 | Coach : « GEMINI_API_KEY absente » | Clé non configurée | Messages clairs ; clé ajoutée |
| 8 | Gemini 429 `RESOURCE_EXHAUSTED` | `gemini-2.5-flash` obsolète/quota nul pour le projet | Passage au défaut `gemini-3.8-flash` (non retesté) puis bascule sur Claude |
| 9 | Déploiement avec `AI_PROVIDER=anthropic` : config invalide | Render redéployait l'ancien commit après un simple changement de variable | **Toujours « Manual Deploy → Deploy latest commit »** ; ✅ |
| 10 | Tests : quota ancien en tokens | Changement de règle | Test réécrit ; ✅ 72/72 |
| 11 | « JSON Parse error » sur le téléphone | Ancien APK appelant l'ancien service suspendu (HTML « Service Suspended ») | Nouvel APK ; message d'erreur clair ; ✅ confirmé fonctionnel par l'utilisateur |
| 12 | Mot de passe oublié : 412 « e-mails non configurés » | `emailDeliveryConfigured` ignorait Brevo | Corrigé (`6882b2f`) ; ✅ |
| 13 | Build EAS 0.3.0 échoué | `values-night/colors.xml` sans équivalent par défaut (lint `MissingDefaultResource`) | Couleurs ajoutées dans les deux modes (`932aee2`) ; ✅ build suivant OK |
| 14 | Taille APK 53,8 Mo > objectif 40 Mo | 2 architectures (arm64-v8a + armeabi-v7a) | ❌ **non résolu** : AAB Play Store (~30 Mo/téléphone) ou arm64 seul |
| 15 | Contact ne peut « rien toucher » dans l'APK | ⚠️ ancien APK / texte agrandi / serveur endormi (hypothèses) | Écran d'accueil rendu défilable ; ❓ **aucune capture ni modèle de téléphone reçus**, cause non confirmée |
| 16 | **Compte `plume.lecture.ia@gmail.com` introuvable dans Neon** | ⚠️ L'éditeur SQL de l'utilisateur pointe vers une **autre base** (celle de l'ancien service : seulement comptes de démo du 16/11 07:48 UTC) | ❓ **Non résolu** : voir §10 |
| 17 | Render Shell réservé aux offres payantes | Limitation Render | Passage par l'éditeur SQL Neon (requêtes fournies §11) |

---

## 7. Configuration, commandes, déploiement

### 7.1 Prérequis (Windows)
Node ≥ 22 et npm 10 ; Git ; (optionnel) compte Expo/EAS. Pas besoin de Java : les builds se font sur EAS. ⚠️ Les commandes ci-dessous ont été vérifiées sous Linux ; sous Windows, `NODE_OPTIONS=...` se règle autrement (PowerShell : `$env:NODE_OPTIONS="--max-old-space-size=4096"`).

### 7.2 Installation et lancement
```bash
git clone https://github.com/publicites93-ship-it/plume.git
cd plume
npm install
npm run dev:api          # API sur :4000 (PGlite local, mock IA)
npm run dev:mobile       # Expo
npm run db:migrate --workspace @plume/api
npm run db:seed --workspace @plume/api   # arrêter l'API avant
```

### 7.3 Vérifications (à lancer avant de déclarer une tâche terminée)
```bash
npm run test --workspace @plume/shared                                   # 10 tests ✅
NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api   # 72 tests ✅
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck --workspace @plume/api
npm run typecheck --workspace @plume/mobile
```
Bundle Android de contrôle : `npx expo export --platform android` (dans `apps/mobile`) — ✅ compile ; l'étape Hermes échoue localement (aarch64), sans importance pour EAS.

### 7.4 Base de données
Modifier `apps/api/src/db/schema.ts`, puis `npm run db:generate --workspace @plume/api` et `db:migrate`. Ne jamais éditer une migration déjà appliquée **en production** (les `0001`-`0003` ont été modifiées avant leur 1re application en prod : cas exceptionnel). Nouvelles tables : index sur colonnes de jointure/tri.

### 7.5 Build APK
```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait
npx eas-cli@latest build:view <BUILD_ID>
```
Compte Expo : propriétaire `st93`, projet `plume`, package Android `app.plume.reader`. Incrémenter `version` et `versionCode` dans `app.json` à chaque APK. L'URL d'API est injectée par `eas.json` (`EXPO_PUBLIC_API_URL` = `https://plume-api-qk9s.onrender.com/trpc`). Fichiers générés par `expo prebuild` (`android/`) : ne pas committer ; `prebuild` modifie les scripts de `apps/mobile/package.json` → annuler (`git checkout`).

### 7.6 Déploiement API (Render)
- Service **`plume-api-qk9s`**, image Docker, démarrage : migrations puis serveur (`render.yaml`).
- ⚠️ **Le déploiement automatique ne se déclenche pas de façon fiable** : après chaque `git push`, l'utilisateur doit faire **Manual Deploy → Deploy latest commit** et vérifier la ligne « Checking out commit <sha> ». Un simple changement de variable redéploie l'**ancien** commit. ✅ (mémoire)
- Variables d'environnement (noms uniquement) : `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `AI_PROVIDER`, `ANTHROPIC_API_KEY` ou `CLAUDE_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MODEL_FREE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `EMAIL_PROVIDER`, `BREVO_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_APP_URL`, `REQUIRE_EMAIL_VERIFICATION`, `SEED_DEMO`, `LEGAL_CONTACT_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PREMIUM`.
- Valeurs connues en prod (✅ via `/health` et journaux) : `AI_PROVIDER=anthropic`, `EMAIL_PROVIDER=brevo`, `SEED_DEMO` ≠ true, vérification e-mail désactivée. `EMAIL_FROM` et `PUBLIC_APP_URL` réels : ❓ non revérifiés.
- Contrôle : `curl https://plume-api-qk9s.onrender.com/health` → `{"ok":true,"service":"plume-api","ai":"anthropic","aiAvailable":true,"billing":false,"email":"brevo","emailVerification":false}` ✅ (dernier relevé).

---

## 8. Services connectés

| Service | Usage | État |
| --- | --- | --- |
| **GitHub** `publicites93-ship-it/plume` | Code, branche `main` | ✅ poussé jusqu'à `bde52d7` |
| **Render** `plume-api-qk9s` | API | ✅ live ; plan gratuit, veille ; déploiement manuel ; Shell indisponible (payant). Ancien service `plume-api` : **suspendu** ✅ |
| **Neon** | PostgreSQL | ⚠️ plusieurs bases/branches possibles ; la base de l'API actuelle est ❓ non identifiée côté console Neon |
| **Anthropic** | Coach en prod | ✅ analyse réelle OK (95 mots : ~4 556 tokens, ~0,025 $, 32 s). Plafond de dépense recommandé : 20 $/mois (❓ fait ou non) |
| **Google Gemini** | Alternative codée | ❌ non utilisée (429) |
| **Brevo** | E-mails transactionnels | ✅ ; expéditeur prévu `plume.lecture.ia@gmail.com` (⚠️ risque de spam, sans domaine propre) |
| **Resend** | Futur, avec domaine | codé, non configuré |
| **Stripe** | Abonnements | codé, ❓ compte/clés/webhook non créés |
| **Expo EAS** | Builds APK | ✅ compte `st93` |
| **Play Store** | — | non publié ; ⚠️ Google impose son propre paiement pour les abonnements numériques dans l'appli (Stripe OK en APK direct, à réétudier avant publication) |

Tarifs prévus : Plume+ 4,99 €/mois, Plume++ 9,99 €/mois (✅ décision utilisateur, `STRIPE_PRICE_*` à créer). Analyse de rentabilité faite (estimation) : formules payantes rentables, l'offre gratuite est le seul poste de coût sans recette.

---

## 9. Décisions et préférences

**Préférences de l'utilisateur** (✅ conversation) : réponses en **français**, directes ; messages courts ; il travaille sur téléphone → donner des **étapes exactes de tableau de bord** ; **ne jamais demander de secret** (clés à saisir directement dans Render) ; demander avant toute action coûteuse, publique ou irréversible.

**Décisions retenues**
- Garder le service **`plume-api-qk9s`** ; ancien service suspendu (pas supprimé).
- Coach **Claude** ; Haiku 5.5 (Gratuit) / Sonnet 5.5 (payants).
- **1 crédit = 1 action** ; 3 / 15 / 30 par mois.
- Mot de passe **6 caractères, aucune autre exigence** (option B).
- « Se souvenir de moi » **en option, décoché par défaut** ; le mot de passe n'est jamais stocké par Plume ; l'e-mail mémorisé n'est **pas** effacé à la déconnexion (écart assumé, réglable en une ligne).
- Paiement via **Stripe** (pas Google Play).
- Pas de thème clair global (lecteur seulement).
- Vérification e-mail obligatoire **reportée** (spam sans domaine).
- Images de couverture **en base** (disque Render éphémère).
- Brevo en attendant un nom de domaine (réponse de l'utilisateur : « Pas de domaine pour l'instant »).
- Compte `plume.lecture.ia@gmail.com` à passer en **Plume++** (`premium`).

**Solutions abandonnées** : tunnels éphémères (Pinggy) pour l'API ; Render Free Postgres (expire à 30 j) ; Gemini comme moteur principal ; seed de démo en production ; Railway.

**Garde-fous (AGENTS.md)** : jamais de secret committé ; pas de déploiement public/dépense/suppression irréversible sans accord ; moteur `mock` toujours signalé comme simulation ; quotas côté serveur ; accès non autorisé → `NOT_FOUND` ; citations toujours vérifiées ; ne pas affirmer « validé visuellement » sans capture.

---

## 10. État actuel exact

- **Branche** `main`, **dernier commit `bde52d7`**, arbre propre (✅ `git status` vide) ; commits poussés sur GitHub (✅ déploiement Render du code Stripe confirmé par `"billing":false` dans `/health`).
- **Dernière tâche livrée** : Stripe + « se souvenir » + mot de passe 6 + `db:set-plan` + APK 0.3.1.
- **APK courant** : 0.3.1, build `ff7485a1-662e-475c-898c-6b3f536a9b76`, 53 800 953 octets, SHA-256 `cb45a3cf959e41574d32d07beea0e0237f12efa8c0b7f23e80cd1179ded0d423`, lien : `https://expo.dev/artifacts/eas/lV4z552MTFsN5u7NhSkiH5h4z4J-xh2-D6xEW9f6xZQ.apk` (⚠️ les artefacts EAS peuvent expirer). Version et URL d'API vérifiées dans le fichier ✅. Permissions : INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, VIBRATE (+ `DUMP` de provenance non identifiée, réservée système).
- **Tests au dernier passage** : API 72/72, shared 10/10, typecheck API et mobile OK ✅.
- **Problème en cours (non résolu)** : l'utilisateur a voulu passer `plume.lecture.ia@gmail.com` en Plume++ via l'éditeur SQL de Neon. La requête sur `users` n'a montré que `auteur@plume.app`, `lecteur@plume.app` et `*@demo.plume.app` (créés le 16/11 ~07:48 UTC) → ⚠️ **mauvaise base ou mauvaise branche** (probablement la base de l'ancien service). Dernier conseil donné : comparer l'**hôte** `ep-…` de `DATABASE_URL` (Render → `plume-api-qk9s` → Environment) avec celui de la base ouverte dans Neon, sans copier le mot de passe. En attente de la réponse de l'utilisateur.
- **Autres points ouverts** : aucun retour de recette sur téléphone pour 0.3.0/0.3.1 ; problème du contact « ne peut rien toucher » non diagnostiqué ; Stripe non configuré ; taille APK > 40 Mo ; `follows` hérité ; plafond de dépense Anthropic ❓ ; base Neon ancienne contenant des comptes de démo au mot de passe connu (dangereux si réexposée).
- **Note** : le dernier message de l'utilisateur demande ce document de transfert ; ce fichier est le seul changement non commité (à committer ou non selon son choix).

---

## 11. Prochaines étapes (priorisées)

### P0 — Débloquer Plume++ pour `plume.lecture.ia@gmail.com`
1. Demander à l'utilisateur l'**hôte** (`ep-…`) de `DATABASE_URL` (sans mot de passe) et celui de la base Neon ouverte ; trouver la bonne base/branche.
2. Dans la bonne base, requête lecture seule :
   ```sql
   SELECT to_regclass('public.story_covers') AS couvertures, to_regclass('public.chapter_likes') AS jaime;
   SELECT email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10;
   SELECT email, plan FROM users WHERE email ILIKE '%plume.lecture%';
   ```
3. Si le compte est absent : le recréer avec l'APK 0.3.1 (mot de passe ≥ 6 car.).
4. Appliquer (équivalent exact de `set-plan-cli.ts` : 2 opérations seulement) :
   ```sql
   BEGIN;
   UPDATE users SET plan='premium', plan_expires_at=NULL
   WHERE email = lower('plume.lecture.ia@gmail.com') RETURNING id, email, plan;
   INSERT INTO audit_events (action, target_type, target_id, metadata)
   SELECT 'plan.set_by_admin','user',id::text,'{"plan":"premium","expiresAt":null,"via":"neon-sql"}'::jsonb
   FROM users WHERE email = lower('plume.lecture.ia@gmail.com');
   COMMIT;   -- ROLLBACK si l'UPDATE ne renvoie pas exactement 1 ligne
   ```
5. Vérifier dans l'appli : Plume++ et 30 crédits.

### P1 — Recette de l'APK 0.3.1 sur le téléphone (S24 Ultra)
Mot de passe 6 car. ; « se souvenir » coché/décoché ; accueil avec police système maximale ; couverture (choisir/recadrer/retirer, puis histoire publique vue depuis un 2e compte) ; police Moderne conservée ; réactions/commentaires ; analyse coach (~30 s, 1 crédit décompté, citations réelles). Obtenir les retours (captures). Diagnostiquer le contact bloqué (capture, modèle, version Android, lien d'APK).

### P2 — Mettre Stripe en service (mode test d'abord)
Compte Stripe en mode Test → deux produits mensuels (Plume+ 4,99 €, Plume++ 9,99 €) → webhook `https://plume-api-qk9s.onrender.com/stripe/webhook` avec `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed` → portail client activé → variables Render `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PREMIUM` (l'utilisateur les saisit lui-même) → Manual Deploy → vérifier `/health` `"billing":true` → test avec carte `4242 4242 4242 4242`. Passage en mode live seulement sur accord explicite.

### P3 — Sécurité et coûts
Plafond de dépense Anthropic (20 $/mois conseillé, Settings → Limits) ; décider du sort de l'ancienne base (comptes de démo, mot de passe connu) : vider ou supprimer **seulement avec accord explicite** (`db:cleanup-demo` exige `CONFIRM_DELETE_DEMO=yes`) ; surveiller le coût réel via `ai_usage_records.estimated_cost_micros`.

### P4 — Produit
Clarifier la règle « 5 réactions max » ; écran Favoris (signets vs étoiles) ; vérifier/ajouter bouton d'analyse globale et exercices adaptés ; tester « suivre un auteur » (table `follows` héritée) ; notifications push ; relecture juridique.

### P5 — Distribution
Taille < 40 Mo : AAB (`--profile production`) ou APK arm64 seul ; nom de domaine + Resend, puis `REQUIRE_EMAIL_VERIFICATION=true` ; Play Store : réétudier la règle de paiement Google ; envisager une offre Render sans veille (~7 $/mois) ; mettre à jour `docs/TEST_PLAN.md` à chaque limite constatée.

---

## Instructions pour la nouvelle session OpenCode

1. **Cloner** le dépôt (§7.2) sur Windows, ouvrir le dossier dans OpenCode, exécuter `npm install`. Ajouter ce fichier `TRANSFERT_OPENCODE_PLUME.md` au dépôt si vous le copiez (il est à la racine du dépôt cloné s'il a été commité ; sinon le copier à la main).
2. **Lire dans cet ordre** : ce document, `AGENTS.md` (conventions et garde-fous, obligatoires), `apps/mobile/AGENTS.md` (avant tout code Expo : lire la doc `https://docs.expo.dev/versions/v58.0.0/`, installer via `npx expo install`), puis `docs/DEPLOY_API.md` et `docs/EAS_BUILD.md`.
3. **Premier message à envoyer** à la nouvelle session : « Lis TRANSFERT_OPENCODE_PLUME.md et AGENTS.md. Reprends à la section 10 (état actuel) : le compte plume.lecture.ia@gmail.com est introuvable dans la base Neon consultée ; aide-moi à identifier la bonne base (P0). Réponds en français, de façon courte, avec des étapes exactes de tableau de bord, et ne me demande jamais de secret. »
4. **Vérifier l'état** avant de modifier : `git status`, `git log --oneline -5` (attendu : `bde52d7` en tête), puis les tests (§7.3). Si un test échoue, le signaler sans le masquer.
5. **Secrets** : ne jamais lire ni écrire de `.env` dans le dépôt ; l'utilisateur saisit lui-même les clés dans Render, Stripe, Brevo, Anthropic. Les secrets n'existent pas dans ce dépôt ni dans ce document. L'environnement Windows n'a pas les mêmes variables : la base locale de développement est PGlite (aucun secret requis).
6. **Règles de travail** : commit en français descriptif ; après chaque `push`, rappeler à l'utilisateur de faire **Manual Deploy → Deploy latest commit** et de vérifier le sha dans le journal ; vérifier ensuite `/health` ; tout nouvel APK = incrémenter `version` et `versionCode`, build `preview`, puis fournir lien, taille, SHA-256 et contrôles (version, URL d'API, permissions) ; demander accord avant toute dépense, publication ou suppression irréversible (Stripe live, suppression de base, plafond Anthropic, Play Store) ; ne pas déclarer une fonction « validée visuellement » sans capture.
7. **Modifications serveur** : une procédure tRPC reste mince (Zod → service → retour), logique dans `apps/api/src/services/`, propriété vérifiée, accès non autorisé = `NOT_FOUND`, messages d'erreur en français actionnables. Toute modification de schéma : nouvelle migration idempotente (`IF NOT EXISTS`) car la base de production a une histoire étrangère (§6, problèmes 2-4) ; la vérification de schéma au démarrage stoppe le serveur s'il manque une colonne.
8. **Modifications IA** : tester refus de réécriture, citations réelles uniquement, quota épuisé, isolation entre comptes, refus des passages < 30 mots.
9. **Puis enchaîner** sur les étapes P0 → P5 (§11), en confirmant à l'utilisateur chaque étape qui dépend de lui (Render, Neon, Stripe) avec des instructions précises, et en distinguant toujours vérifié / supposé / inconnu.

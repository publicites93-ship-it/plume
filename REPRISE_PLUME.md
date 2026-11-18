# REPRISE PLUME — document de reprise du développement

Rédigé le **18/11/2026** à partir du dépôt (code vérifié) et de l'historique de la session.
Il **remplace** `TRANSFERT_OPENCODE_PLUME.md` (17/11, arrêté au commit `bde52d7`, désormais obsolète).
**Aucun secret** n'y figure : ni clé API, ni mot de passe, ni URL de base de données.

**Légende de fiabilité**
- ✅ **Vérifié** : constaté par un test automatisé, une commande, une réponse HTTP de production ou un retour explicite de l'utilisateur.
- 🟡 **Codé, non vérifié en réel** : présent dans le code et couvert par des tests, mais pas encore observé sur téléphone ou en production.
- ⚠️ **Partiel** : une partie seulement est faite.
- ❌ **Non fait** : seulement prévu.
- ❓ **Inconnu** : impossible à vérifier depuis l'environnement de développement.

---

## 0. Résumé en 12 lignes

1. **Plume** est une application **Android**, en **français**, qui réunit un atelier d'écriture, une bibliothèque de lecture, un coach IA pédagogique et un **Studio d'écriture** par histoire. Règle absolue : **l'IA enseigne, questionne et critique, elle n'écrit jamais à la place de l'auteur.**
2. **Monorepo npm** : `apps/api` (Fastify 5, tRPC 11, Drizzle, PostgreSQL ou PGlite), `apps/mobile` (Expo SDK 58.0.26, React Native 0.88, Expo Router) et `packages/shared` (schémas Zod, tokens de design, contenus).
3. **Dépôt** : GitHub `publicites93-ship-it/plume`, branche `main`. Dernier commit de code : `dca6f06`. Le commit de ce document vient juste après. Aucune modification locale n'est en attente.
4. **API de production** : `https://plume-api-qk9s.onrender.com`. Render, offre **gratuite** (le service s'endort), image **Docker**. Le **déploiement est manuel** (voir §7.4).
5. **Base de production** : PostgreSQL chez **Neon**. Elle avait été créée par une autre version de Plume ; les migrations la complètent sans rien supprimer (§6.1).
6. **IA** : Claude (`AI_PROVIDER=anthropic`). **Haiku 5.5** pour les comptes Gratuit et pour toute extraction du Studio, **Sonnet 5.5** pour les formules payantes. ✅ Testé en réel.
7. **E-mails** : **Brevo**, sans nom de domaine. ✅ « Mot de passe oublié » testé par l'utilisateur.
8. **Paiement** : **Stripe**, en **mode test**. ✅ Les pages de paiement sont créées. Le parcours d'achat complet dans l'appli n'a pas été confirmé.
9. **Studio d'écriture** : phase 1 (fiches), phase 2 (analyse automatique) et phase 3 (panneau dans l'éditeur) codées. Phases 4 à 6 à faire (§8).
10. **Thème** Nuit, Sépia ou Ivoire appliqué à toute l'appli, et barre de navigation visible partout sauf en lecture : codés en 0.6.0, **non vérifiés visuellement**.
11. **Dernier APK vérifié** : **0.5.1** (versionCode 10). **0.6.0** (versionCode 11) : build EAS `d9c21e89-2f56-4955-a10d-852147fa1d5e` **en cours** au moment de la rédaction.
12. **Commits peut-être pas encore en production** : `cf0a0f2`, `852df3b` (carrousels par catégorie) et `dca6f06`. Il faut un **Manual Deploy** sur Render, à demander à l'utilisateur.

---

## 1. Présentation de Plume

### 1.1 Objectif et principes non négociables (`AGENTS.md`)
- Un atelier d'écriture et une bibliothèque de lecture, **Android d'abord**, **en français**.
- **Propriété** : les manuscrits privés appartiennent à leur auteur, et rien n'est publié par défaut.
- **Vérité des citations** : toute citation présentée comme venant du manuscrit est vérifiée **mot pour mot** (`citationExists` dans `packages/shared/src/text.ts`).
- **Honnêteté** : ne jamais présenter comme opérationnelle une fonctionnalité non testée. Le mode `mock` doit rester signalé comme simulation.
- **L'IA n'écrit jamais à la place de l'auteur.** Décision du 17/11 : Muse donnera **des pistes et des questions, jamais de prose prête à coller**.

### 1.2 Profils
À l'inscription puis dans l'onboarding, l'utilisateur choisit **Lire**, **Écrire** ou **Écrire et lire** (`profiles.goal` : `read`, `write` ou `both`). Le profil se change dans **Réglages → Mon profil** (`auth.setGoal`). Le **Studio d'écriture est réservé** aux profils `write` et `both`, contrôle fait par le serveur dans `requireStudioAccess`. Un profil sans valeur (ancien compte) garde l'accès.

### 1.3 Fonctionnalités principales (détail des statuts au §3)
- **Écrire** : histoires, chapitres, éditeur avec enregistrement automatique (versions, conflits, brouillons hors ligne), publication, export, couverture personnalisée, Studio d'écriture.
- **Lire** : catalogue Découvrir (carrousels), fiche publique, lecteur (ambiances Nuit, Sépia, Ivoire ; taille ; police Classique ou Moderne), signets, listes, favoris (bibliothèque), réactions, J'aime, commentaires, compteurs.
- **Apprendre** : 7 compétences, ateliers, exercices corrigés par le coach, carte de compétences, « compétence à travailler en priorité ».
- **Coach IA** : analyse d'un chapitre sur une compétence, analyse globale des 7 compétences, conversation, correction d'exercices. Citations vérifiées, et refus de réécrire.

### 1.4 Formules (source de vérité : `packages/shared/src/domain/plans.ts`)
| Formule | Code | Prix TTC | Crédits coach / mois | Histoires actives | Chapitres / semaine |
| --- | --- | --- | --- | --- | --- |
| Plume Gratuit | `free` | 0 € | 3 | 1 | 3 |
| Plume+ | `plus` | 4,99 € | 15 | 5 | 30 |
| Plume++ | `premium` | 9,99 € | 30 | 20 | 100 |

- **Crédits du coach** : **1 crédit = 1 action** (analyse, analyse globale, correction, message). Ils sont comptés dans `creditsUsedThisMonth` (`apps/api/src/services/plans.ts`). Les tâches dont le nom commence par `studio_` **ne comptent pas**.
- **Quotas du Studio**, par fonction et par mois. Valeurs par défaut dans `STUDIO_AI_DEFAULT_LIMITS` (`packages/shared/src/domain/studio.ts`), **modifiables en base** dans la table `plan_limits` (plan, feature, monthly_limit) :

| Fonction | Gratuit | Plume+ | Plume++ |
| --- | --- | --- | --- |
| `chapter_analysis` (analyse automatique d'un chapitre) | 2 | 25 | 100 |
| `muse_quick` (Muse rapide, Haiku), **pas encore codé** | 5 | 80 | 300 |
| `muse_deep` (Muse approfondie, Sonnet), **pas encore codé** | 0 | 10 | 40 |
| `coherence` (vérification de cohérence), **pas encore codé** | 0 | 5 | 30 |

- **Formule offerte** : sans paiement, avec `npm run db:set-plan --workspace @plume/api -- <email> <free|plus|premium> [jours]`, ou en SQL dans Neon (§7.5). Le compte `plume.lecture.ia@gmail.com`, contact officiel de Plume, est en **Plume++ sans expiration**, ✅ fait par l'utilisateur via Neon.
- **Abonnement Stripe** : `users.plan` et `users.planExpiresAt` sont mis à jour par le webhook. L'expiration vaut fin de période + **3 jours de grâce**. `effectivePlan` repasse en `free` après expiration.

---

## 2. Architecture technique

### 2.1 Arborescence
```text
apps/api/            Fastify 5 + tRPC 11 + Drizzle + PostgreSQL (prod) / PGlite (dev, tests)
  src/server.ts      point d'entrée (charge .env puis imports dynamiques)
  src/app.ts         Fastify : CORS, limitation de débit, routes HTTP, tRPC sur /trpc, /health
  src/config.ts      variables d'environnement (Zod) + garde-fous de production
  src/auth/          mots de passe (scrypt), jetons JWT, jetons e-mail, sessions
  src/db/            schema.ts, migrate.ts (+ reconcile.ts), seed, CLIs
  src/routes/        pages HTML : légal, auth web, couvertures, images du studio, paiement + webhook Stripe
  src/services/      logique métier (stories, social, discover, narrative, studio, studioAnalysis, covers, billing, email, plans, ai/*)
  src/trpc/routers/  ai, auth, billing, learning, narrative, reading, stories, studio
  migrations/        0000 → 0007 (SQL Drizzle, rendus tolérants à partir de 0001)
  test/              16 fichiers Vitest (84 tests)
apps/mobile/         Expo SDK 58, Expo Router
  app/               routes (voir 2.4)
  src/components/    design system (Button, Card, Sheet, Cover, StoryCard, ReaderSocial, StudioAnalysis, StudioQuickPanel…)
  src/lib/           api (tRPC + réseau résilient), auth, billing, covers, drafts, errors, ui, session…
  src/theme/         thème actif (Nuit / Sépia / Ivoire), withAlpha, gradients, setAppTheme
packages/shared/     tokens, schémas Zod, formules, compétences, studio, social, ateliers, utilitaires texte
docs/                spécifications historiques, en partie obsolètes (voir §9.4)
Dockerfile           image de l'API utilisée par Render (NODE_ENV=production intégré)
render.yaml          blueprint de référence ; le service réel est configuré dans le tableau de bord
```

### 2.2 Interactions
```text
Appli Android (APK EAS)
   │  HTTPS tRPC (superjson) — EXPO_PUBLIC_API_URL = https://plume-api-qk9s.onrender.com/trpc
   ▼
API Fastify sur Render (Docker, offre gratuite, endormissement)
   ├── PostgreSQL Neon (DATABASE_URL)
   ├── Anthropic Claude (CLAUDE_API_KEY / ANTHROPIC_API_KEY), côté serveur uniquement
   ├── Brevo (e-mails transactionnels, BREVO_API_KEY)
   └── Stripe (Checkout, portail client, webhook POST /stripe/webhook)
Pages web servies par l'API : /confidentialite, /conditions, /supprimer-compte, /legal,
  /verifier-email, /reinitialiser-mot-de-passe, /paiement/{succes,annule,retour}
Liens profonds : plume://verifier-email, plume://reinitialiser-mot-de-passe, plume://paiement/{statut}
```

### 2.3 Backend : procédures tRPC (vérifiées dans le code)
- `auth` : signUp, signIn, refresh, logout, me, updateProfile, **setGoal**, completeOnboarding, updatePreferences, changePassword, deleteAccount (résilie d'abord l'abonnement Stripe), exportData, resendVerification, verifyEmail, requestPasswordReset, resetPassword.
- `stories` : list, create, update, delete, dashboard, export, createChapter, saveChapter, chapter, versions, restoreVersion, publishChapter, unpublishChapter, archiveChapter, deleteChapter, restoreChapter, duplicateChapter, reorderChapters, **setCover**, **removeCover**.
- `reading` : catalog, **discover** (trending, forYou, mostLoved, latest, **byGenre**), story, chapter, toggleFollow (= favoris), toggleAuthorFollow, saveProgress, library, bookmarks, addBookmark, removeBookmark, lists, createList, addToList, author, **stats**, **toggleReaction**, **chapterSocial**, **toggleChapterLike**, **comments**, **addComment**, **deleteComment**.
- `ai` : analyzeChapter, analyzeStory (7 compétences), list, get, forChapter, progress, startSession, sessions, session, send.
- `learning` : skills, workshop, progress, saveExerciseAttempt, **reviewExercise**, exerciseAttempts.
- `narrative`, procédures du Studio réservées aux profils qui écrivent : list, create, update et delete pour Character, Location, Plot, Event, Idea, savePlan, **create/update/deleteRelation**, **addMedia**, **removeMedia**.
- `studio` : **requestAnalysis** (`{chapterId, manual, force}`), **overview**, **proposals**, **decide**.
- `billing` : status, checkout (`{plan: plus|premium}`), portal.

**Routes HTTP hors tRPC** :
- `GET /health` : renvoie `ai`, `aiAvailable`, `billing`, `email`, `emailVerification`.
- `GET /covers/:storyId` : une couverture privée n'est visible que par son auteur.
- `GET /studio-media/:id` : toujours réservé à l'auteur.
- `POST /stripe/webhook` : corps brut, signature HMAC vérifiée.
- Pages légales, pages d'authentification web, pages de retour de paiement.

### 2.4 Frontend : routes Expo Router (`apps/mobile/app/`)
- **Racine** : `_layout.tsx` (polices, thème, `wakeServer`, ErrorBoundary de secours), bienvenue, connexion, inscription, onboarding, mot-de-passe-oublie, reinitialiser-mot-de-passe, verification-envoyee, verifier-email, `paiement/[statut]`.
- **`(tabs)/`** : index (Accueil), decouvrir, ecrire, apprendre, profil, avec la barre maison `PlumeTabBar`.
- **`(tabs)/(protected)/`**, depuis la 0.6.0 : écrans **sous la barre de navigation**, via un onglet caché `href: null` avec `backBehavior="history"` :
  - histoire, chapitre (éditeur) ;
  - bible (= **Studio d'écriture**), fiche (personnage ou lieu) ;
  - coach, analyse, atelier ;
  - histoire-publique, auteur, bibliotheque (= favoris), favoris (= signets), listes, reglages.
- **`(lecture)/lecture/[id]`** : lecteur **en plein écran**, hors des onglets, donc sans barre de navigation.
- Les adresses (`/histoire/[id]`, etc.) ne dépendent pas des groupes entre parenthèses.

### 2.5 Base de données (`apps/api/src/db/schema.ts`)
- **Tables principales** : users, profiles, user_preferences, refresh_tokens, auth_tokens, stories, chapters, chapter_versions, publications, story_follows, reading_progress, bookmarks, reading_lists, reading_list_items, comments, reactions (sur commentaires), **story_reactions**, **chapter_likes**, notifications, ai_analyses, analysis_findings, skill_assessments, exercise_attempts (avec correction), coaching_sessions, coaching_messages, narrative_memory_entries (inutilisée), characters, locations, plot_threads, timeline_events, story_ideas, story_plans, background_jobs (inutilisée), audit_events, ai_usage_records (avec `estimated_cost_micros`), subscriptions, **story_covers**, **character_relations**, **studio_media**, **chapter_analysis_state**, **studio_proposals**, **plan_limits**.
- **Studio** :
  - `characters` et `locations` ont `sheet` (jsonb, champs de fiche), `sources` (jsonb, origine par champ : `author` ou `ai`, avec chapitre et citation) et `origin` (`author` ou `ai`). `characters` a aussi `aliases`.
  - `plot_threads.kind` vaut `main` ou `secondary`.
  - `timeline_events` a `certainty` (`confirmed`, `hypothesis`, `idea`), `origin` et `source_quote`.
  - `character_relations` a `origin` (`author` ou `extracted`), `source_chapter_id` et `source_quote`.
- **Migrations** : `0000` initiale ; `0001` jetons e-mail ; `0002` corrections d'exercices ; `0003` réactions et J'aime ; `0004` couvertures ; `0005` abonnements Stripe ; `0006` Studio phase 1 ; `0007` Studio phase 2.
- **Développement et tests** : PGlite dans `apps/api/data/pglite`, en mémoire pour les tests.

### 2.6 Services externes
| Service | Rôle | État |
| --- | --- | --- |
| Render | Héberge l'API (Docker), service `plume-api-qk9s` | ✅ en ligne, offre gratuite ; l'ancien service `plume-api` est **suspendu** |
| Neon | PostgreSQL de production | ✅ ; **l'ancienne base a été supprimée** par l'utilisateur |
| Anthropic | Coach et Studio (Haiku et Sonnet 5.5) | ✅ réel |
| Google Gemini | Fournisseur alternatif (`AI_PROVIDER=gemini`, modèle `gemini-3.8-flash`) | code présent, **non utilisé** (quota nul pour les nouveaux projets sur 2.5) |
| Brevo | E-mails (vérification, réinitialisation) | ✅ réinitialisation testée ; délivrabilité (spam) ❓ |
| Resend | Alternative avec nom de domaine | code présent, non configuré |
| Stripe | Abonnements | ✅ mode test, pages de paiement créées ; achat réel dans l'appli ❓ |
| Expo EAS | Builds Android (compte `st93`, projet `plume`) | ✅ |
| GitHub | Dépôt `publicites93-ship-it/plume` | ✅ |

---

## 3. Fonctionnalités : état réel

### 3.1 Comptes et sécurité
- ✅ **Comptes** : inscription, connexion, rafraîchissement de session, suppression de compte effective (cascade + résiliation Stripe), export des données.
- ✅ **Mot de passe** : **6 caractères minimum, sans autre exigence** (`PASSWORD_MIN_LENGTH`).
- ✅ **Mot de passe oublié** : par Brevo, lien valable 1 h, à usage unique, déconnexion des autres sessions.
- 🟡 **Vérification d'e-mail** : codée, mais **désactivée** (`REQUIRE_EMAIL_VERIFICATION=false`).
- 🟡 **« Se souvenir de moi »** (0.3.1 et suivantes) :
  - **décochée par défaut** ;
  - cochée : session gardée 30 jours dans SecureStore, e-mail pré-rempli ;
  - décochée : session en mémoire seulement ;
  - l'e-mail mémorisé **reste** après la déconnexion.
- ✅ **Messages d'authentification** : « Connectez-vous pour continuer. » sans jeton, « Votre session a expiré… » avec un jeton expiré.
- ✅ **Production** : `NODE_ENV=production` intégré à l'image Docker. L'API refuse de démarrer sans `JWT_SECRET` d'au moins 32 caractères aléatoires.
- ✅ **Réseau résilient** : délai de 30 s par requête, **2 min pour les appels IA** (`ai.*`, `learning.reviewExercise`, `studio.*`). Nouvelles tentatives sur erreur réseau ou 502/503/504 pour les lectures et les mutations d'authentification. `wakeServer()` au lancement.

### 3.2 Écriture
- ✅ **Histoires et chapitres** : versions, conflits, enregistrement automatique (1,8 s), brouillons locaux hors ligne, publication et dépublication, export TXT ou Markdown.
- ✅ **Couverture personnalisée** :
  - sélecteur de photos du système, sans permission ;
  - recadrage 2:3, puis 600 × 900 px en JPEG ;
  - stockage en base (600 Ko maximum, signature binaire vérifiée) ;
  - une histoire privée garde sa couverture visible par son seul auteur.

### 3.3 Lecture et social
- ✅ **API** : réactions (Frisson, Tension, Love, Je décroche), J'aime par chapitre, favoris (= `story_follows`, affichés comme « Mes favoris · bibliothèque »), commentaires (l'auteur modère), compteurs œil, cœur et étoile. Testés.
- 🟡 **Lecteur** : choix de police Classique (Lora) ou Moderne (Inter, italique simulé), mémorisé. Ambiances Nuit, Sépia, Ivoire.
- 🟡 **Découvrir** :
  - carrousels « Histoires du moment » (7 jours), « Selon vos goûts », « Les plus aimées » et « Nouveautés », avec J'aime, favoris et lecteurs sous chaque vignette ;
  - **une rangée par catégorie** (`byGenre`, commit `852df3b`, **déploiement non confirmé**) ;
  - liste filtrable en bas.

### 3.4 Coach et apprentissage
- ✅ **Analyse de chapitre** (Sonnet), avec des citations réelles.
- ✅ **Analyse des 7 compétences** : ✅ réussie en réel en 32 s sous Haiku, après l'assouplissement des schémas (`a149f34`). La correction des notes sur 10 (`2235934`, `cf0a0f2`) n'est **pas confirmée** en production.
- 🟡 **Conversation et correction d'exercices** : codées et testées avec simulation.
- 🟡 **« À travailler en priorité »** dans Apprendre, à partir de deux compétences évaluées.

### 3.5 Studio d'écriture (cahier « Studio d'écriture intelligent »)
- **Phase 1, fondations** : ✅ en production, vérifiée par l'API.
  - tableau de bord par histoire (écran `bible/[id]`, titre « Studio d'écriture ») ;
  - **fiches complètes** personnage (Identité, Apparence, Personnalité, Goûts, Psychologie, Évolution, Notes) et lieu, définies par `CHARACTER_SECTIONS` et `LOCATION_SECTIONS` ;
  - surnoms, jusqu'à 3 **portraits** ou images privés par fiche (300 Ko maximum) ;
  - **relations** ;
  - intrigues principale ou secondaire, chronologie avec certitude, carnet.
- **Phase 2, analyse automatique** : ✅ en production, vérifiée par une extraction réelle sur un texte inspiré d'Alice.
  - **déclenchement** : à la sortie de l'éditeur (automatique), ou par « Analyser », « Analyser tous les chapitres modifiés » et « Réanalyser » (`force`) ;
  - **modèle** : toujours **Haiku** (`getAIProvider("free")`), texte limité à 60 000 caractères ;
  - **appels évités** : un chapitre inchangé n'est pas réanalysé, et l'analyse automatique attend 10 minutes entre deux passages ;
  - **rien d'inventé** : chaque information exige une **citation vérifiée** ; un nom absent du texte est écarté (`nameInText`, qui tolère un article ou une parenthèse ajoutés) ;
  - **priorité à l'auteur** : un champ vide est rempli avec sa source ; un champ déjà rempli n'est **jamais écrasé** et devient une **proposition** (`studio_proposals`), avec « Remplacer » ou « Garder le mien » ; toute modification de l'auteur marque la source `author` ;
  - **quota** dans `plan_limits`, rien n'est décompté en cas d'échec ;
  - **bilan** affiché par chapitre (0.5.1).
- **Phase 3, panneau dans l'éditeur** : 🟡 codée (`StudioQuickPanel`, bouton bibliothèque dans la barre de l'éditeur, 0.6.0). Elle affiche personnages, lieux, relations, intrigues, notes avec ajout rapide, et Muse comme « à venir ».
- **Phases 4 à 6** : ❌ (§8).

### 3.6 Paiement Stripe
- 🟡 **Code** : Checkout, portail client, webhook signé (relecture de l'abonnement chez Stripe), pages de retour et lien `plume://paiement`, résiliation à la suppression du compte, contrôle du format des variables au démarrage.
- ✅ **Mode test** : pages de paiement Plume+ et Plume++ créées en production.
- ❓ **Parcours complet dans l'appli** (carte 4242, activation, portail) : non confirmé par l'utilisateur.
- ❌ **Mode réel** : non configuré.

### 3.7 Apparence et navigation (0.6.0, ✅ code, ❓ visuel)
- **Thème de l'appli** dans Réglages : Nuit, Sépia ou Ivoire, appliqué après une relance de l'interface (`reloadAppAsync`).
- **Barre d'onglets** visible partout sauf dans le lecteur, et masquée quand le clavier est ouvert.

### 3.8 Non faits ou simplement prévus
- ❌ Muse, vérification de cohérence, carte des relations interactive, chronologie assistée, analyse approfondie des personnages ou du roman.
- ❌ Fusion manuelle des doublons de personnages.
- ❌ Notifications push : préférences masquées dans l'appli, Firebase reporté.
- ❌ Nom de domaine et Resend.
- ❌ Render payant.
- ❌ Stockage d'images externe.
- ❌ AAB Play Store et publication.
- ❌ Paiement Google Play (Stripe a été choisi).
- ❌ Relecture juridique des pages légales.

---

## 4. Dernières modifications (chronologie)

| Commit | Contenu | APK | API déployée ? |
| --- | --- | --- | --- |
| `86d13bd` | Cahier du 16/11 : e-mails, coach réel, crédits, réactions et commentaires | 0.2.0 | ✅ |
| `b2e3903`, `b3fdfe4`, `14a2d90` | Migrations tolérantes et complément d'une base héritée | — | ✅ |
| `98ae0aa`, `707a38e` | Bascule sur `plume-api-qk9s`, `NODE_ENV=production` dans Docker | 0.3.1 | ✅ |
| `4748610` → `375ab2b` | Coach : messages, journaux, Gemini 3.8, Claude, crédits 3/15/30, Haiku pour Gratuit | — | ✅ |
| `c1dba77`, `6882b2f` | Brevo, message clair sur une réponse non JSON | — | ✅ |
| `ad622ba`, `07fe97d`, `932aee2` | Couverture personnalisée, police du lecteur, correction du build Android | 0.3.0 | ✅ |
| `28a0cf5`, `ac67896`, `5419d91`, `bde52d7` | Mot de passe à 6, « Se souvenir de moi », `db:set-plan`, Stripe | 0.3.1 | ✅ |
| `e0d5bad` | Expo 58.0.26, modules natifs chargés à la demande, ErrorBoundary | 0.3.2 | — |
| `f773af6`, `0a0b4b3`, `baa2f63` | Priorité Apprendre, favoris, docs Render, contrôle des variables Stripe | 0.3.3 | ✅ |
| `37c7627`, `cd741a8` | Découvrir : carrousels et compteurs | 0.3.4 | ✅ |
| `a7a38a9`, `853f7ba` | Studio phase 1 | 0.4.0 | ✅ |
| `e182f28`, `a4de149` | Studio phase 2 | 0.5.0 | ✅ |
| `973b2e6`, `a149f34` | Noms tolérants, Réanalyser, bilan, schémas IA tolérants, délai IA de 2 min | 0.5.1 | ✅ (test réel) |
| `2235934`, `cf0a0f2` | Notes sur 10 ramenées sur 100, consigne 0-100 | — | ❓ |
| `852df3b` | Barre d'onglets partout sauf lecture, carrousels par catégorie | 0.6.0 | ❓ (byGenre) |
| `06e2604` | Studio phase 3 (panneau dans l'éditeur) | 0.6.0 | appli uniquement |
| `dca6f06` | Thème pour toute l'appli | 0.6.0 | appli uniquement |

### APK produits (profil `preview`, signature identique depuis le début)
| Version | versionCode | Build EAS | Lien |
| --- | --- | --- | --- |
| 0.3.4 | 7 | `3f542594` | https://expo.dev/artifacts/eas/bNZZTabWXLFwOgWVzko7KrbekCs9MNMc_mO86p3PCgU.apk |
| 0.4.0 | 8 | `5f00b685` | https://expo.dev/artifacts/eas/IJmaEqGw4DfkMRnjOpGrTQHXQzDC2RLeDdqYp0FZbP8.apk |
| 0.5.0 | 9 | `e07aa46c` | https://expo.dev/artifacts/eas/a-NbrfVeBOkNOWObbXkJC-qzsd8L6wZ-x02IGF2wmQU.apk |
| **0.5.1** | 10 | `0cdd6502` | https://expo.dev/artifacts/eas/hddvSbn7ycFjC-qFdQliINK8sDtQ7659LBD4jhNyfMo.apk (SHA-256 `57c25d6b…7feaf`) |
| 0.6.0 | 11 | `d9c21e89-2f56-4955-a10d-852147fa1d5e` | **en cours** : `npx eas-cli@latest build:view d9c21e89-2f56-4955-a10d-852147fa1d5e` |

- Taille d'un APK : environ **53,8 Mo**, avec deux architectures (`arm64-v8a`, `armeabi-v7a`). L'objectif de moins de 40 Mo n'est atteint qu'avec un AAB.
- Permissions présentes : INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, VIBRATE, et DUMP (permission système, origine non identifiée, sans effet pour une appli).

---

## 5. Décisions et préférences de l'utilisateur

1. **Langue et style** : tout est en français. L'utilisateur travaille depuis un **Samsung S24 Ultra** et écrit des messages courts. Il faut lui donner des **étapes précises dans les tableaux de bord** (menus exacts, valeurs exactes) et ne **jamais lui demander de coller un secret**.
2. **Distribution** : APK `preview` installé directement, sans Expo Go ni Metro. Pas de Play Store pour l'instant.
3. **Paiement** : **Stripe**, pas Google Play. À réétudier si l'appli est un jour publiée sur le Play Store, à cause de la règle de Google sur la facturation.
4. **Dépenses** : tout ce qui est payant est reporté **jusqu'à la mise en distribution** : Render payant, stockage externe, nom de domaine, Firebase. L'API Claude est payante, mais l'utilisateur l'a activée lui-même. Une limite de dépense de 20 $ par mois a été recommandée.
5. **IA** :
   - Claude, Haiku pour Gratuit et Sonnet pour payant ; Studio : Haiku pour l'extraction ;
   - Sonnet pour Muse approfondie et la cohérence, quand elles seront codées ;
   - Opus non utilisé ;
   - **ne jamais coder de tarif supposé** : les tarifs utilisés (`MODEL_PRICES_PER_MTOK`) viennent de la page officielle relevée le 17/11/2026 (Sonnet 5.5 : 2 $ / 10 $ par million de tokens, Haiku 5.5 : 0,10 $ / 0,50 $ jusqu'à 100 000 tokens, Batch −50 %).
6. **Crédits** : 1 crédit = 1 action ; 3, 15, 30. Les quotas du Studio suivent les recommandations, avec Muse mixte (§1.4). L'utilisateur souhaite **remplacer à terme les crédits du coach par des quotas par fonction** (phase 6).
7. **Muse** : pistes et questions seulement, conformément à la règle « l'IA n'écrit jamais ».
8. **Studio** : réservé aux profils Écrire et Les deux, avec un réglage pour changer de profil. Les images sont stockées en base, plafonnées.
9. **Mot de passe** : 6 caractères, **sans aucune exigence** (option B).
10. **« Se souvenir de moi »** : proposé comme option, décochée par défaut.
11. **E-mails** : Brevo tant qu'il n'y a pas de nom de domaine. La vérification d'e-mail reste désactivée tant que la délivrabilité n'est pas validée.
12. **Navigation** : barre visible partout sauf **en pleine lecture**.
13. **Thème** : d'abord limité au lecteur, puis **appliqué à toute l'appli** à la demande de l'utilisateur (18/11).
14. **Découvrir** : carrousels « du moment », « selon mes goûts », « plus aimées », « nouveautés », plus **une rangée par catégorie** ; titre, J'aime, favoris et lecteurs sous chaque vignette.
15. **Comptes** : `plume.lecture.ia@gmail.com` en Plume++. Les comptes et histoires de démonstration ne doivent pas exister en production (`SEED_DEMO=false`).
16. **Hébergement** : on garde `plume-api-qk9s`. L'ancien service `plume-api` est suspendu, et l'ancienne base Neon supprimée par l'utilisateur.
17. **Notifications push** : à voir plus tard.

---

## 6. Bugs et problèmes connus

### 6.1 Résolus (cause et solution)
| Problème | Cause | Solution |
| --- | --- | --- |
| Migrations en échec (`42P07`, puis `42P01`) | La base Neon avait été créée par une autre version de Plume | Migrations `0001`+ tolérantes ; `migrate.ts` + `reconcile.ts` complètent le schéma sans rien supprimer ; tables en conflit renommées `*_legacy_<date>` ; contrôle des tables et colonnes manquantes au démarrage |
| Render ne déployait pas le dernier commit | L'auto-déploiement n'est pas fiable, et enregistrer une variable redéploie le commit précédent | Toujours **Manual Deploy → Deploy latest commit**, puis vérifier le hash dans le journal |
| `JSON Parse error` dans l'appli | L'ancien APK appelait l'ancien service suspendu, qui renvoie du HTML | Nouvel APK ; message clair sur une réponse non JSON |
| Coach : 429 avec Gemini | `gemini-2.5-flash` obsolète, quota nul | Passage à Claude ; Gemini par défaut en 3.8-flash |
| Paiement « non configuré » | Prix live avec une clé de test, puis clé publique `pk_` au lieu de `sk_` | Tout en mode test ; contrôle du format au démarrage |
| Build EAS en échec (`MissingDefaultResource`) | Couleurs du recadrage définies seulement pour le mode sombre | Couleurs déclarées aussi dans `colors` (`app.json`) |
| 0.3.1 ne s'installait pas chez l'utilisateur | Côté téléphone (téléchargement ou blocage) ; APK sain | Résolu par une nouvelle installation |
| `expo-web-browser` 58.1.0 avec expo 58.0.25 | Versions désalignées | Expo 58.0.26 (`expo-doctor` 20/20) ; modules natifs chargés à la demande |
| Studio : Alice et le Lapin Blanc non détectés | Noms renvoyés avec un article ou une parenthèse, donc rejetés | `nameInText` tolérant ; bouton « Réanalyser » |
| Analyse des 7 compétences sans effet | Schéma de réponse trop strict pour Haiku, et délai de 30 s dans l'appli | Schémas tolérants sur la forme ; délai IA de 2 min |
| Notes sur 10 au lieu de 100 | Haiku | Mise à l'échelle si toutes les notes sont ≤ 10, consigne explicite (déploiement ❓) |

### 6.2 Non résolus ou à surveiller
- **Thème Sépia et Ivoire jamais vu à l'écran.** Des contrastes ou des détails sombres en dur sont possibles. `app.json` garde `userInterfaceStyle: "dark"`, donc dialogues système et clavier restent sombres. À corriger sur captures.
- **Table `follows` héritée** : la colonne `following_id` reste NOT NULL (le complément n'a pas pu l'assouplir). **Suivre un auteur risque d'échouer en production**, ce qui n'a pas été testé.
- **Tables `*_legacy_*`** probablement présentes en production (ex. `auth_tokens_legacy_…`, créées par les migrations tolérantes si une table du même nom existait) : ❓ à vérifier dans Neon, puis à supprimer un jour avec l'accord de l'utilisateur.
- **Offre gratuite de Render** : endormissement, premier appel de 30 à 60 s ; une analyse en arrière-plan peut être interrompue si le service s'endort.
- **File EAS gratuite** : de 2 min à 1 h d'attente. **Hermes ne compile pas localement** (machine aarch64) ; seul `expo export --no-bytecode` sert de contrôle.
- **APK de 53,8 Mo** : au-dessus de l'objectif de 40 Mo.
- **E-mails Brevo** : risque de spam, expéditeur réécrit, sans nom de domaine.
- **Pages légales** (`apps/api/src/routes/legal.ts`) : brouillons à faire relire par un juriste.
- **Parcours Stripe** dans l'appli non confirmé ; mode réel non configuré.
- **Avertissement `sslmode` de `pg`** dans les journaux Render : sans gravité.
- **Imports `isDarkTheme` peut-être inutilisés** dans quelques fichiers (`PlumeTabBar`, `chapitre`, `onboarding`) après les retouches de thème : sans effet, à nettoyer.

---

## 7. Configuration

### 7.1 Variables d'environnement de l'API (`apps/api/src/config.ts`)
| Variable | Production actuelle | Remarque |
| --- | --- | --- |
| `NODE_ENV` | `production` (fixé dans le Dockerfile) | active les garde-fous |
| `DATABASE_URL` | Neon | **secret** |
| `JWT_SECRET` | défini | **secret**, 32 caractères minimum |
| `PUBLIC_APP_URL` | `https://plume-api-qk9s.onrender.com` | liens des e-mails et de Stripe |
| `CORS_ORIGINS` | — | l'appli native n'en a pas besoin |
| `AI_PROVIDER` | `anthropic` | `mock`, `gemini` ou `anthropic` |
| `CLAUDE_API_KEY` (ou `ANTHROPIC_API_KEY`) | défini | **secret** |
| `ANTHROPIC_MODEL` / `ANTHROPIC_MODEL_FREE` | valeurs par défaut `claude-sonnet-5-5` / `claude-haiku-5-5` | |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | inutilisés | |
| `EMAIL_PROVIDER` | `brevo` | `console`, `resend`, `brevo` ou `test` (`console` est bloqué en production) |
| `BREVO_API_KEY` | défini | **secret** |
| `EMAIL_FROM` | valeur recommandée : `Plume <plume.lecture.ia@gmail.com>` (❓ non vérifiée) | doit être un expéditeur vérifié chez Brevo |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | |
| `STRIPE_SECRET_KEY` | `sk_test_…` | **secret** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (mode test) | **secret** |
| `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_PREMIUM` | `price_…` (mode test) | |
| `SEED_DEMO` | `false` | |
| `LEGAL_CONTACT_EMAIL` | `plume.lecture.ia@gmail.com` | |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | 900 s / 30 jours | |

**Côté appli** : `EXPO_PUBLIC_API_URL`, défini dans `apps/mobile/eas.json` (profils `preview` et `production`) à `https://plume-api-qk9s.onrender.com/trpc`.

### 7.2 Commandes
```bash
npm install
npm run dev:api                      # API locale :4000 (PGlite)
npm run dev:mobile                   # Expo
npm run db:migrate --workspace @plume/api
npm run db:generate --workspace @plume/api   # après modification de schema.ts
npm run db:set-plan --workspace @plume/api -- <email> <free|plus|premium> [jours]

# Vérifications (à lancer avant tout commit)
npm run test --workspace @plume/shared                                   # 10 tests
NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api      # 84 tests
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck --workspace @plume/api
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck --workspace @plume/mobile
cd apps/mobile && npx expo-doctor        # 20/20 attendu
cd apps/mobile && NODE_OPTIONS=--max-old-space-size=4096 npx expo export --platform android --no-bytecode --output-dir /tmp/plume-export
```

### 7.3 Build APK (EAS)
1. Incrémenter `expo.version` et `expo.android.versionCode` dans `apps/mobile/app.json`. La source de version est locale.
2. Commit, puis `git push`.
3. Dans `apps/mobile` : `npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait`.
4. Suivi : `npx eas-cli@latest build:view <id>`. Journal en cas d'échec : `build:view <id> --json`, puis `logFiles[0]`. Le lien expire en 15 minutes et le contenu est **compressé en Brotli**.
5. Vérifier l'APK téléchargé :
   - `unzip -t` ;
   - la signature est restée la même ;
   - l'adresse `plume-api-qk9s.onrender.com/trpc` est présente dans `assets/index.android.bundle` ;
   - version et permissions (`unzip -p … AndroidManifest.xml | strings -el`).
6. **Ne jamais créer ni modifier `apps/mobile/android/`** à la main (génération automatique par Expo, ignoré par Git). Si `npx expo prebuild` est lancé pour vérifier, **supprimer** ensuite `android/` et **annuler** les changements de `package.json` (scripts `android` et `ios`).
7. Un module natif s'installe avec `npx expo install`, jamais avec `npm install` directement. Il faut ensuite un nouvel APK.

### 7.4 Déploiement de l'API (Render), toujours manuel et avec l'accord de l'utilisateur
1. Pousser sur `main`.
2. Demander à l'utilisateur : Render → `plume-api-qk9s` → **Manual Deploy → Deploy latest commit**, en vérifiant le hash dans le journal.
3. Au démarrage, `db:migrate` s'exécute, puis l'API démarre. Le journal affiche `[plume] paiement Stripe : configuré` ou la variable fautive.
4. **Vérifier depuis l'environnement de développement** :
   - `curl https://plume-api-qk9s.onrender.com/health` ;
   - une procédure récente sans session doit répondre **401**, et non 404 ;
   - des scripts de recette avec des **comptes jetables**, supprimés à la fin (`auth.deleteAccount`).
5. **Il n'y a pas de Shell Render** (offre gratuite). Les opérations en base passent par l'**éditeur SQL de Neon**, que l'utilisateur utilise lui-même.

### 7.5 SQL utile (Neon)
```sql
-- Offrir Plume++ (premium) sans expiration
UPDATE users SET plan = 'premium', plan_expires_at = NULL WHERE email = lower('…') RETURNING id, email, plan;
-- Modifier un quota du Studio sans nouvelle version
INSERT INTO plan_limits (plan, feature, monthly_limit) VALUES ('plus', 'chapter_analysis', 30)
ON CONFLICT (plan, feature) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit, updated_at = now();
-- État des analyses du Studio
SELECT chapter_id, status, summary, error, analyzed_at FROM chapter_analysis_state ORDER BY analyzed_at DESC LIMIT 10;
-- Coût IA estimé du mois (micro-dollars)
SELECT task_kind, model, count(*), sum(estimated_cost_micros) FROM ai_usage_records
WHERE created_at >= date_trunc('month', now()) GROUP BY 1, 2;
```

---

## 8. Travail restant (par priorité)

### P0 : immédiat
1. Récupérer le résultat du build 0.6.0 (`d9c21e89…`) et le vérifier (§7.3), puis envoyer le lien à l'utilisateur.
2. Demander le **Manual Deploy** de `dca6f06` ou plus récent, puis vérifier :
   - `reading.discover` renvoie bien `byGenre` ;
   - les notes de l'analyse des 7 compétences sont sur 100.
3. Recette sur téléphone, avec captures :
   - thèmes Sépia et Ivoire sur les écrans principaux ;
   - barre d'onglets ;
   - panneau Studio dans l'éditeur ;
   - « Réanalyser » sur le chapitre d'Alice de l'utilisateur ;
   - analyse des 7 compétences.
4. Corriger les contrastes du thème clair au vu des captures.

### P1 : Studio, phases 4 à 6 (cahier du 17/11)
- **Phase 4, organisation narrative** :
  - **carte des relations interactive** (`react-native-svg`, déjà installé ; disposition par forces) : liste simple en Gratuit, carte en Plume+, carte avancée en Plume++ ;
  - chronologie assistée (confirmé, hypothèse, idée), réorganisation par glisser.
- **Phase 5, Muse et cohérence** :
  - Muse **rapide** (Haiku, `muse_quick`) et **approfondie** (Sonnet, `muse_deep`), à partir des fiches, du chapitre et du résumé de la mémoire ;
  - **uniquement des pistes et des questions**, jamais de prose ; ajouter un test anti-réécriture ;
  - vérification de cohérence (`coherence`) : contradictions avec les informations **validées** par l'auteur ;
  - quotas par `plan_limits`.
- **Phase 6, monétisation et optimisation** :
  - **remplacer les crédits du coach par des quotas par fonction** dans `plan_limits` ;
  - droits par formule (carte des relations, cohérence, analyse approfondie) ;
  - mise en cache des consignes (cache Anthropic) ;
  - plafond de dépense par utilisateur, tableau de suivi des coûts ;
  - étudier l'API Batch.
- **Fusion manuelle des doublons** de personnages (surnoms, fiches, relations).

### P2 : produit et qualité
- Tester « suivre un auteur » en production (problème `follows.following_id`), et corriger par une migration additive si besoin.
- Parcours Stripe complet en test, puis passage en mode réel quand l'utilisateur le décide.
- Nettoyer les imports inutilisés, mettre à jour `docs/` (ARCHITECTURE, AI_COACH, DATABASE, ROADMAP, TEST_PLAN sont datés du 15 au 17/11).

### Reportés (payants ou plus tard, sur décision de l'utilisateur)
- Render payant, nom de domaine et Resend (puis `REQUIRE_EMAIL_VERIFICATION=true`), stockage d'images externe.
- Notifications push (Firebase et `expo-notifications`).
- AAB et Play Store (question de la facturation Google), certificat de production, relecture juridique.

---

## 9. Consignes pour la prochaine IA

### 9.1 Conventions (voir aussi `AGENTS.md` et `apps/mobile/AGENTS.md`)
- **Langue** : répondre **en français**, de façon directe. Dire ce qui a été fait, ce qui a été vérifié, et ce qui ne l'a pas été.
- **TypeScript** strict. Tout texte visible est en français.
- **Constantes** (quotas, prix, limites) dans `packages/shared` ou `services/plans.ts`, jamais copiées dans l'interface.
- **API** :
  - procédure tRPC mince, logique dans `services/` ;
  - ressource privée inaccessible → `NOT_FOUND`, jamais `FORBIDDEN` (sauf le contrôle de profil du Studio) ;
  - erreurs `TRPCError` avec un message en français.
- **Mobile** :
  - composants de `src/components` ; couleurs **toujours via `theme.*`** (ou `withAlpha(theme.x, a)`), **jamais de couleur sombre en dur** depuis la 0.6.0 ;
  - texte sur fond doré : `theme.textOnGold` ;
  - modules natifs (photo, navigateur) chargés **à la demande** par `require` dans la fonction qui s'en sert.
- **Expo** : avant toute API Expo, lire la documentation **v58** (`https://docs.expo.dev/versions/v58.0.0/…`).
- **Base de données** :
  - modifier `schema.ts`, puis `db:generate`, puis **rendre la migration tolérante** (`IF NOT EXISTS`, contraintes dans `DO $$ … EXCEPTION WHEN duplicate_object`) ;
  - ne jamais modifier une migration déjà appliquée en production.

### 9.2 À ne pas modifier sans accord explicite
- La règle « l'IA n'écrit jamais à la place de l'auteur », et la vérification des citations (`citationExists`, `nameInText`).
- La priorité de l'auteur dans le Studio : `sources` à `author`, propositions au lieu d'écraser.
- Les prix (4,99 € et 9,99 €), les crédits (3, 15, 30), les quotas `STUDIO_AI_DEFAULT_LIMITS`, et le choix Haiku / Sonnet.
- L'adresse de l'API dans `eas.json` et le **package Android** `app.plume.reader`, ainsi que la clé de signature EAS : en changer casserait les mises à jour.
- `migrate.ts` et `reconcile.ts`, nécessaires à la base de production héritée.
- `Dockerfile` (`NODE_ENV=production` après `npm ci --include=dev`).

### 9.3 Précautions
- **Ne jamais** afficher, journaliser ou demander une clé ou un mot de passe. L'utilisateur saisit les secrets lui-même dans Render.
- **Ne rien déployer, ne rien supprimer en base, ne rien payer** sans accord explicite. Un `git push` peut déclencher Render : prévenir l'utilisateur.
- **Appels réels à Claude** : seulement avec l'accord de l'utilisateur (coût faible mais réel), avec des comptes jetables supprimés ensuite.
- **Ne pas lancer** `pkill -f "<motif>"` avec un motif présent dans la commande en cours : cela tue le shell lui-même.
- **Contexte d'exécution** : pas d'appareil Android ni de Java/SDK, et le navigateur intégré n'est pas disponible ici. Ne jamais prétendre qu'un écran a été « validé visuellement ».

### 9.4 Documents du dépôt
- **`REPRISE_PLUME.md`** (ce fichier) : **source de référence**.
- `AGENTS.md` : règles du projet, à respecter.
- `docs/DEPLOY_API.md` : à jour pour les variables Render.
- `docs/ARCHITECTURE.md`, `AI_COACH.md`, `DATABASE.md`, `ROADMAP.md`, `TEST_PLAN.md`, `EAS_BUILD.md` : **partiellement obsolètes**. Par exemple, ils mentionnent encore le mode `mock` par défaut, la « phase 1 » ou les anciennes URL.
- `TRANSFERT_OPENCODE_PLUME.md` : **obsolète** (17/11).
- `inspect-db.mts` : script d'inspection locale. Il lit `DATABASE_URL` dans l'environnement et ne contient aucun secret.

### 9.5 Méthode de reprise
1. Lire ce fichier, puis `AGENTS.md`. Faire `git log --oneline | head -20` et `git status`.
2. Lancer les vérifications du §7.2. Attendu : shared 10/10, API 84/84, typecheck OK, expo-doctor 20/20.
3. Faire l'état de la production : `curl https://plume-api-qk9s.onrender.com/health`, et le statut du build 0.6.0.
4. Demander à l'utilisateur ce qu'il a vu sur la 0.6.0 (captures) et s'il a lancé le Manual Deploy. Traiter ensuite le §8 dans l'ordre.
5. Pour chaque lot :
   - code et tests ;
   - typecheck ;
   - `expo export` ;
   - commit en français (« Domaine : ce qui change ») ;
   - incrément de version si l'appli change ;
   - build EAS ;
   - vérification de l'APK ;
   - demande de Manual Deploy si l'API change ;
   - vérification en production par `curl` ou par un script jetable ;
   - compte rendu à l'utilisateur.

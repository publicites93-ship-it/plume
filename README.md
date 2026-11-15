# Plume

**Plume** est un atelier d'écriture et une bibliothèque de lecture pour Android, en français. Son parti pris est simple : l'IA peut enseigner, questionner et critiquer — jamais écrire à la place de l'auteur.

Le projet est une **phase 1 fonctionnelle** : authentification, manuscrits privés, chapitres, éditeur avec sauvegarde automatique, lecture publique, bible narrative, coach pédagogique simulé, ateliers d'écriture, réglages et export. Le backend, la base de données, les tests et la documentation sont inclus.

> **Transparence.** Le coach utilise actuellement un moteur pédagogique **simulé et déterministe** (`AI_PROVIDER=mock`). Aucun appel à une IA générative payante n'est effectué. L'application n'a pas encore été compilée ni testée sur un appareil Android physique dans cet environnement. Voir [Limites connues](#limites-connues).

---

## Sommaire

- [Philosophie](#philosophie)
- [Ce qui fonctionne](#ce-qui-fonctionne)
- [Stack](#stack)
- [Structure du dépôt](#structure-du-dépôt)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Configuration](#configuration)
- [Commandes](#commandes)
- [Tests et vérifications](#tests-et-vérifications)
- [Limites connues](#limites-connues)
- [Confidentialité et sécurité](#confidentialité-et-sécurité)
- [Documentation](#documentation)

---

## Philosophie

Plume repose sur quatre engagements :

1. **L'auteur possède ses textes.** Les manuscrits privés ne sont jamais publiés par défaut. La visibilité d'une histoire et la publication d'un chapitre sont deux décisions distinctes.
2. **Le coach n'est pas un ghostwriter.** Il décrit des effets, pose des questions, propose des exercices. Il refuse les demandes de réécriture.
3. **Aucune citation inventée.** Chaque extrait affiché comme citation est vérifié mot pour mot dans le chapitre enregistré. Une citation introuvable est retirée.
4. **Aucun fait inventé sur le manuscrit.** Le coach ne prétend pas connaître des personnages, des lieux ou des événements absents du texte et de la bible narrative.

Le ton est littéraire mais l'interface reste lisible : nuit, parchemin, or ancien, typographie de livre. L'or sert d'accent, jamais de fond de texte.

---

## Ce qui fonctionne

### Application mobile

- Cinq onglets : **Accueil**, **Découvrir**, **Écrire**, **Apprendre**, **Profil**.
- Inscription, connexion, déconnexion, rafraîchissement de session, changement de mot de passe, suppression de compte.
- Onboarding : objectif, expérience, genres, compétences à travailler, préférences de notifications.
- Création et gestion de manuscrits : fiche, statut, visibilité, chapitres, ordre, duplication, archivage, publication.
- Éditeur de chapitre :
  - sauvegarde automatique après 1,8 s d'inactivité ;
  - brouillon local et file d'attente hors ligne ;
  - gestion explicite des conflits de version ;
  - annuler/rétablir ;
  - gras et italique via marqueurs Markdown légers (`**`, `_`) ;
  - compteur de mots et temps de lecture ;
  - mode concentration ;
  - historique de versions ;
  - export TXT et Markdown ;
  - publication et dépublication.
- Lecteur : progression, signets, thème nuit/sépia/ivoire, taille de texte, reprise de lecture.
- Catalogue public : recherche, genres, statut, pages d'histoire et d'auteur, abonnements.
- Bibliothèque personnelle, favoris, listes de lecture.
- Bible narrative : personnages, lieux, intrigues, chronologie, idées, plan.
- Coach : diagnostic par chapitre ou extrait exact, constats, citations vérifiées, exercices, conversation de méthode.
- Ateliers : sept compétences, théorie, exemples, pièges fréquents, exercices avec essai privé.
- Réglages : taille de texte, thèmes de lecture/écriture, réduction des animations, notifications, export JSON, suppression de compte.

### Backend

- API Fastify 5 + tRPC 11.
- Authentification JWT courte durée + refresh tokens rotatifs hachés.
- Mots de passe hachés avec `scrypt`.
- Schéma Drizzle complet (38 tables) et migration SQL générée.
- PGlite embarqué pour le développement et les tests ; PostgreSQL possible via `DATABASE_URL`.
- Quotas serveur : histoires actives, chapitres par semaine, jetons IA mensuels.
- Vérification anti-hallucination des citations.
- Seed de démonstration : 4 histoires originales, 7 ateliers, 21 exercices, 12 consignes, comptes de test.
- 42 tests API et 10 tests partagés.

---

## Stack

| Couche | Technologies |
| --- | --- |
| Mobile | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript |
| État et données | TanStack Query, tRPC React Query, Zustand, AsyncStorage, SecureStore |
| Design | React Native StyleSheet, tokens partagés, SVG, Google Fonts |
| API | Node.js 22+, Fastify 5, tRPC 11, Zod 4, jose, scrypt |
| Base | Drizzle ORM 0.45, PGlite (dev/tests), PostgreSQL (option) |
| Tests | Vitest |
| Outils | npm workspaces, tsx, tsup, Sharp (assets) |

---

## Structure du dépôt

```text
.
├── apps/
│   ├── api/                 API Fastify + tRPC, base, migrations, seed, tests
│   └── mobile/              Application Expo / React Native
├── packages/
│   └── shared/              Tokens, schémas Zod, contenu, utilitaires texte
├── docs/                    Spécification, architecture, design, base, IA, tests
├── scripts/                 Génération d'assets
├── .env.example
├── AGENTS.md
└── README.md
```

---

## Démarrage rapide

### Prérequis

- **Node.js 22 ou supérieur**
- npm 10 ou supérieur
- Pour Android : l'application **Expo Go** pour le développement, ou un **APK preview EAS** pour tester sans Expo Go ni serveur Metro.
- Aucun Docker, PostgreSQL, Java ou Android SDK n'est nécessaire pour le développement local. Un build APK natif passe par EAS Build (cloud).

### Installation

```bash
npm install
```

### Base de démonstration

La base PGlite est créée dans `apps/api/data/pglite`. Arrêtez l'API avant de lancer le seed si elle tourne déjà.

```bash
npm run db:migrate --workspace @plume/api
npm run db:seed --workspace @plume/api
```

### Lancer l'API

```bash
npm run dev:api
```

L'API écoute par défaut sur `http://localhost:4000/trpc`. Si votre environnement définit déjà `PORT`, forcez le port :

```bash
PORT=4000 npm run dev:api
```

### Lancer l'application

```bash
npm run dev:mobile
```

Puis scannez le QR code avec Expo Go, ou appuyez sur `w` pour ouvrir la version web.

Pour un **téléphone Android physique**, l'application doit joindre l'API via l'adresse LAN de la machine, pas `localhost` :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/trpc npm run dev:mobile
```

Pour l'**émulateur Android**, l'adresse par défaut `http://10.0.2.2:4000/trpc` est utilisée automatiquement.

### Build Android preview (APK)

Le profil `preview` de `apps/mobile/eas.json` produit un **APK installable**, distribué en interne par Expo. Il ne s'agit pas d'un development build : l'APK embarque le bundle JavaScript et ne nécessite ni Expo Go ni serveur Metro.

Un build EAS exige une **URL HTTPS publique** pour l'API. Une adresse `localhost`, `10.0.2.2` ou une IP LAN ne peut pas être jointe depuis un téléphone. `apps/mobile/app.config.ts` refuse volontairement un build EAS si `EXPO_PUBLIC_API_URL` est absente, locale ou non HTTPS.

```bash
# Se connecter à Expo (une seule fois)
cd apps/mobile
npx eas-cli@latest login

# Définir l'URL publique de l'API pour le profil preview
# (ou la placer dans le bloc build.preview.env de eas.json)
EXPO_PUBLIC_API_URL=https://api.votre-domaine.fr/trpc \
  npx eas-cli@latest build --platform android --profile preview

# Ou depuis la racine, après avoir configuré l'URL dans eas.json
npm run build:android:preview
```

À la fin du build, Expo affiche une page de build. Sur le téléphone, ouvrez cette page, téléchargez l'APK puis autorisez l'installation depuis cette source. Le profil `production` produit un AAB pour le Play Store, pas un APK.

Détails, limites et procédure de test : [docs/EAS_BUILD.md](docs/EAS_BUILD.md).

### Vérifier l'API

```bash
curl http://localhost:4000/health
```

---

## Comptes de démonstration

Créés par le seed, réservés au développement local :

| Compte | Mot de passe | Usage |
| --- | --- | --- |
| `lecteur@plume.app` | `Plume2026` | Lecture, bibliothèque, listes |
| `auteur@plume.app` | `Plume2026` | Manuscrit privé « La Chambre des échos », bible, analyses |

Le manuscrit privé de démonstration contient trois chapitres, des personnages, des lieux, des intrigues, des événements, des idées et un diagnostic simulé.

---

## Configuration

Copiez `.env.example` vers `.env` à la racine si vous voulez personnaliser la configuration.

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `4000` | Port de l'API |
| `HOST` | `0.0.0.0` | Interface d'écoute |
| `CORS_ORIGINS` | `http://localhost:8081,http://localhost:19006` | Origines autorisées |
| `DATABASE_URL` | vide | PostgreSQL réel ; sinon PGlite |
| `JWT_SECRET` | secret de dev | **À remplacer en production** |
| `ACCESS_TOKEN_TTL` | `900` | Durée du jeton d'accès (secondes) |
| `REFRESH_TOKEN_TTL` | `2592000` | Durée du refresh token (secondes) |
| `AI_PROVIDER` | `mock` | `mock` ou `gemini` |
| `GEMINI_API_KEY` | vide | Clé Gemini, jamais commitée |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modèle Gemini |
| `EXPO_PUBLIC_API_URL` | selon plateforme | URL de l'API vue par le mobile |

**Ne committez jamais de clé API ni de secret réel.** Le fichier `.env` est ignoré par Git.

---

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev:api` | API en mode watch |
| `npm run dev:mobile` | Serveur Expo |
| `npm run build:android:preview` | Build EAS d'un APK Android preview |
| `npm run build:android:production` | Build EAS d'un AAB Android production |
| `npm run db:generate --workspace @plume/api` | Génère une migration Drizzle |
| `npm run db:migrate --workspace @plume/api` | Applique les migrations |
| `npm run db:seed --workspace @plume/api` | Insère les données de démonstration |
| `npm test` | Tests partagés + API |
| `npm run typecheck` | Typecheck des trois workspaces |
| `npm run icons` | Régénère les assets PNG |

---

## Tests et vérifications

```bash
# Tests
npm test

# Typecheck (mémoire augmentée pour l'API)
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck

# Tests ciblés
npm run test --workspace @plume/shared
NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api

# Typecheck mobile seul
npm run typecheck --workspace @plume/mobile
```

État vérifié dans cet environnement :

- `@plume/shared` : **10/10 tests passent**.
- `@plume/api` : **42/42 tests passent**.
- Typecheck API : passe.
- Typecheck mobile : passe.
- Bundle web Expo : se compile ; les routes principales répondent en HTTP 200.
- Parcours API de bout en bout : connexion, lecture, analyse, conversation, CRUD de la bible, atelier — testé par script.

Voir [docs/TEST_PLAN.md](docs/TEST_PLAN.md) pour la matrice manuelle et les éléments non testés.

---

## Limites connues

Ces limites sont volontaires et documentées, pas cachées :

- **Aucun APK/AAB n'est compilé localement.** Il n'y a ni Java, ni Android SDK, ni Xcode. Le build Android passe par EAS Build (cloud), avec le profil `preview` pour un APK.
- **L'APK preview dépend d'une API publique.** Sans backend HTTPS accessible depuis le téléphone, l'authentification, les manuscrits, la lecture et le coach ne fonctionnent pas. Un tunnel temporaire dépanne pour un test, mais ne remplace pas un déploiement durable.
- **Le coach est simulé.** Le moteur `mock` est déterministe : il ne comprend pas réellement le sens du texte. Il sert à valider le parcours, les citations et l'interface. Le connecteur Gemini existe mais n'est pas activé.
- **Pas d'envoi d'e-mail.** La vérification d'adresse et la réinitialisation de mot de passe renvoient `NOT_IMPLEMENTED`. Aucun fournisseur SMTP n'est configuré.
- **Pas de paiement.** Les plans et quotas sont appliqués côté serveur, mais aucun prestataire de paiement n'est branché.
- **Pas de notifications push.** Les préférences sont stockées ; l'envoi n'est pas implémenté.
- **Communauté non exposée.** Les tables commentaires, réactions, signalements et modération existent, mais aucun écran ni endpoint de phase 1 ne les utilise.
- **Mémoire narrative non branchée.** Les tables existent ; le coach de phase 1 ne construit pas encore de mémoire longue durée.
- **Mise en forme limitée.** L'éditeur enregistre des marqueurs Markdown légers, pas un format riche WYSIWYG.
- **Synchronisation hors ligne simple.** Les brouillons et la file d'attente sont locaux à l'appareil ; il n'y a pas de synchronisation en arrière-plan.
- **Version web non validée visuellement.** Le bundle et les routes fonctionnent, mais l'expérience cible est Android.

---

## Confidentialité et sécurité

- Les manuscrits privés ne sont accessibles qu'à leur auteur, sauf chapitre explicitement publié dans une histoire publique.
- Les refresh tokens sont hachés en base et rotatifs.
- Les mots de passe ne sont jamais stockés en clair.
- L'export JSON permet de récupérer profil, histoires, chapitres, bible et analyses.
- La suppression de compte est réelle et en cascade.
- Les journaux d'audit et les quotas sont côté serveur.
- Aucun secret ne doit être commité. `.env` est ignoré.

En production, il faudra au minimum : HTTPS, `JWT_SECRET` fort, PostgreSQL managé, sauvegardes, limitation de débit distribuée, surveillance des erreurs, politique de conservation et fournisseur d'e-mail.

---

## Documentation

- [Spécification produit](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Base de données](docs/DATABASE.md)
- [Coach et IA](docs/AI_COACH.md)
- [Feuille de route](docs/ROADMAP.md)
- [Décisions techniques](docs/DECISIONS.md)
- [Plan de test](docs/TEST_PLAN.md)
- [Guide agent](AGENTS.md)

---

## Licence

Projet de démonstration. Les textes de démonstration sont originaux et générés pour Plume. Vérifiez la licence avant toute diffusion publique.

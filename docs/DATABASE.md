# Base de données — Plume

**Schéma :** `apps/api/src/db/schema.ts`
**Migration :** `apps/api/migrations/0000_loving_ghost_rider.sql`
**ORM :** Drizzle 0.45
**Moteurs :** PGlite (développement, tests) ou PostgreSQL (production)

---

## 1. Principe

Le schéma couvre la phase 1 **et** prépare les fonctionnalités suivantes (communauté, mémoire narrative, paiements). Toutes les tables ne sont donc pas encore exposées par l'interface.

Règles :

- Clés primaires UUID générées par la base.
- Horodatages `timestamptz` avec `created_at` et `updated_at`.
- Suppression logique (`deleted_at`) pour les contenus récupérables.
- Suppression en cascade pour les données rattachées à un compte supprimé.
- Index sur les colonnes de jointure et de tri fréquentes.
- Aucune donnée binaire : les couvertures sont des motifs, pas des fichiers.

---

## 2. Domaines et tables (38)

### 2.1 Identité

| Table | Rôle | Points clés |
| --- | --- | --- |
| `users` | Compte | `email` unique, `password_hash`, `role`, `plan`, `deleted_at` |
| `profiles` | Profil public | `pseudonym` unique, bio, motif d'avatar, objectif, genres, compétences |
| `user_preferences` | Préférences | thèmes, `font_scale`, `reduce_motion`, notifications JSON |
| `refresh_tokens` | Sessions | `token_hash` unique (SHA-256), expiration, révocation |

Un utilisateur possède exactement un profil et une ligne de préférences, créés à l'inscription.

### 2.2 Manuscrits

| Table | Rôle | Points clés |
| --- | --- | --- |
| `stories` | Histoire | auteur, titre, synopsis, genre, visibilité, statut, `version`, `deleted_at` |
| `chapters` | Chapitre | contenu, `word_count`, `order_index`, `version`, `last_mutation_id`, `last_snapshot_at` |
| `chapter_versions` | Historique | numéro de version, contenu, hash, raison, auteur du snapshot |
| `publications` | Publication | chapitre, version publiée, date de publication/dépublication |

Contraintes :

- `chapter_versions` est unique sur `(chapter_id, version_number)`.
- `chapters.version` et `last_mutation_id` implémentent l'optimistic concurrency et l'idempotence.
- `stories.visibility` : `private`, `unlisted`, `public`.
- `stories.status` : `draft`, `ongoing`, `completed`, `paused`.
- `chapters.status` : `draft`, `published`, `archived`.

### 2.3 Bible narrative

| Table | Rôle |
| --- | --- |
| `characters` | Personnages : nom, rôle, description, motivation, peur, arc, voix |
| `locations` | Lieux : nom, description, atmosphère, importance |
| `plot_threads` | Intrigues : nom, description, enjeux, statut, résolution |
| `timeline_events` | Chronologie : titre, date fictive, ordre, conséquences, chapitre lié |
| `story_ideas` | Idées : contenu, type, conversion éventuelle |
| `story_plans` | Plan : titre, structure JSON |

Toutes ces tables sont rattachées à `stories` avec `ON DELETE CASCADE`. L'accès est vérifié via la propriété de l'histoire.

### 2.4 Lecture

| Table | Rôle |
| --- | --- |
| `reading_progress` | Dernier chapitre lu, position, pourcentage |
| `bookmarks` | Signets avec note et position |
| `reading_lists` | Listes personnelles |
| `reading_list_items` | Association liste / histoire |

`reading_progress` est unique par `(user_id, story_id)`. `bookmarks` et `reading_list_items` sont uniques par paire utilisateur / cible.

### 2.5 Social (préparé, non exposé)

| Table | Rôle |
| --- | --- |
| `follows` | Abonnements entre utilisateurs |
| `story_follows` | Abonnements à une histoire |
| `comments` | Commentaires (avec modération) |
| `reactions` | Réactions |
| `notifications` | Notifications in-app |
| `reports` | Signalements |
| `moderation_actions` | Actions de modération |

Aucun écran ni endpoint de phase 1 ne les utilise, hormis les abonnements (`follows`, `story_follows`) qui alimentent la bibliothèque et le profil auteur.

### 2.6 Abonnements

| Table | Rôle |
| --- | --- |
| `subscriptions` | Abonnement à un plan, statut, période |
| `entitlements` | Droits calculés ou achetés |

**Aucun paiement n'est branché.** Le plan effectif est lu sur `users.plan` et `users.plan_expires_at`.

### 2.7 IA

| Table | Rôle |
| --- | --- |
| `ai_usage_records` | Consommation par tâche, fournisseur, modèle, jetons |
| `ai_analyses` | Diagnostic : compétence, statut, score, confiance, simulation, extrait |
| `analysis_findings` | Constats : type, citation, explication, impact, priorité, exercice |
| `skill_assessments` | Évaluation d'une compétence à un instant donné |

`ai_analyses.status` : `queued`, `running`, `completed`, `failed`.
`analysis_findings.kind` : `strength`, `improvement`, `question`, `risk`.
`analysis_findings.quote` est vérifié avant insertion.

### 2.8 Apprentissage

| Table | Rôle |
| --- | --- |
| `exercise_attempts` | Essai privé sur un exercice, statut |
| `coaching_sessions` | Conversation rattachée à une histoire |
| `coaching_messages` | Messages utilisateur / assistant, citations JSON |

Un essai est unique par `(user_id, exercise_id)` : la sauvegarde met à jour l'essai existant.

### 2.9 Mémoire et exploitation

| Table | Rôle |
| --- | --- |
| `narrative_memory_entries` | Mémoire longue : fait, statut, source |
| `memory_evidence` | Preuve d'une entrée de mémoire |
| `background_jobs` | File de tâches internes |
| `audit_events` | Journal d'actions sensibles |

`narrative_memory_entries.status` : `proposed`, `confirmed`, `rejected`. La mémoire n'est pas branchée au coach en phase 1.

---

## 3. Enums PostgreSQL

```text
plan                 free | plus | premium
user_role            user | admin
story_status         draft | ongoing | completed | paused
story_visibility     private | unlisted | public
chapter_status       draft | published | archived
version_reason       autosave | manual | publish | restore | ai_snapshot
analysis_status      queued | running | completed | failed
memory_status        proposed | confirmed | rejected
report_status        open | reviewing | resolved | dismissed
plot_status          planned | active | resolved | abandoned
idea_kind            scene | dialogue | character | revelation | research | note
```

Les enums sont créés par la migration. Toute évolution nécessite une nouvelle migration.

---

## 4. Relations principales

```text
users 1─1 profiles
users 1─1 user_preferences
users 1─n refresh_tokens
users 1─n stories
users 1─n reading_progress / bookmarks / reading_lists
users 1─n ai_analyses / coaching_sessions / exercise_attempts

stories 1─n chapters
stories 1─n characters / locations / plot_threads / timeline_events / story_ideas
stories 1─n story_plans
stories 1─n publications

chapters 1─n chapter_versions
chapters 1─n publications
chapters 1─n ai_analyses
chapters 1─n timeline_events (optionnel)

ai_analyses 1─n analysis_findings
coaching_sessions 1─n coaching_messages
```

---

## 5. Index

Index notables :

- `users_email_unique` sur `users.email`.
- `profiles_pseudonym_unique` sur `profiles.pseudonym`.
- `refresh_tokens_hash_unique`, `refresh_tokens_user_idx`.
- `stories_author_idx` sur `(author_id, updated_at)`.
- `stories_visibility_idx` sur `(visibility, status)`.
- `stories_genre_idx` sur `genre`.
- `chapters_story_order_idx` sur `(story_id, order_index)`.
- `chapter_versions_unique` sur `(chapter_id, version_number)`.
- `analysis_findings_analysis_idx` sur `(analysis_id, order_index)`.
- `coaching_messages_session_idx` sur `(session_id, created_at)`.

---

## 6. Migrations

```bash
# Après modification du schéma
npm run db:generate --workspace @plume/api

# Application
npm run db:migrate --workspace @plume/api
```

Règles :

- Ne jamais modifier une migration appliquée.
- Vérifier le SQL généré avant de l'appliquer.
- Les migrations sont exécutées automatiquement au démarrage de l'API avec PGlite.
- Avec PostgreSQL, les migrations doivent être appliquées explicitement avant le déploiement.

---

## 7. Seed

```bash
npm run db:seed --workspace @plume/api
```

Le seed est idempotent : il vérifie la présence des comptes de démonstration avant d'insérer. Il crée :

- `lecteur@plume.app` et `auteur@plume.app` (mot de passe `Plume2026`) ;
- 4 histoires publiques, 2 chapitres chacune ;
- 1 manuscrit privé, 3 chapitres ;
- la bible narrative du manuscrit privé ;
- 1 diagnostic simulé ;
- les données pédagogiques (ateliers, exercices, consignes) sont servies depuis `packages/shared`, pas stockées en base.

**Arrêter l'API avant un seed manuel** : PGlite ne supporte pas deux écrivains concurrents sur le même répertoire.

---

## 8. Sauvegarde et restauration

### Développement

Le répertoire `apps/api/data/pglite` contient la base. Pour repartir de zéro :

```bash
# API arrêtée
rm -rf apps/api/data/pglite
npm run db:migrate --workspace @plume/api
npm run db:seed --workspace @plume/api
```

### Production

- PostgreSQL managé avec sauvegardes automatiques quotidiennes.
- Rétention à définir selon la politique de confidentialité.
- Test de restauration obligatoire avant lancement.
- Les manuscrits privés doivent être couverts par la même politique que les données personnelles.

---

## 9. Suppression et conservation

| Donnée | Suppression |
| --- | --- |
| Histoire | logique (`deleted_at`), récupérable |
| Chapitre | logique, récupérable |
| Version | conservée avec le chapitre |
| Compte | réelle, en cascade sur toutes les données rattachées |
| Analyse | conservée tant que le compte existe |
| Essai d'exercice | conservé, écrasé par le prochain essai |

L'export JSON (`auth.exportData`) renvoie profil, histoires, chapitres, bible, analyses et constats, sans secret ni hash de mot de passe.

---

## 10. Limites connues

- Aucune migration n'a été testée sur un PostgreSQL réel dans cet environnement ; seules PGlite et la génération SQL ont été vérifiées.
- Les tables sociales, de paiement et de mémoire existent mais ne sont pas exploitées.
- Aucun partitionnement ni archivage froid n'est en place.
- Les recherches plein texte utilisent `ILIKE`, pas un index `tsvector`.
- La base de développement contient des comptes de démonstration : ne jamais la déployer telle quelle.

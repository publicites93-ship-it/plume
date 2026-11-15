# Architecture — Plume

**Dernière mise à jour :** 15 novembre 2026
**Portée :** phase 1 fonctionnelle

---

## 1. Vue d'ensemble

Plume est un monorepo TypeScript à trois paquets :

```text
┌──────────────────────────────┐
│  apps/mobile                 │
│  Expo / React Native         │
│  Expo Router, TanStack Query │
│  Zustand, SecureStore        │
└──────────────┬───────────────┘
               │ tRPC over HTTP (superjson)
               ▼
┌──────────────────────────────┐
│  apps/api                    │
│  Fastify 5 + tRPC 11         │
│  Services métier, auth, IA   │
│  Drizzle ORM                 │
└──────────────┬───────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
  PGlite (dev)     PostgreSQL (prod)
      │
      └── apps/api/data/pglite

┌──────────────────────────────┐
│  packages/shared             │
│  Tokens, Zod, contenu, texte │
└──────────────────────────────┘
```

`packages/shared` est importé par les deux applications. Il ne contient aucune dépendance native et aucun secret.

---

## 2. Flux d'une requête

1. L'écran mobile appelle un hook tRPC (`trpc.stories.list.useQuery()`).
2. Le client tRPC joint l'access token depuis la mémoire sécurisée.
3. Fastify reçoit la requête sur `/trpc`.
4. `createContext` vérifie le JWT et charge `{ db, userId, role }`.
5. La procédure valide l'entrée avec Zod, appelle un service, renvoie un résultat sérialisé par superjson.
6. En cas de 401, le client tente un refresh token, puis rejoue la requête une fois.
7. TanStack Query met en cache et invalide les clés concernées.

### Pourquoi tRPC

- Types partagés de bout en bout sans génération de client.
- Validation Zod unique.
- Moins de code de plomberie qu'une API REST + SDK.
- Adapté à un client unique (l'application Plume).

**Contrepartie :** couplage fort entre client et serveur. Une API publique ou des clients tiers exigeraient une couche REST/OpenAPI séparée.

---

## 3. Couches de l'API

```text
apps/api/src/
├── app.ts                 Construction Fastify, CORS, rate limit, tRPC
├── server.ts              Démarrage
├── config.ts              Validation d'environnement (Zod)
├── auth/                  Mots de passe, JWT, refresh tokens
├── db/
│   ├── client.ts          PGlite ou PostgreSQL
│   ├── schema.ts          Schéma Drizzle (38 tables)
│   ├── migrate.ts         Application des migrations
│   └── seed.ts            Données de démonstration
├── services/
│   ├── stories.ts         Histoires, chapitres, versions, publication, lecture
│   ├── narrative.ts       Bible narrative
│   ├── plans.ts           Plans, quotas, consommation IA
│   └── ai/                Abstraction fournisseur, mock, Gemini, analyse
└── trpc/
    ├── trpc.ts            Contexte, procédures, gestion d'erreurs
    ├── router.ts          Routeur racine
    └── routers/           auth, stories, narrative, reading, ai, learning
```

### Règle de dépendance

```text
router → service → db/schema
```

Les routeurs ne contiennent pas de requête SQL complexe. Les services ne connaissent pas HTTP. Le schéma ne connaît ni l'un ni l'autre.

---

## 4. Authentification

### Inscription

1. Validation Zod (e-mail, mot de passe, pseudonyme).
2. Vérification d'unicité de l'e-mail et du pseudonyme (insensible à la casse).
3. Hachage `scrypt` (sel aléatoire de 16 octets, clé de 64 octets).
4. Transaction : `users`, `profiles`, `user_preferences`.
5. Émission d'un access token et d'un refresh token.

### Access token

- JWT HS256, `iss=plume-api`, `aud=plume-mobile`, `type=access`.
- Durée par défaut : 900 s.
- Contient `sub` (identifiant utilisateur) et `role`.

### Refresh token

- Chaîne opaque aléatoire de 48 octets (base64url).
- Stocké **haché en SHA-256**, jamais en clair.
- Rotatif : chaque refresh révoque l'ancien et en émet un nouveau.
- La réutilisation d'un token révoqué est détectée et traitée comme un vol de session.
- Durée par défaut : 30 jours.

### Mobile

- Access token et refresh token dans `expo-secure-store`.
- Les données non sensibles (préférences UI, brouillons) sont dans AsyncStorage.
- `useSessionGate` protège les routes de `app/(protected)/`.

### Limitation

La vérification d'e-mail et la réinitialisation de mot de passe ne sont pas implémentées : aucun fournisseur SMTP. Les procédures existent et renvoient `NOT_IMPLEMENTED` avec un message explicite.

---

## 5. Modèle de données

38 tables, regroupées en neuf domaines :

| Domaine | Tables |
| --- | --- |
| Identité | `users`, `profiles`, `user_preferences`, `refresh_tokens` |
| Manuscrits | `stories`, `chapters`, `chapter_versions`, `publications` |
| Bible | `characters`, `locations`, `plot_threads`, `timeline_events`, `story_ideas`, `story_plans` |
| Lecture | `reading_progress`, `bookmarks`, `reading_lists`, `reading_list_items` |
| Social | `follows`, `story_follows`, `comments`, `reactions`, `notifications`, `reports`, `moderation_actions` |
| Abonnements | `subscriptions`, `entitlements` |
| IA | `ai_usage_records`, `ai_analyses`, `analysis_findings`, `skill_assessments` |
| Apprentissage | `exercise_attempts`, `coaching_sessions`, `coaching_messages` |
| Mémoire et exploitation | `narrative_memory_entries`, `memory_evidence`, `background_jobs`, `audit_events` |

Détail dans `docs/DATABASE.md`.

### Suppressions

- Histoires et chapitres : suppression logique (`deleted_at`).
- Compte : suppression réelle, en cascade.
- Les versions de chapitre restent liées au chapitre supprimé logiquement.

---

## 6. Protocole de sauvegarde d'un chapitre

C'est le mécanisme le plus sensible du produit.

### Entrée

```ts
{
  chapterId: string;
  content: string;
  baseVersion: number;
  clientMutationId: string;   // UUID généré côté client
  localUpdatedAt: string;     // ISO
  title?: string;
  reason: "autosave" | "manual";
  forceSnapshot: boolean;
}
```

### Déroulement serveur

1. Vérifier que le chapitre existe, n'est pas supprimé et appartient à l'auteur.
2. Si `lastMutationId === clientMutationId` → retour idempotent, aucune écriture.
3. Si `chapter.version !== baseVersion` → erreur `CONFLICT` avec l'état serveur complet.
4. Calculer la nouvelle version et le nombre de mots.
5. Créer un snapshot si :
   - `forceSnapshot` est vrai ;
   - aucun snapshot n'existe ;
   - le dernier snapshot date de plus de **45 secondes**.
6. Mettre à jour avec un `WHERE version = baseVersion` pour éviter une course.
7. Si l'update ne renvoie aucune ligne, relire l'état courant et renvoyer `CONFLICT`.
8. Insérer le snapshot (`chapter_versions`) si nécessaire.
9. Mettre à jour `stories.updated_at`.

### Côté mobile

- Debounce de **1,8 s** après la dernière frappe.
- Écriture immédiate dans le brouillon local (AsyncStorage).
- File d'attente si le réseau est absent.
- Au retour du réseau, rejeu séquentiel.
- Sur conflit, l'UI propose :
  - **Garder ma version** → renvoie la version locale avec `forceSnapshot: true` sur la version serveur courante.
  - **Recharger le serveur** → remplace l'éditeur par le contenu serveur.

### Pourquoi ces choix

- Idempotence : un rejeu réseau ne crée pas de doublon.
- Version optimiste : détection fiable des écritures concurrentes.
- Snapshot espacé : limite la croissance de l'historique.
- Snapshot forcé : garantit un point de restauration lors d'un arbitrage manuel.

---

## 7. Hors ligne

```text
Frappe
  │
  ├─► état React (immédiat)
  ├─► brouillon AsyncStorage (immédiat)
  └─► debounce 1,8 s
          │
          ├─ réseau OK ──► saveChapter
          └─ réseau KO ──► file d'attente
                              │
                        retour réseau
                              │
                              └─► rejeu séquentiel
```

Limites :

- Pas de service worker ni de synchronisation en arrière-plan.
- Pas de résolution automatique des conflits.
- La file vit sur l'appareil ; changer d'appareil ne la transfère pas.

---

## 8. Couche IA

```text
services/ai/
├── provider.ts   Interface AIProvider + types de sortie
├── mock.ts       MockPedagogicalProvider (défaut, déterministe)
├── gemini.ts     GeminiProvider (non activé)
├── analysis.ts   Orchestration, vérification, persistance
└── index.ts      Sélection du fournisseur selon AI_PROVIDER
```

### Interface

```ts
interface AIProvider {
  readonly name: string;
  readonly model: string;
  analyzeChapter(input: AnalysisProviderInput): Promise<AnalysisDraft>;
}
```

### Sélection

- `AI_PROVIDER=mock` (défaut) → moteur local.
- `AI_PROVIDER=gemini` + `GEMINI_API_KEY` → fournisseur Gemini.
- Sans clé, le serveur refuse de démarrer en mode Gemini ou retombe explicitement sur une erreur claire.

### Garanties côté service

- Le texte envoyé au fournisseur est le chapitre **enregistré**, pas l'état non sauvegardé de l'éditeur.
- Un extrait ciblé doit être une sous-chaîne exacte du chapitre.
- Chaque citation retournée est vérifiée ; une citation absente est retirée.
- Le résultat est marqué `isSimulation` quand le fournisseur est `mock`.
- L'usage est enregistré dans `ai_usage_records` et imputé au quota.

Voir `docs/AI_COACH.md`.

---

## 9. Quotas

`services/plans.ts` :

- `effectivePlan` : plan actif ou `free`.
- `countActiveStories`, `countChaptersThisWeek`, `tokensUsedThisMonth`.
- `assertCanCreateStory`, `assertCanCreateChapter`, `assertAiQuota`.
- `recordAiUsage`.

Les quotas sont vérifiés **avant** l'action, côté serveur. L'UI peut les afficher, mais ne les applique jamais seule.

---

## 10. Publication et lecture

- Une histoire doit être `public` pour publier un chapitre.
- Un chapitre publié a une ligne `publications` avec `published_at`.
- La dépublication retire le chapitre du catalogue sans supprimer le contenu.
- Le catalogue ne liste que les histoires publiques avec au moins un chapitre publié.
- Un brouillon privé n'est jamais renvoyé à un autre compte, même avec l'identifiant exact.

---

## 11. Configuration et environnements

| Environnement | Base | IA | Secrets |
| --- | --- | --- | --- |
| Développement | PGlite dans `apps/api/data/pglite` | `mock` | secrets de dev |
| Test | PGlite en mémoire | `mock` | secrets de test |
| Production | PostgreSQL via `DATABASE_URL` | `mock` ou Gemini | variables d'environnement |

`config.ts` refuse de démarrer en production si :

- `JWT_SECRET` contient `change-me` ou fait moins de 32 caractères ;
- `DATABASE_URL` est absent.

---

## 12. Déploiement

Aucun déploiement n'a été effectué. Une cible raisonnable :

```text
Mobile   → EAS Build (AAB Android), puis Play Console
API      → conteneur Node 22 derrière HTTPS (Fly.io, Render, Railway, VPS)
Base     → PostgreSQL managé avec sauvegardes
Assets   → CDN ou stockage objet (non utilisé en phase 1)
Secrets  → coffre du fournisseur, jamais dans le dépôt
```

Prérequis avant mise en production :

- HTTPS et HSTS.
- `JWT_SECRET` fort et rotation documentée.
- Sauvegardes et test de restauration.
- Limitation de débit distribuée (Redis) si plusieurs instances.
- Journalisation et alerting.
- Fournisseur e-mail.
- Politique de conservation et procédure de suppression.
- Revue de sécurité des accès aux manuscrits.

---

## 13. Modes de défaillance connus

| Panne | Comportement actuel |
| --- | --- |
| API indisponible | L'éditeur conserve le brouillon local ; les autres écrans affichent une erreur |
| Refresh token expiré | Déconnexion et retour à l'écran de connexion |
| Conflit de version | Résolution manuelle obligatoire |
| Quota IA épuisé | Erreur explicite, pas de dépassement |
| Fournisseur IA indisponible | Erreur de diagnostic ; le texte reste intact |
| Base PGlite verrouillée | Le second processus échoue ; arrêter l'API avant le seed |
| Bundle web trop lourd | Augmenter `--max-old-space-size` |

---

## 14. Décisions structurantes

Les choix et leurs alternatives sont détaillés dans `docs/DECISIONS.md`. Les plus importants :

- monorepo npm workspaces ;
- Fastify + tRPC plutôt que REST ;
- PGlite pour réduire les dépendances locales ;
- JWT court + refresh rotatif plutôt que sessions serveur ;
- `scrypt` plutôt qu'Argon2 (disponible sans dépendance native) ;
- moteur IA simulé par défaut ;
- éditeur Markdown léger plutôt que WYSIWYG ;
- routes protégées sous `(protected)`.

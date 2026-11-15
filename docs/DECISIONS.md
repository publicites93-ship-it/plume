# Décisions techniques — Plume

Journal des décisions structurantes (format ADR simplifié). Chaque entrée indique le contexte, la décision, les conséquences et les alternatives écartées.

---

## ADR-001 — Monorepo npm workspaces

**Contexte.** Une application mobile, une API et des types partagés doivent évoluer ensemble.

**Décision.** Un seul dépôt, trois paquets : `@plume/mobile`, `@plume/api`, `@plume/shared`. npm workspaces, pas de Turborepo ni de Nx.

**Conséquences.**
- Types et tokens partagés sans publication.
- Installation et scripts simples.
- Pas de cache de build distribué ; les vérifications restent séquentielles.
- Le couplage mobile/API est assumé.

**Alternatives.** Dépôts séparés (coût de synchronisation), Nx (complexité prématurée), pnpm (non retenu pour rester sur npm).

---

## ADR-002 — Fastify + tRPC plutôt que REST

**Contexte.** Un client unique, besoin de types de bout en bout, équipe réduite.

**Décision.** Fastify 5 pour le serveur, tRPC 11 pour le contrat, superjson pour la sérialisation.

**Conséquences.**
- Pas de génération de client ni de schéma OpenAPI.
- Validation Zod unique.
- Les erreurs et conflits sont typés.
- Une API publique ou un client tiers exigeraient une couche REST séparée.

**Alternatives.** REST + OpenAPI (plus universel, plus de plomberie), GraphQL (surcoût), Hono (viable mais Fastify est mature).

---

## ADR-003 — PGlite pour le développement et les tests

**Contexte.** L'environnement local ne dispose ni de Docker, ni de PostgreSQL, ni de droits d'installation.

**Décision.** PGlite (PostgreSQL compilé en WASM) par défaut, PostgreSQL réel via `DATABASE_URL`.

**Conséquences.**
- Démarrage immédiat, aucun service externe.
- Tests rapides et isolés.
- Un seul écrivain à la fois : arrêter l'API avant un seed.
- Les performances et certains comportements PostgreSQL ne sont pas représentatifs.
- La migration doit être validée sur un PostgreSQL réel avant production.

**Alternatives.** SQLite (moins proche de PostgreSQL), Docker (indisponible), PostgreSQL local (indisponible).

---

## ADR-004 — JWT court + refresh token rotatif

**Contexte.** Application mobile, sessions longues, besoin de révocation.

**Décision.** Access token JWT HS256 de 15 minutes ; refresh token opaque de 30 jours, haché en SHA-256, rotatif, avec détection de réutilisation.

**Conséquences.**
- Pas de session serveur à chaque requête.
- Révocation possible via la table `refresh_tokens`.
- Le vol d'un refresh token est détecté à la rotation suivante.
- Pas de révocation immédiate des access tokens avant expiration (15 minutes de fenêtre).

**Alternatives.** Sessions serveur (révocation immédiate, coût mémoire), JWT longs (moins sûr), cookies (moins adaptés au natif).

---

## ADR-005 — `scrypt` pour les mots de passe

**Contexte.** Besoin d'un hachage résistant, sans dépendance native.

**Décision.** `scrypt` de Node.js, sel aléatoire de 16 octets, clé de 64 octets, comparaison en temps constant.

**Conséquences.**
- Aucune compilation native.
- Paramètres à ajuster selon la charge.
- Argon2id serait préférable si une dépendance native est acceptable.

**Alternatives.** bcrypt (dépendance native), Argon2 (dépendance native), PBKDF2 (moins résistant au GPU).

---

## ADR-006 — IA simulée par défaut

**Contexte.** Aucun budget ni accord pour un fournisseur payant ; besoin de valider le parcours et les garde-fous.

**Décision.** `MockPedagogicalProvider` déterministe par défaut. `GeminiProvider` existe mais n'est jamais activé sans configuration explicite.

**Conséquences.**
- Aucun coût, aucun envoi de manuscrit à un tiers.
- Le parcours, les citations et l'interface sont testables.
- Le mock ne comprend pas le sens du texte.
- La simulation doit être signalée partout.

**Alternatives.** Activer Gemini immédiatement (coût, confidentialité), ne pas livrer le coach (perte de la promesse), utiliser un modèle local (hors périmètre).

---

## ADR-007 — Éditeur Markdown léger plutôt que WYSIWYG

**Contexte.** Un éditeur riche natif est complexe, fragile et difficile à tester sans appareil.

**Décision.** Zone de texte avec marqueurs `**gras**` et `_italique_`, rendu par `Prose` en lecture et en aperçu.

**Conséquences.**
- Comportement prévisible, export TXT/Markdown direct.
- Pas de barre d'outils riche, pas de styles imbriqués.
- Les marqueurs sont visibles pendant l'édition.
- Une migration vers un éditeur riche reste possible.

**Alternatives.** WebView avec éditeur riche (poids, clavier), bibliothèque native (dépendance, maintenance), aucun formatage (limite produit).

---

## ADR-008 — Sauvegarde optimiste avec snapshots espacés

**Contexte.** L'autosave fréquent ne doit ni perdre de texte ni créer un historique illisible.

**Décision.** Version optimiste (`baseVersion`), idempotence (`clientMutationId`), snapshot au plus toutes les 45 secondes ou sur demande explicite.

**Conséquences.**
- Détection fiable des conflits.
- Rejeu réseau sans doublon.
- Historique compact.
- Un conflit exige une décision humaine.

**Alternatives.** Écrasement dernier-écrit (perte silencieuse), verrou serveur (complexité, mauvaise expérience mobile), snapshot à chaque frappe (volume).

---

## ADR-009 — Brouillons locaux et file d'attente hors ligne

**Contexte.** L'écriture sur téléphone se fait souvent dans des zones sans réseau.

**Décision.** Chaque frappe met à jour AsyncStorage ; les sauvegardes échouées sont mises en file et rejouées au retour du réseau.

**Conséquences.**
- Aucune perte en cas de coupure.
- La file est locale à l'appareil.
- Pas de synchronisation en arrière-plan.
- Les conflits restent manuels.

**Alternatives.** Sauvegarde serveur uniquement (perte), base locale SQLite (poids), CRDT (complexité prématurée).

---

## ADR-010 — Expo Router et routes protégées

**Contexte.** Navigation par fichiers, cinq onglets, écrans authentifiés.

**Décision.** Expo Router avec un groupe `(tabs)` et un groupe `(protected)`. Les chemins publics restent lisibles (`/histoire/[id]`), la garde est portée par `useSessionGate`.

**Conséquences.**
- URLs propres sur le web.
- Garde centralisée.
- Le layout protégé doit rester monté pour éviter les flashs.
- Les liens profonds vers un écran protégé redirigent vers la connexion.

**Alternatives.** React Navigation classique (moins de conventions), garde écran par écran (duplication).

---

## ADR-011 — Barre d'onglets personnalisée

**Contexte.** L'identité visuelle ne supporte pas la barre native par défaut.

**Décision.** `PlumeTabBar` reçoit `{ state, descriptors, emitter, navigateToTab, insets }` et utilise `emitter.emit` / `navigateToTab`.

**Conséquences.**
- Contrôle total du rendu et des zones sûres.
- Dépend de l'API de `expo-router/tabs` (SDK 58).
- À revérifier à chaque montée de version d'Expo.

**Alternatives.** Barre native (moins fidèle), bibliothèque tierce (dépendance).

---

## ADR-012 — Couvertures procédurales, aucune image externe

**Contexte.** Pas de banque d'images, pas de droits, besoin d'assets cohérents.

**Décision.** Couvertures générées à partir de motifs et de la palette ; icône et splash générés en SVG puis PNG via Sharp.

**Conséquences.**
- Aucun problème de licence.
- Poids maîtrisé.
- Moins de variété visuelle.
- Les motifs doivent rester lisibles en petit.

**Alternatives.** Images libres de droits (cohérence, licence), illustrations commandées (coût).

---

## ADR-013 — Contenu pédagogique dans `packages/shared`

**Contexte.** Les ateliers, exercices et consignes changent rarement et doivent être disponibles hors ligne.

**Décision.** Contenu typé et versionné dans le code partagé, servi par l'API et importable par le mobile.

**Conséquences.**
- Pas de table éditoriale ni de CMS.
- Modification = déploiement.
- Les essais restent en base.

**Alternatives.** CMS (complexité), base de données (migrations inutiles pour du contenu statique).

---

## ADR-014 — Quotas côté serveur uniquement

**Contexte.** Les limites de plan ne doivent pas être contournables par le client.

**Décision.** `services/plans.ts` vérifie histoires actives, chapitres hebdomadaires et jetons mensuels avant chaque action.

**Conséquences.**
- Source de vérité unique.
- L'UI peut afficher mais pas décider.
- Les tests couvrent le dépassement.

**Alternatives.** Vérification client (contournable), facturation à l'usage sans limite (risque).

---

## ADR-015 — Documentation en français, transparence explicite

**Contexte.** Le produit est francophone ; les limites doivent être compréhensibles par une personne non technique.

**Décision.** README, spécification, architecture, design, base, IA, roadmap, décisions et plan de test en français. Les simulations et éléments non testés sont signalés.

**Conséquences.**
- Documentation accessible au public cible.
- Le code et les identifiants restent en anglais.
- La maintenance demande de garder les deux registres cohérents.

**Alternatives.** Documentation anglaise (moins accessible), documentation bilingue (coût).

---

## ADR-016 — Pas de paiement en phase 1

**Contexte.** Aucun prestataire, aucune validation juridique, aucun besoin de facturation immédiate.

**Décision.** Les plans et quotas existent, mais aucun achat n'est branché. Le plan est un champ serveur.

**Conséquences.**
- Pas de risque de facturation erronée.
- Les quotas restent testables.
- La commercialisation exige Google Play Billing et une validation fiscale.

**Alternatives.** Stripe (hors sujet sur Android pour le numérique), achat simulé (trompeur s'il est présenté comme réel).

---

## ADR-017 — Communauté préparée mais non exposée

**Contexte.** Les tables sociales sont utiles à moyen terme, mais la modération n'est pas prête.

**Décision.** Créer les tables, ne brancher aucun écran ni endpoint de commentaire, réaction ou signalement en phase 1.

**Conséquences.**
- Schéma prêt pour la phase 2.
- Aucune promesse de communauté non tenue.
- Les tables non utilisées doivent être documentées comme telles.

**Alternatives.** Supprimer les tables (migration future), exposer sans modération (risque).

---

## ADR-018 — Suppression logique des contenus, réelle pour le compte

**Contexte.** Un auteur peut supprimer par erreur un chapitre ; un utilisateur doit pouvoir effacer ses données.

**Décision.** `deleted_at` pour histoires et chapitres ; suppression en cascade pour le compte.

**Conséquences.**
- Récupération possible des contenus.
- La suppression de compte est immédiate et irréversible.
- Les sauvegardes de production doivent respecter la même politique.

**Alternatives.** Suppression immédiate partout (risque d'erreur), conservation indéfinie (problème de confidentialité).

---

## ADR-019 — Un seul fournisseur IA à la fois

**Contexte.** Éviter les appels implicites et les coûts incontrôlés.

**Décision.** `AI_PROVIDER` vaut `mock` ou `gemini`. Aucun repli silencieux vers un fournisseur payant.

**Conséquences.**
- Comportement prévisible.
- Une erreur de configuration est visible.
- Pas de bascule automatique en cas de panne.

**Alternatives.** Repli automatique (coût imprévisible), routage par tâche (complexité).

---

## ADR-020 — Pas de Docker dans l'environnement de développement

**Contexte.** Docker n'est pas disponible et ne doit pas être une dépendance de démarrage.

**Décision.** Aucun `docker-compose` obligatoire. PGlite par défaut ; PostgreSQL optionnel via une URL.

**Conséquences.**
- Démarrage en une commande.
- Les tests ne nécessitent aucun service.
- La parité avec la production doit être vérifiée séparément.

**Alternatives.** Docker Compose (standard mais indisponible), base distante partagée (latence, confidentialité).

# Feuille de route — Plume

**État actuel :** phase 1 fonctionnelle, vérifiée côté API et typecheck, non compilée en natif.

---

## Phase 0 — Cadrage (terminée)

- Philosophie produit et garde-fous IA.
- Direction artistique et palette.
- Modèle de données.
- Choix techniques.
- Spécification des cinq onglets.

---

## Phase 1 — Socle fonctionnel (terminée)

### Livré

- Monorepo npm workspaces.
- Design system partagé (tokens, composants, thèmes de lecture).
- API Fastify + tRPC + Drizzle.
- 38 tables et migration générée.
- PGlite pour le développement et les tests.
- Authentification : inscription, connexion, refresh rotatif, déconnexion, changement de mot de passe, suppression de compte, export JSON.
- Onboarding et préférences.
- Histoires : CRUD, visibilité, statut, archivage, export.
- Chapitres : création, sauvegarde idempotente, conflits, snapshots, versions, restauration, duplication, réordonnancement, publication.
- Éditeur mobile : autosave, brouillon local, file hors ligne, undo/redo, Markdown léger, compteur, mode concentration.
- Lecture : catalogue, fiche histoire, profil auteur, lecteur, progression, signets, bibliothèque, listes, abonnements.
- Bible narrative : CRUD complet des cinq sections.
- Coach : diagnostic de chapitre ou d'extrait, citations vérifiées, exercices, conversation avec refus de réécriture.
- Ateliers : 7 compétences, 7 ateliers, 21 exercices, 12 consignes.
- Quotas serveur.
- Seed de démonstration.
- 42 tests API, 10 tests partagés, typechecks.
- Documentation française.

### Non livré dans la phase 1

- APK/AAB natif.
- Vérification d'e-mail et réinitialisation de mot de passe.
- Paiement.
- Notifications push.
- Communauté exposée.
- Mémoire narrative branchée.
- Analyses multi-chapitres.
- WYSIWYG.
- Synchronisation en arrière-plan.

---

## Phase 1.5 — Durcissement avant toute mise en production

Objectif : rendre le produit installable et sûr, sans ajouter de surface fonctionnelle majeure.

### Priorité haute

1. **Build Android réel**
   - `eas build --platform android --profile preview`.
   - Test sur Samsung Galaxy S24 Ultra.
   - Vérifier polices, clavier, zones sûres, retour matériel, mode sombre.
   - Corriger les problèmes de rendu réels.

2. **Audit de sécurité**
   - Revue des accès aux manuscrits.
   - Rotation des refresh tokens et détection de réutilisation.
   - Limitation de débit distribuée.
   - En-têtes HTTP, CORS, HTTPS.
   - Revue des journaux.

3. **PostgreSQL réel**
   - Appliquer la migration sur un PostgreSQL managé.
   - Vérifier les types, index et performances.
   - Sauvegardes et test de restauration.

4. **E-mail**
   - Fournisseur transactionnel.
   - Vérification d'adresse.
   - Réinitialisation de mot de passe.
   - Jetons à usage unique et expiration.

5. **Observabilité**
   - Journalisation structurée.
   - Alerting sur erreurs 500.
   - Métriques de latence et de quota.
   - Suivi des échecs d'analyse.

### Priorité moyenne

6. **Accessibilité sur appareil**
   - Audit TalkBack.
   - Contraste réel sur dalle OLED.
   - Taille de texte maximale.
   - Réduction des animations.

7. **Tests d'interface**
   - Tests de composants.
   - Parcours Detox ou Maestro sur un appareil.
   - Captures de référence.

8. **Performance**
   - Temps de démarrage.
   - Mémoire de l'éditeur sur chapitres longs.
   - Taille du bundle.

---

## Phase 2 — Lecture et communauté

Objectif : rendre la bibliothèque vivante sans compromettre la confidentialité des manuscrits.

- Commentaires et réactions, avec modération.
- Signalements et file de modération.
- Notifications in-app, puis push.
- Pages auteur enrichies.
- Recommandations éditoriales simples (genres, suivis).
- Listes publiques.
- Recherche plein texte avec index `tsvector`.
- Fil d'actualité des auteurs suivis.

Prérequis : politique de modération, procédure de signalement, règles de confidentialité, charge de modération.

---

## Phase 3 — Coach réel et mémoire narrative

Objectif : passer de la simulation à un accompagnement littéraire utile, sans ghostwriting.

- Activation d'un fournisseur réel après validation de coût et de confidentialité.
- Jeu d'évaluation annoté par des enseignants.
- Mémoire narrative : extraction de faits, confirmation par l'auteur, preuves.
- Détection de contradictions entre chapitres.
- Analyses multi-chapitres.
- Comparaison de versions.
- Exercices personnalisés selon les faiblesses récurrentes.
- Suivi longitudinal des compétences.
- Consentement explicite avant envoi du texte à un tiers.

Prérequis : qualité mesurée, coût maîtrisé, transparence, droit à l'effacement.

---

## Phase 4 — Commercialisation

Objectif : financer le service sans trahir la promesse.

- Paiement via Google Play Billing (obligatoire sur Android pour le numérique).
- Gestion des abonnements, remboursements, résiliations.
- Essai gratuit et limites claires.
- Facturation et TVA.
- Politique de confidentialité et conditions d'utilisation.
- Support utilisateur.
- Programme de tests fermés sur le Play Store.
- Fiche store, captures, description.

**Aucun paiement ne doit être activé sans validation juridique et fiscale.**

---

## Phase 5 — iOS et extension

- Build iOS via EAS.
- Adaptation des zones sûres et des gestes.
- Revue App Store (règles sur le contenu généré et les abonnements).
- Synchronisation multi-appareils.
- Export EPUB.
- Mode hors ligne avancé.

---

## Risques et parades

| Risque | Impact | Parade |
| --- | --- | --- |
| Le mock est pris pour une vraie IA | Perte de confiance | Encart de simulation, vocabulaire prudent, documentation |
| Coût IA incontrôlé | Perte financière | Quotas serveur, estimation par tâche, validation avant activation |
| Citation inventée | Trahison de la promesse | Vérification exacte, retrait, test dédié |
| Manuscrit privé exposé | Grave | Vérification de propriété, tests d'isolation, revue de sécurité |
| Perte de texte | Grave | Brouillon local, file d'attente, snapshots, idempotence |
| Conflit de version incompris | Frustration | UI explicite, deux choix clairs, aucune résolution silencieuse |
| Dépendance à un fournisseur | Coût, disponibilité | Abstraction `AIProvider`, repli explicite |
| Complexité de la modération | Charge | Communauté hors phase 1 |
| Build natif non testé | Blocage de livraison | Phase 1.5 prioritaire |

---

## Critères de sortie de la phase 1.5

1. Un AAB signé est installé sur un appareil Android réel.
2. Les parcours critiques fonctionnent sur appareil : inscription, écriture, sauvegarde, conflit, lecture, diagnostic.
3. Aucun manuscrit privé n'est accessible par un autre compte (test rejoué sur PostgreSQL).
4. Les sauvegardes et la restauration sont testées.
5. L'e-mail de vérification et de réinitialisation fonctionne.
6. Les quotas et limites sont vérifiés en conditions réelles.
7. La politique de confidentialité est rédigée.
8. Les coûts IA sont mesurés sur un échantillon.

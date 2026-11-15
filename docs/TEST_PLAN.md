# Plan de test — Plume

**Dernière exécution :** 15 novembre 2026
**Périmètre vérifié :** tests automatisés, typechecks, bundle web, routes HTTP, parcours API, build EAS preview.

---

## 1. Résumé de l'état

| Vérification | Résultat | Détail |
| --- | --- | --- |
| Tests `@plume/shared` | **10/10** | Utilitaires texte |
| Tests `@plume/api` | **42/42** | Auth, histoires, chapitres, conflits, lecture, IA, bible, HTTP |
| Typecheck `@plume/api` | **Passe** | `tsc --noEmit` |
| Typecheck `@plume/mobile` | **Passe** | `tsc --noEmit` |
| Bundle web Expo | **Se compile** | Routes principales en HTTP 200 |
| Parcours API de bout en bout | **Passe** | Connexion, lecture, analyse, coach, CRUD bible, atelier |
| Build Android EAS preview | **Passe** | APK `app.plume.reader` 0.1.0 (versionCode 1), 102 Mo, bundle avec URL HTTPS |
| Installation sur appareil physique | **Non testée** | APK produit, mais pas d'appareil connecté pour l'installer |
| Test sur appareil physique | **Non testé** | Pas d'appareil connecté |
| Audit visuel | **Non réalisé** | Pas de capture fiable dans cet environnement |
| PostgreSQL réel | **Non testé** | PGlite uniquement |

Le build EAS `9a70e677-0ed6-497e-8fd1-afaf00358fa0` a produit un APK signé, téléchargeable et dont le bundle contient bien l'URL HTTPS de l'API temporaire. L'APK n'a **pas** été installé sur un appareil physique : l'écran de démarrage, la connexion et les parcours tactiles restent à vérifier sur le Samsung Galaxy S24 Ultra.

---

## 2. Commandes

```bash
# Tests partagés
npm run test --workspace @plume/shared

# Tests API (mémoire augmentée)
NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api

# Typechecks
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck --workspace @plume/api
npm run typecheck --workspace @plume/mobile

# Tout
npm test
NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck
```

---

## 3. Tests partagés (10)

Fichier : `packages/shared/test/text.test.ts`

| Groupe | Cas |
| --- | --- |
| `countWords` | Ignore les marqueurs Markdown |
| `countWords` | Retourne 0 sur un texte vide |
| `readingTimeMinutes` | Au moins 1 minute pour un texte non vide |
| `readingTimeMinutes` | Arrondit selon 220 mots/minute |
| `stripMarkdown` | Retire titres, emphases et citations |
| `excerpt` | Tronque proprement sur un mot |
| `diffWords` | Identifie ajouts et suppressions |
| `citationExists` | Vérifie une citation exacte |
| `citationExists` | Rejette une citation absente |
| `citationExists` | Normalise les espaces |

Ces tests protègent les fonctions utilisées par l'éditeur, le lecteur et la vérification anti-hallucination.

---

## 4. Tests API (42)

### 4.1 Authentification — 11 tests

- Création de compte, profil et préférences par défaut.
- Refus d'un e-mail déjà utilisé.
- Refus d'un mot de passe incorrect sans révéler l'existence du compte.
- Rotation du refresh token et détection de réutilisation.
- Onboarding et conservation des préférences.
- Rejet d'une entrée invalide.
- Refus des procédures protégées sans jeton.
- Refus d'un jeton falsifié.
- Export des données sans secret.
- Suppression de compte avec confirmation et mot de passe.
- Limitation de débit après trop de tentatives de connexion.

### 4.2 Histoires — 5 tests

- Création et récupération dans la liste.
- Mise à jour des métadonnées sans casser l'identité.
- Limite d'histoires actives du plan gratuit.
- Interdiction d'accéder au tableau de bord d'un autre auteur.
- Suppression logique.

### 4.3 Chapitres, versions et conflits — 6 tests

- Création, sauvegarde et snapshot manuel.
- Idempotence sur le même `clientMutationId`.
- Conflit de version avec l'état serveur.
- Restauration d'une version antérieure sans perdre l'historique.
- Réordonnancement et duplication.
- Limite hebdomadaire de chapitres du plan gratuit.

### 4.4 Publication et lecture — 5 tests

- Refus de publier une histoire privée.
- Publication, lecture publique et masquage après dépublication.
- Non-révélation d'un brouillon privé à un autre compte.
- Progression, abonnement et bibliothèque.
- Export Markdown et texte.

### 4.5 Coach et IA — 7 tests

- Diagnostic structuré avec citations réelles.
- Évaluation de compétence et progression.
- Refus d'un passage trop court.
- Protection du diagnostic contre les autres comptes.
- Refus de réécrire à la place de l'auteur.
- Citation du manuscrit dans une réponse contextuelle.
- Blocage de l'analyse quand le quota mensuel est épuisé.

### 4.6 Bible narrative — 4 tests

- Création et mise à jour d'un personnage complet.
- Gestion des lieux, intrigues, chronologie et idées.
- Isolation de la bible par compte.
- Refus de modifier une fiche appartenant à une autre histoire.

### 4.7 HTTP — 4 tests

- Point de santé.
- Réponse du routeur tRPC.
- 401 sur procédure protégée sans session.
- En-têtes de sécurité.

---

## 5. Parcours API de bout en bout

Script exécuté manuellement contre l'API locale :

1. Connexion avec `auteur@plume.app`.
2. Liste des histoires et tableau de bord.
3. Liste de la bible narrative.
4. Analyse mock d'un chapitre et lecture du diagnostic.
5. Création d'une session de coaching.
6. Envoi d'une demande de réécriture → refus.
7. Création d'un personnage, d'un lieu, d'une intrigue, d'un événement, d'une idée.
8. Mise à jour d'un personnage.
9. Suppressions.
10. Récupération d'un atelier.
11. Sauvegarde d'un essai d'exercice.
12. Tableau de progression.

**Résultat :** passe. Les artefacts de test ont ensuite été supprimés de la base de démonstration.

---

## 6. Vérifications web

- Bundle Expo compilé avec `NODE_OPTIONS=--max-old-space-size=4096`.
- Routes testées en HTTP 200 :
  - `/coach/[id]`
  - `/analyse/[id]`
  - `/bible/[id]`
  - `/atelier/[slug]`
  - `/histoire/[id]`
  - `/ecrire`
  - `/apprendre`
  - `/connexion`
- **Non vérifié :** rendu visuel, interactions, accessibilité réelle, comportement tactile.

---

## 7. Matrice manuelle à exécuter sur appareil

Cette matrice n'a **pas** été exécutée. Elle doit l'être avant toute livraison.

### 7.1 Démarrage

| # | Scénario | Attendu |
| --- | --- | --- |
| 1 | Installer l'APK et ouvrir | Splash, chargement des polices, écran de bienvenue |
| 2 | Couper le réseau puis ouvrir | Message clair, pas de crash |
| 3 | Changer la taille de texte système | L'interface reste lisible |

### 7.2 Authentification

| # | Scénario | Attendu |
| --- | --- | --- |
| 4 | Créer un compte | Onboarding, session persistante |
| 5 | Se déconnecter puis se reconnecter | Retour au même état |
| 6 | Mauvais mot de passe | Message générique, pas d'indice sur le compte |
| 7 | Laisser expirer l'access token | Rafraîchissement transparent |
| 8 | Supprimer le compte | Confirmation, déconnexion, données effacées |

### 7.3 Écriture

| # | Scénario | Attendu |
| --- | --- | --- |
| 9 | Créer une histoire privée | Visible dans Écrire, absente de Découvrir |
| 10 | Écrire 500 mots | Compteur et temps de lecture cohérents |
| 11 | Attendre 2 s | Sauvegarde automatique |
| 12 | Couper le réseau, écrire, revenir | File rejouée, aucune perte |
| 13 | Ouvrir le même chapitre sur deux appareils, modifier | Conflit détecté, deux choix clairs |
| 14 | Choisir « garder ma version » | Version locale conservée, snapshot créé |
| 15 | Choisir « recharger le serveur » | Contenu serveur restauré |
| 16 | Annuler / rétablir | Historique cohérent |
| 17 | Appliquer gras et italique | Rendu correct en lecture |
| 18 | Restaurer une version | Contenu restauré, historique conservé |
| 19 | Exporter en TXT et Markdown | Fichier partageable, contenu complet |
| 20 | Publier puis dépublier | Visible puis masqué du catalogue |

### 7.4 Lecture

| # | Scénario | Attendu |
| --- | --- | --- |
| 21 | Chercher une histoire publique | Résultats pertinents |
| 22 | Ouvrir un chapitre | Lecture confortable, thème appliqué |
| 23 | Changer de thème et de taille | Préférence conservée |
| 24 | Ajouter un signet | Visible dans Favoris |
| 25 | Reprendre la lecture | Position restaurée |
| 26 | Suivre un auteur | Apparaît dans la bibliothèque |

### 7.5 Coach

| # | Scénario | Attendu |
| --- | --- | --- |
| 27 | Analyser un chapitre de 30 mots | Diagnostic complet |
| 28 | Analyser un extrait de 10 mots | Refus explicite |
| 29 | Analyser un extrait modifié | Refus : l'extrait ne correspond pas |
| 30 | Vérifier les citations | Chaque citation existe dans le chapitre |
| 31 | Demander « réécris ce passage » | Refus, proposition de méthode |
| 32 | Épuiser le quota | Erreur claire, aucun appel |
| 33 | Vérifier l'encart de simulation | Visible et explicite |

### 7.6 Bible et ateliers

| # | Scénario | Attendu |
| --- | --- | --- |
| 34 | Créer, modifier, supprimer un personnage | CRUD complet |
| 35 | Faire de même pour lieux, intrigues, chronologie, idées | CRUD complet |
| 36 | Ouvrir un atelier | Théorie, exemples, pièges, exercices |
| 37 | Sauvegarder un essai | Persistant après redémarrage |
| 38 | Marquer un exercice terminé | Progression mise à jour |

### 7.7 Accessibilité

| # | Scénario | Attendu |
| --- | --- | --- |
| 39 | TalkBack sur les cinq onglets | Libellés corrects, ordre logique |
| 40 | Taille de texte maximale | Aucune troncature bloquante |
| 41 | Réduction des animations | Transitions instantanées |
| 42 | Contraste en plein soleil | Texte lisible |
| 43 | Cibles tactiles | Aucune cible < 44 px |

---

## 8. Ce qui n'est pas testé

- Build Android et iOS.
- Installation sur appareil physique.
- Rendu des polices Google Fonts au premier lancement.
- Comportement du clavier (azerty, correcteur, autocomplétion).
- Zones sûres, encoche, navigation gestuelle.
- Performance sur chapitre de 10 000 mots.
- Consommation mémoire de l'éditeur.
- Synchronisation réelle entre deux appareils.
- PostgreSQL réel et migrations sur une base vierge.
- Envoi d'e-mail (non implémenté).
- Paiement (non implémenté).
- Notifications push (non implémenté).
- Communauté (non exposée).
- Mémoire narrative (non branchée).
- Audit de sécurité externe.
- Test de charge et de rate limiting distribué.
- Restauration de sauvegarde PostgreSQL.
- Accessibilité certifiée.
- Compatibilité iOS.

---

## 9. Critères de non-régression

Avant chaque livraison :

1. `npm run test --workspace @plume/shared` → 10/10.
2. `NODE_OPTIONS=--max-old-space-size=4096 npm run test --workspace @plume/api` → 42/42.
3. Typecheck API et mobile → passe.
4. Bundle web → compile.
5. Aucun secret dans le dépôt (`git grep` sur les motifs de clés).
6. Les routes protégées redirigent sans session.
7. Un manuscrit privé reste inaccessible à un autre compte.
8. Une citation inventée est retirée.
9. Une demande de réécriture est refusée.
10. Un conflit de version n'écrase jamais silencieusement le texte.

---

## 10. Données de test

- Comptes : `lecteur@plume.app`, `auteur@plume.app`, mot de passe `Plume2026`.
- Base : `apps/api/data/pglite`.
- Les artefacts créés par les tests manuels doivent être supprimés avant livraison.
- Ne jamais utiliser ces comptes en production.

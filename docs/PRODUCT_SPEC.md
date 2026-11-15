# Spécification produit — Plume

**Version :** phase 1 fonctionnelle
**Plateforme cible :** Android (Samsung Galaxy S24 Ultra en référence), extensible à iOS
**Langue :** français
**Statut :** implémenté et testé côté API ; application mobile non compilée en natif dans cet environnement

---

## 1. Vision

Plume est un **atelier d'écriture** autant qu'une **bibliothèque de lecture**. L'application s'adresse aux personnes qui écrivent seules, sans école ni communauté immédiate, et qui veulent progresser sans qu'on écrive à leur place.

La direction artistique — une bibliothèque gothique enchantée — sert la lecture et l'écriture : lumière de nuit, papier ancien, or discret. Elle ne doit jamais nuire à la lisibilité.

### Promesse

> Un lieu calme pour écrire, lire et apprendre — où l'intelligence artificielle aide à voir son texte, jamais à le remplacer.

### Ce que Plume n'est pas

- Un générateur de romans.
- Un ghostwriter.
- Un réseau social de commentaires anonymes.
- Un correcteur orthographique complet.
- Un service de publication professionnelle.

---

## 2. Publics

### Persona principal — L'autrice en progression

- Écrit depuis quelques mois ou années, sans publication.
- A un projet de roman ou de nouvelle.
- Veut des retours concrets, pas des compliments.
- Utilise son téléphone pour écrire par fragments.
- Craint de perdre ses textes et de se les faire « voler » par un outil.

### Persona secondaire — Le lecteur curieux

- Lit sur téléphone, souvent le soir.
- Cherche des histoires courtes ou en cours.
- Veut suivre des auteurs et garder une bibliothèque personnelle.
- N'écrit pas nécessairement.

### Persona tertiaire — L'apprenant

- Veut comprendre les notions narratives (personnages, tension, rythme).
- Préfère des exercices courts à de la théorie longue.
- Attend des exemples et des critères d'auto-évaluation.

---

## 3. Principes produit

1. **L'auteur décide.** Publication, visibilité et suppression sont des actions explicites.
2. **Le privé est privé.** Un manuscrit non publié n'apparaît nulle part publiquement.
3. **Le coach ne produit pas de texte.** Il décrit, questionne, propose des contraintes.
4. **Chaque conseil est traçable.** Une citation vient du manuscrit ; un constat cite le passage concerné.
5. **La progression est pédagogique.** Les scores sont des repères, pas des notes.
6. **L'application reste utilisable sans réseau.** Les brouillons locaux priment sur la perte de connexion.
7. **L'accessibilité n'est pas optionnelle.** Contraste, taille de texte, cibles tactiles, réduction des animations.

---

## 4. Navigation

Cinq onglets principaux, toujours accessibles :

| Onglet | Rôle | Contenu |
| --- | --- | --- |
| **Accueil** | Reprendre | Reprise de lecture, manuscrit en cours, prochain objectif, raccourcis |
| **Découvrir** | Lire | Catalogue public, recherche, genres, histoires, auteurs |
| **Écrire** | Produire | Mes histoires, création, brouillons, chapitres récents |
| **Apprendre** | Progresser | Compétences, ateliers, exercices, progression |
| **Profil** | Gérer | Compte, préférences, bibliothèque, favoris, listes, réglages |

Les espaces **Bibliothèque**, **Coach** et **Communauté** sont contextuels :

- La bibliothèque est accessible depuis le profil et l'accueil.
- Le coach s'ouvre depuis une histoire (`/coach/[id]`) ou un diagnostic (`/analyse/[id]`).
- La communauté n'est pas exposée en phase 1 ; les tables existent mais aucun écran ne les utilise.

### Routes principales

```text
/                         Accueil
/decouvrir                Catalogue
/ecrire                   Mes histoires
/apprendre                Ateliers et compétences
/profil                   Compte
/connexion                Connexion
/inscription              Inscription
/onboarding               Préférences initiales
/histoire/[id]            Tableau de bord d'une histoire
/chapitre/[id]            Éditeur de chapitre
/lecture/[id]             Lecteur d'un chapitre publié
/histoire-publique/[id]   Fiche publique d'une histoire
/auteur/[id]              Profil public d'un auteur
/coach/[id]               Coach d'une histoire
/analyse/[id]             Diagnostic détaillé
/bible/[id]               Bible narrative
/atelier/[slug]           Atelier d'écriture
/bibliotheque             Bibliothèque personnelle
/favoris                  Signets
/listes                   Listes de lecture
/reglages                 Réglages
```

---

## 5. Fonctionnalités de la phase 1

### 5.1 Compte et session

- Inscription par e-mail, mot de passe et pseudonyme.
- Connexion, déconnexion.
- Session persistante via access token court et refresh token rotatif.
- Rafraîchissement automatique sur erreur 401, avec rejeu de la requête.
- Onboarding : objectif, expérience, genres, compétences, notifications.
- Modification du profil : pseudonyme, bio, motif d'avatar.
- Changement de mot de passe.
- Export complet des données en JSON.
- Suppression de compte avec confirmation et mot de passe.

**Non implémenté :** vérification d'e-mail et réinitialisation de mot de passe (renvoient `NOT_IMPLEMENTED`), car aucun fournisseur e-mail n'est configuré.

### 5.2 Manuscrits

- Création d'une histoire : titre, résumé, genre, public, avertissements de contenu, visibilité.
- Statuts : en cours, terminée, en pause, abandonnée.
- Visibilité : privée ou publique.
- Tableau de bord : chapitres, progression, bible, coach, export.
- Modification des métadonnées.
- Archivage et suppression logique.
- Export du manuscrit en TXT et Markdown.
- Quota d'histoires actives selon le plan.

### 5.3 Chapitres et éditeur

L'éditeur est le cœur du produit.

- Titre et contenu.
- Sauvegarde automatique après **1,8 s** d'inactivité.
- Sauvegarde manuelle.
- Brouillon local persistant.
- File d'attente hors ligne, rejouée au retour du réseau.
- Gestion explicite des conflits : conserver sa version ou recharger celle du serveur.
- Annuler / rétablir dans la session d'édition.
- Gras et italique via marqueurs Markdown légers (`**`, `_`).
- Compteur de mots et temps de lecture.
- Mode concentration.
- Historique de versions avec restauration.
- Publication et dépublication.
- Duplication, réordonnancement, archivage, suppression et restauration de chapitres.

**Choix assumé :** pas de WYSIWYG riche en phase 1. Le format est du Markdown léger, lisible et exportable. Voir `docs/DECISIONS.md`.

### 5.4 Lecture

- Catalogue public : recherche, filtre par genre et statut, pagination.
- Fiche histoire : résumé, avertissements, chapitres publiés, auteur.
- Profil auteur : histoires publiques, abonnés.
- Lecteur : thème nuit / sépia / ivoire, taille de texte, progression, signets.
- Reprise de lecture.
- Bibliothèque personnelle : histoires suivies et lues.
- Listes de lecture.
- Abonnement à une histoire ou à un auteur.

### 5.5 Bible narrative

Cinq sections, avec création, modification et suppression :

1. **Personnages** : nom, rôle, description, motivation, peur, arc, voix.
2. **Lieux** : nom, description, atmosphère, importance.
3. **Intrigues** : nom, description, enjeux, statut, résolution.
4. **Chronologie** : titre, date fictive, ordre narratif, conséquences, chapitre lié.
5. **Idées** : note libre, type, conversion possible.

Un plan structuré est également stocké.

La bible sert de référence à l'auteur. En phase 1, elle n'alimente pas encore automatiquement la mémoire longue du coach.

### 5.6 Coach pédagogique

- Diagnostic d'un chapitre entier ou d'un extrait exact.
- Prérequis : au moins **30 mots**, chapitre appartenant à l'auteur, extrait présent mot pour mot dans le chapitre enregistré.
- Compétence ciblée parmi sept : personnages, dialogues, tension, descriptions, rythme, structure, préparation narrative.
- Résultat : constats (forces et axes), citations vérifiées, explications, impact lecteur, recommandations, exercices.
- Score pédagogique et niveau de confiance.
- Conversation de méthode : le coach refuse les demandes de réécriture.
- Historique des diagnostics par histoire et par chapitre.
- Quota mensuel de jetons appliqué côté serveur.

**Simulation explicite :** le moteur par défaut est déterministe et local (`AI_PROVIDER=mock`). Il ne comprend pas le sens profond du texte. Il valide le parcours, la structure des retours et la vérification des citations. Voir `docs/AI_COACH.md`.

### 5.7 Apprendre

- Sept compétences avec définition, points d'attention et question d'auto-évaluation.
- Sept ateliers : théorie, exemples, pièges fréquents, exercices.
- 21 exercices au total.
- 12 consignes d'écriture.
- Sauvegarde privée d'un essai par exercice, avec statut.
- Tableau de progression : mots écrits, chapitres, diagnostics, compétences, série.

### 5.8 Réglages

- Taille de texte (0,9 à 1,4).
- Thème de lecture et thème d'écriture : nuit, sépia, ivoire.
- Réduction des animations.
- Préférences de notifications (stockées, non envoyées).
- Export JSON.
- Suppression de compte.

---

## 6. Quotas et plans

Les plans sont définis dans `packages/shared/src/domain/plans.ts` et appliqués côté serveur.

| Plan | Prix indicatif | Histoires actives | Chapitres / semaine | Jetons IA / mois |
| --- | --- | --- | --- | --- |
| Plume | Gratuit | 1 | 3 | 15 000 |
| Plume+ | 4,99 € / mois | 5 | 30 | 100 000 |
| Plume++ | 9,99 € / mois | 20 | 100 | 500 000 |

**Aucun paiement n'est branché.** Les plans existent en base et les quotas sont réels, mais l'achat est manuel ou simulé en développement. Les prix sont des paramètres à valider économiquement.

---

## 7. Contenu de démonstration

Le seed crée :

- 2 comptes : `lecteur@plume.app` et `auteur@plume.app`, mot de passe `Plume2026`.
- 4 histoires publiques originales, 2 chapitres chacune.
- 1 manuscrit privé, « La Chambre des échos », 3 chapitres.
- Des personnages, lieux, intrigues, événements et idées pour ce manuscrit.
- 1 diagnostic simulé.
- 7 ateliers, 21 exercices, 12 consignes.

Ces contenus sont réservés au développement local.

---

## 8. Accessibilité

- Cibles tactiles ≥ 44 px, confort 48 px.
- Contraste vérifié pour les textes principaux et secondaires sur fond nuit et parchemin.
- Taille de texte ajustable sans casser les mises en page.
- Réduction des animations respectée par les composants animés.
- Textes alternatifs sur les éléments visuels porteurs de sens.
- Navigation clavier sur la version web (non validée visuellement).
- Pas d'information portée par la couleur seule.

---

## 9. Indicateurs de succès (phase 1)

Ces indicateurs sont des cibles, pas des mesures disponibles :

- Un auteur crée une histoire et sauvegarde un chapitre sans perte.
- Un conflit de version est compris et résolu sans support.
- Un diagnostic produit au moins une citation exacte et un exercice actionnable.
- Un lecteur trouve une histoire publique et reprend sa lecture.
- Aucun manuscrit privé n'est accessible à un autre compte.

---

## 10. Hors périmètre phase 1

- Commentaires, réactions, signalements et modération exposés.
- Notifications push.
- Messagerie entre auteurs.
- Paiement et abonnements réels.
- Vérification d'e-mail et réinitialisation de mot de passe.
- Mémoire narrative longue durée branchée sur le coach.
- Analyses multi-chapitres.
- Comparaison de versions assistée.
- Application iOS testée.
- Compilation APK/AAB dans cet environnement.
- Synchronisation hors ligne en arrière-plan.
- Éditeur WYSIWYG riche.
- Correcteur orthographique et grammatical.

---

## 11. Critères d'acceptation de la phase 1

1. Les cinq onglets sont présents et navigables.
2. L'inscription, la connexion et la déconnexion fonctionnent via l'API.
3. Un auteur crée une histoire privée, un chapitre, le sauvegarde et le retrouve.
4. La sauvegarde est idempotente et détecte les conflits.
5. Un chapitre publié dans une histoire publique est lisible par un autre compte.
6. Un manuscrit privé reste invisible pour les autres comptes.
7. Le coach refuse une réécriture et ne cite que le manuscrit.
8. La bible narrative permet le CRUD complet des cinq sections.
9. Les ateliers et exercices sont consultables et les essais sont sauvegardés.
10. Les tests partagés et API passent, ainsi que les typechecks.
11. La documentation décrit honnêtement ce qui est testé et ce qui ne l'est pas.

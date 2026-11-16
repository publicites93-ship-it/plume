# Coach et IA — Plume

**Code :** `apps/api/src/services/ai/`
**Interface :** `apps/mobile/app/(protected)/coach/[id].tsx`, `analyse/[id].tsx`
**Fournisseur par défaut :** `MockPedagogicalProvider` (`AI_PROVIDER=mock`)

---

## 1. Position éditoriale

Le coach de Plume est un **professeur de écriture**, pas un générateur. Il peut :

- décrire un effet produit par un passage ;
- nommer une compétence en jeu ;
- poser une question que l'auteur peut se poser seul ;
- proposer une contrainte ou un exercice ;
- refuser une demande de réécriture.

Il ne peut pas :

- écrire ou réécrire un passage ;
- inventer une citation ;
- affirmer un fait sur le manuscrit qu'il n'a pas vérifié ;
- prétendre connaître des personnages ou des événements absents du texte et de la bible ;
- attribuer une note littéraire absolue.

Cette frontière est **produit**, pas seulement technique. Elle doit rester visible dans l'interface.

---

## 2. Les sept compétences

| Compétence | Question directrice | Atelier lié |
| --- | --- | --- |
| Personnages | Le personnage agit-il selon un désir et une peur qui lui sont propres ? | `construire-des-personnages` |
| Dialogues | Que veut chaque personnage, et qu'est-ce qu'il ne dit pas ? | `ecrire-des-dialogues` |
| Tension narrative | Que peut perdre le personnage, et pourquoi maintenant ? | `creer-de-la-tension` |
| Descriptions | Quel détail ce personnage remarquerait-il, et lui seul ? | `maitriser-les-descriptions` |
| Rythme | Où le lecteur reprend-il son souffle, et cela sert-il la scène ? | `travailler-le-rythme` |
| Structure | Si je retire cette scène, qu'est-ce qui devient moins nécessaire ? | `structurer-une-histoire` |
| Préparation narrative | Quel détail paraîtra anodin maintenant et évident après ? | `preparer-les-revelations` |

Chaque compétence possède une définition, des points d'attention, une question d'auto-évaluation et quatre niveaux : Découverte, Apprenti, Confirmé, Expert.

---

## 3. Parcours d'un diagnostic

```text
Auteur choisit un chapitre ou un extrait
        │
        ▼
Vérifications serveur
  • chapitre appartient à l'auteur
  • extrait présent mot pour mot
  • au moins 30 mots
        │
        ▼
Snapshot de la version analysée (si absent)
        │
        ▼
Vérification du quota IA
        │
        ▼
Appel du fournisseur
        │
        ▼
Vérification de chaque citation contre le chapitre enregistré
        │
        ▼
Persistance : analyse, constats, évaluation de compétence, usage
        │
        ▼
Affichage : score, confiance, constats, citations, exercices
```

### Préconditions

- Le chapitre doit exister, ne pas être supprimé et appartenir à l'auteur.
- En mode `selection`, l'extrait doit être une sous-chaîne exacte du chapitre enregistré.
- Le passage doit contenir au moins **30 mots**.
- Le quota mensuel de jetons doit être disponible.

### Snapshot

Avant l'analyse, le service s'assure qu'une version du chapitre existe pour le numéro courant. Si elle manque, il en crée une avec la raison `ai_snapshot`. L'analyse référence ainsi un état stable du texte.

### Vérification des citations

Chaque constat peut contenir une citation. Le service applique :

```ts
quote = finding.quote && citationExists(finding.quote, chapter.content)
  ? finding.quote
  : null;
```

Une citation absente est **retirée**, pas corrigée. Le constat reste, mais sans citation. Si aucune citation n'est vérifiée et que le fournisseur n'est pas une simulation, une erreur est enregistrée sur l'analyse pour empêcher de la présenter comme fiable.

`citationExists` normalise les espaces et compare le texte exact. Il ne fait pas de correspondance approximative.

### Confiance

- Simulation : `confidence` plafonnée à **0,4**.
- Fournisseur réel : bornée entre 0,1 et 0,95.

Le score est un repère pédagogique de 0 à 100. Il n'est jamais présenté comme une note définitive.

---

## 4. Le moteur simulé

`MockPedagogicalProvider` est déterministe et hors ligne. Il ne comprend pas le sens du texte. Il produit une structure crédible à partir de règles observables :

- nombre de mots ;
- nombre de répliques commençant par un tiret ;
- présence de mots sensoriels ;
- fréquence d'adverbes faibles (`très`, `vraiment`, `soudain`…) ;
- phrases contenant une question ;
- longueur et ponctuation.

Il génère :

- un résumé ;
- un score entre 35 et 78 ;
- deux forces ;
- deux axes d'amélioration ;
- des citations choisies dans le texte ;
- des recommandations et des exercices issus de l'atelier correspondant.

### Signalisation

Le résultat porte `isSimulation: true`. L'interface affiche un encart explicite :

> **Simulation pédagogique.** Ce diagnostic est produit par un moteur local déterministe. Il ne comprend pas le sens de votre texte. Il sert à valider le parcours, les citations et les exercices.

Ne jamais retirer cet encart tant que le fournisseur par défaut est `mock`.

### Ce que le mock ne fait pas

- Il ne détecte pas réellement une incohérence de personnage.
- Il ne comprend pas l'ironie, le sous-texte ou le point de vue.
- Il ne compare pas deux chapitres.
- Il ne mémorise pas l'histoire entre les sessions.
- Il ne produit pas de prose.

---

## 5. Le fournisseur Gemini (non activé)

`GeminiProvider` existe et compile, mais **aucun appel payant n'a été effectué**.

### Activation

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

### Précautions

- Ne jamais activer sans accord explicite de l'utilisateur.
- Vérifier le coût et la politique de confidentialité du fournisseur.
- Le texte de l'auteur est envoyé au fournisseur : cela doit être expliqué et consenti.
- La clé ne doit jamais être commitée.
- Le serveur refuse de démarrer en mode Gemini sans clé.
- Un délai de 90 secondes et un schéma de réponse strict sont appliqués.
- La vérification des citations reste côté Plume, quel que soit le fournisseur.

### Prompt

Le prompt demande :

- une analyse en français ;
- des constats structurés ;
- des citations **exactes** du passage ;
- aucune réécriture ;
- aucun fait inventé ;
- un JSON conforme au schéma Zod.

Le prompt seul ne suffit pas : la vérification serveur est la garantie réelle.

---

## 6. Conversation de méthode

`ai.send` permet une conversation rattachée à une histoire.

### Comportement

1. Le message utilisateur est enregistré.
2. Le service cherche le dernier diagnostic complété de l'histoire.
3. Si la demande contient une intention de réécriture, le coach refuse explicitement.
4. Sinon, il reprend un constat du dernier diagnostic, cite un passage vérifié et propose une méthode.
5. La réponse est enregistrée avec ses citations.
6. L'usage est imputé au quota `coach_chat`.

### Détection de réécriture

Une expression régulière repère les formulations du type « réécris », « corrige mon texte », « propose une version », « améliore ce passage ». En cas de doute, le coach refuse et propose une contrainte de travail.

### Sans diagnostic

Si aucun diagnostic n'existe, le coach ne prétend rien savoir. Il invite à lancer une analyse et demande ce qui bloque.

### Limites

- Pas de mémoire longue entre histoires.
- Pas de compréhension réelle du texte par le mock.
- Pas de génération de prose, même sur demande insistante.
- L'historique de conversation est stocké, mais aucune synthèse automatique n'est produite.

---

## 7. Quotas

Les tâches IA ont une estimation de jetons :

| Tâche | Estimation |
| --- | --- |
| `chapter_diagnostic` | 6 000 |
| `targeted_analysis` | 2 500 |
| `multi_chapter_analysis` | 18 000 |
| `memory_extraction` | 4 000 |
| `contradiction_check` | 7 000 |
| `exercise_generation` | 2 000 |
| `version_comparison` | 5 000 |
| `progress_report` | 3 000 |
| `coach_chat` | 1 500 |
| `narrative_summary` | 4 000 |

Les enveloppes mensuelles :

- Gratuit : 15 000 jetons.
- Plume+ : 100 000 jetons.
- Plume++ : 500 000 jetons.

La vérification est serveur. Un dépassement renvoie une erreur explicite, sans lancer l'appel.

**Attention :** une enveloppe de jetons n'est pas un coût fixe. Les prix des plans sont des paramètres à valider avant commercialisation.

---

## 8. Anti-hallucination : ce qui est réellement garanti

| Risque | Garantie |
| --- | --- |
| Citation inventée | Vérification exacte contre le chapitre enregistré ; citation retirée si absente |
| Fait inventé sur un personnage | Non garanti par le mock ; le prompt Gemini l'interdit, mais la vérification automatique des faits n'existe pas |
| Réécriture | Refus explicite dans la conversation ; le diagnostic ne produit pas de prose |
| Analyse d'un texte non enregistré | L'analyse porte sur le chapitre sauvegardé, pas sur l'état de l'éditeur |
| Perte de texte | Aucune écriture du coach sur le manuscrit |
| Dépassement de quota | Vérification serveur avant appel |

**Ce qui n'est pas garanti :** la pertinence littéraire, la vérité psychologique des constats, la détection fine des incohérences. Ces limites doivent être dites.

---

## 9. Interface

### Écran Coach (`/coach/[id]`)

- Sélection du chapitre.
- Choix de la compétence.
- Analyse du chapitre ou d'un extrait.
- Encart de simulation.
- Derniers diagnostics.
- Conversations récentes.
- Compositeur de message.

### Écran Analyse (`/analyse/[id]`)

- Score et confiance.
- Résumé.
- Forces et axes.
- Citations vérifiées, présentées comme extraits du manuscrit.
- Recommandations.
- Exercices liés.
- Actions : revenir au chapitre, ouvrir le coach.

### Règles d'interface

- Ne jamais afficher une citation sans guillemets français et sans attribution au chapitre.
- Ne jamais afficher un score sans nuance pédagogique.
- Toujours afficher l'encart de simulation avec le moteur `mock`.
- Ne jamais proposer un bouton « réécrire ».
- Les erreurs doivent indiquer que le manuscrit est intact.

---

## 10. Évaluation et amélioration

Pour passer d'un mock à un vrai coach, il faudra :

1. Un jeu d'évaluation de passages annotés par des enseignants.
2. Des critères de qualité : pertinence, spécificité, absence d'invention, utilité de l'exercice.
3. Une mesure du taux de citations vérifiées.
4. Une comparaison entre plusieurs fournisseurs.
5. Un test de coût par diagnostic.
6. Une revue de confidentialité et de consentement.
7. Une validation explicite de l'utilisateur avant tout appel payant.

---

## 11. Limites connues

- Le moteur par défaut est une simulation, pas une IA littéraire.
- Aucun appel Gemini n'a été effectué ni facturé.
- La mémoire narrative n'est pas branchée.
- Les analyses multi-chapitres ne sont pas implémentées.
- La comparaison de versions n'est pas assistée.
- Le coach ne connaît pas la bible narrative dans ses réponses.
- La détection de réécriture est lexicale, pas sémantique.
- L'évaluation de compétence est un repère, pas une certification.

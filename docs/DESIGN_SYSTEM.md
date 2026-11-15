# Design system — Plume

**Source de vérité :** `packages/shared/src/design/tokens.ts`
**Implémentation :** `apps/mobile/src/theme/index.ts` et `apps/mobile/src/components/`

---

## 1. Intention

Plume doit ressembler à une **bibliothèque enchantée** sans devenir un décor illisible : nuit profonde, papier ancien, or discret, typographie de livre. L'interface est un espace de travail, pas une illustration.

Trois règles priment sur l'esthétique :

1. **Lisibilité.** Le texte de l'auteur et le texte de lecture passent avant l'ornement.
2. **Hiérarchie.** L'or signale une action ou un seuil, jamais un paragraphe entier.
3. **Calme.** Peu d'animations, aucune lueur gratuite, aucun bruit visuel.

---

## 2. Palette

### Couleurs de base

| Jeton | Hex | Usage |
| --- | --- | --- |
| `night` | `#101827` | Fond principal sombre |
| `nightDeep` | `#0B111C` | Fond des zones immergées |
| `nightSoft` | `#162133` | Surface secondaire |
| `slate` | `#1C283B` | Cartes, panneaux |
| `ink` | `#24344B` | Surface surélevée |
| `inkSoft` | `#2E4058` | Bordures, séparateurs |
| `parchment` | `#F1E6D1` | Fond clair, papier |
| `parchmentDeep` | `#E4D5B8` | Papier ombré |
| `ivory` | `#FAF5EA` | Surface claire |
| `gold` | `#C5A46A` | Accent principal |
| `goldBright` | `#E0C58A` | Accent actif, focus |
| `goldDim` | `#8C7550` | Accent discret sur clair |
| `bordeaux` | `#673A49` | Avertissement, danger doux |
| `bordeauxDeep` | `#4C2A36` | Fond d'alerte |
| `rose` | `#B88791` | Accent secondaire rare |
| `leather` | `#493A33` | Textures, pieds de page |
| `leatherDeep` | `#332824` | Ombre chaude |

### Couleurs sémantiques

Deux modes complets : `dark` (nuit) et `parchment` (clair). Chaque mode définit :

- `background`, `backgroundDeep`, `surface`, `surfaceRaised`, `surfaceSunken` ;
- `textPrimary`, `textSecondary`, `textMuted`, `textOnGold` ;
- `border`, `borderStrong` ;
- `gold`, `goldBright` ;
- `danger`, `success`, `warning`, `info` ;
- `overlay`.

**Ne jamais coder une couleur en dur dans un écran.** Utiliser `useTheme()` ou les jetons sémantiques.

### Contraste mesuré

Ratios calculés selon WCAG 2.1 :

| Combinaison | Ratio | Verdict |
| --- | --- | --- |
| `textPrimary` nuit (`#F4EBDD`) / `night` | **15,04:1** | AAA |
| `textSecondary` nuit (`#C3B7A4`) / `night` | **8,99:1** | AAA |
| `textMuted` nuit (`#938A7C`) / `night` | **5,22:1** | AA |
| `gold` (`#C5A46A`) / `night` | **7,52:1** | AAA |
| `goldBright` (`#E0C58A`) / `night` | **10,59:1** | AAA |
| `textPrimary` clair (`#2A211B`) / `parchment` | **12,75:1** | AAA |
| `textSecondary` clair (`#5B4B3C`) / `parchment` | **6,75:1** | AA |
| `textMuted` clair (`#7C6A57`) / `parchment` | **4,19:1** | Sous AA pour petit texte |
| `goldDim` (`#8C7550`) / `parchment` | **3,56:1** | Réservé aux accents non textuels |
| `textOnGold` (`#1A1409`) / `gold` | **7,75:1** | AAA |

**Conséquence assumée :** en mode parchemin, `textMuted` ne doit pas porter d'information essentielle en petit corps. Pour un texte secondaire important, utiliser `textSecondary`. `goldDim` sert aux filets, icônes décoratives et grands titres, pas au corps de texte.

---

## 3. Typographie

| Rôle | Police | Graisses | Usage |
| --- | --- | --- | --- |
| Display | **Playfair Display** | 600, 600 italique, 700 | Titres d'écran, titres d'histoires, chiffres clés |
| Littéraire | **Lora** | 400, 400 italique, 500 | Corps de lecture, contenu d'éditeur, citations |
| Interface | **Inter** | 400, 500, 600 | Libellés, boutons, navigation, formulaires |

### Échelle

| Jeton | Taille | Usage |
| --- | --- | --- |
| `xs` | 11 px | Légendes, métadonnées |
| `sm` | 13 px | Texte secondaire, badges |
| `base` | 15 px | Interface courante |
| `md` | 17 px | Corps confortable |
| `lg` | 20 px | Sous-titres |
| `xl` | 25 px | Titres de section |
| `2xl` | 31 px | Titres d'écran |
| `3xl` | 38 px | Titres de couverture |
| `4xl` | 46 px | Chiffres d'accueil |

### Interlignes

`tight` 1,18 · `snug` 1,32 · `normal` 1,5 · `relaxed` 1,62 · `reading` 1,72.

Le corps de lecture utilise `reading`. Les titres utilisent `tight` ou `snug`.

### Règles

- Un écran a **un seul titre display**.
- Le texte littéraire est en Lora, jamais en Inter.
- Les boutons sont en Inter 600, jamais en capitales espacées longues.
- Les italiques servent au texte, pas à l'interface.
- La taille de texte est multipliée par la préférence utilisateur (`fontScale` 0,9 → 1,4).

---

## 4. Espacement, rayons, ombres

### Espacement (base 4 px)

`0` 0 · `1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `7` 32 · `8` 40 · `9` 48 · `10` 64 · `11` 80 · `12` 96.

Marges d'écran : `4` (16 px) sur mobile, `6` (24 px) pour les écrans de lecture.

### Rayons

`xs` 4 · `sm` 8 · `md` 14 · `lg` 20 · `xl` 28 · `pill` 999.

Les cartes utilisent `md` ou `lg`. Les boutons utilisent `pill` ou `md` selon la hiérarchie. Les champs utilisent `md`.

### Ombres

Ombre douce, jamais noire pure :

```ts
shadowColor: "#000000",
shadowOpacity: 0.18,
shadowRadius: 18,
shadowOffset: { width: 0, height: 10 },
elevation: 6,
```

Sur fond sombre, préférer une bordure or plutôt qu'une ombre.

---

## 5. Composants

Tous les composants vivent dans `apps/mobile/src/components/`.

### `Screen`

Conteneur d'écran : fond, zones sûres, padding, gestion du clavier, scroll optionnel.

### `Text`

Variantes : `display`, `title`, `subtitle`, `body`, `literary`, `caption`, `label`, `quote`. Applique la police, la taille, l'interligne et la couleur sémantique.

### `Button`

Variantes : `primary` (or sur nuit), `secondary` (bordure or), `ghost`, `danger`. Tailles `sm`, `md`, `lg`. États `disabled`, `loading`. Cible tactile minimale 44 px.

### `Input`

Libellé, aide, erreur, compteur éventuel. Bordure or au focus. Jamais de placeholder comme seul libellé.

### `Card`

Surface, bordure, padding, option interactive. Utilisée pour les histoires, diagnostics, exercices.

### `Sheet`

Panneau modal bas pour les formulaires courts (création d'une fiche de bible, réglages). Fermeture explicite, pas de geste obligatoire.

### `Feedback`

Messages de succès, d'erreur, d'information et de simulation. Le message de simulation IA est visuellement distinct et jamais masquable par erreur.

### `StoryCard`

Couverture procédurale, titre, auteur, genre, progression, statut. Utilisée dans Découvrir, Écrire et Bibliothèque.

### `Cover`

Couverture générée à partir d'un motif et de la palette. Aucune image externe.

### `Prose`

Rendu des paragraphes Markdown légers : `**gras**`, `_italique_`, citations, sauts de ligne. Utilisé dans le lecteur et les aperçus.

### `PlumeTabBar`

Barre d'onglets personnalisée à cinq entrées. Icônes vectorielles, libellé, état actif or. Respecte les zones sûres.

### `Misc`

Petits éléments : badge, séparateur, état vide, indicateur de chargement, avatar à motif.

---

## 6. Mouvement

| Jeton | Durée | Usage |
| --- | --- | --- |
| `fast` | 140 ms | Pression, changement d'état |
| `normal` | 240 ms | Apparition de carte, onglet |
| `slow` | 420 ms | Transition d'écran |
| `ceremonial` | 720 ms | Ouverture d'une histoire, rare |

Règles :

- Pas d'animation en boucle.
- Pas de parallaxe.
- `reduceMotion` désactive les translations et les fondus longs ; les changements d'état restent instantanés.
- Aucune animation ne doit bloquer une action.

---

## 7. Iconographie

- Bibliothèque : `@expo/vector-icons` (jeu Feather ou Ionicons selon le contexte).
- Trait fin, taille 20–24 px, couleur sémantique.
- Les icônes ne remplacent jamais un libellé pour une action primaire.
- Les icônes décoratives sont masquées aux lecteurs d'écran.

---

## 8. Thèmes de lecture

Trois thèmes, définis dans `readingThemes` :

| Thème | Fond | Surface | Texte | Accent |
| --- | --- | --- | --- | --- |
| Nuit | `#0E1420` | `#17202F` | `#E9E0CF` | `#C5A46A` |
| Sépia | `#EDE0C4` | `#F5EAD5` | `#3A2E24` | `#8C6B3E` |
| Ivoire | `#FAF5EA` | `#FFFBF2` | `#2A211B` | `#8C6B3E` |

Contrastes :

- Nuit : texte 14,06:1 ; secondaire 6,81:1.
- Sépia : texte 10,06:1 ; secondaire 4,81:1.
- Ivoire : texte 14,50:1 ; secondaire 5,99:1.

Le thème de lecture est indépendant du thème de l'interface. Un auteur peut écrire en nuit et lire en sépia.

---

## 9. Accessibilité

- Cible tactile : **44 px minimum**, 48 px recommandé.
- Contraste : AA minimum pour tout texte porteur d'information.
- Taille : `fontScale` de 0,9 à 1,4, sans troncature des libellés.
- Focus visible : bordure `goldBright` de 2 px.
- Ordre de lecture logique.
- Pas d'information uniquement par la couleur : ajouter un libellé ou une icône.
- `accessibilityLabel` sur les boutons icône.
- `accessibilityRole` sur les éléments interactifs.
- Réduction des animations respectée.
- Le lecteur ne justifie pas le texte (évite les rivières et aide la dyslexie).

---

## 10. Ton visuel

### À faire

- Grands titres Playfair, corps Lora, interface Inter.
- Or en filet, bordure, petite icône, chiffre clé.
- Cartes avec beaucoup d'air.
- Photos absentes : couvertures procédurales, motifs, textures discrètes.
- Citations entre guillemets français « … », en Lora italique.

### À éviter

- Dégradés multicolores.
- Or en fond de bloc de texte.
- Ombres dures.
- Effets de verre dépoli partout.
- Emojis dans l'interface.
- Majuscules intégrales sur des phrases.
- Animations décoratives permanentes.

---

## 11. Exemples d'implémentation

```tsx
import { semantic, spacing, typography } from "@plume/shared";
import { Text } from "../components";

<Text variant="title">La Chambre des échos</Text>
<Text variant="literary">
  La maison n'avait pas de numéro. Les habitants disaient qu'elle avait refusé le sien.
</Text>
<Button variant="primary" onPress={save}>Enregistrer</Button>
```

Pour un composant nécessitant le thème courant :

```tsx
const theme = useTheme();
<View style={{ backgroundColor: theme.surface, borderColor: theme.border }} />
```

---

## 12. Limites connues

- Le rendu réel sur appareil Android n'a pas été vérifié dans cet environnement (pas de SDK natif).
- La version web se compile, mais n'a pas été inspectée visuellement.
- Les contrastes sont calculés à partir des jetons ; ils ne remplacent pas un audit sur appareil (luminosité, mode sombre système, dalles OLED).
- Les polices sont chargées via Google Fonts au démarrage ; un écran de chargement est prévu, mais son rendu n'a pas été validé sur appareil.

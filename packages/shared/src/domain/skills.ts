export type SkillId =
  | "characters"
  | "dialogues"
  | "tension"
  | "descriptions"
  | "pacing"
  | "structure"
  | "foreshadowing";

export interface SkillDefinition {
  id: SkillId;
  order: number;
  name: string;
  tagline: string;
  description: string;
  focusPoints: string[];
  /** Question que l'auteur peut se poser seul, sans IA. */
  selfCheck: string;
  workshopSlug: string;
}

export const SKILLS: SkillDefinition[] = [
  {
    id: "characters",
    order: 1,
    name: "Personnages",
    tagline: "Des êtres qui désirent, résistent et changent.",
    description:
      "Un personnage crédible n'est pas une liste de traits : c'est un système de désirs, de peurs et de contradictions qui produit des décisions. Travailler les personnages consiste à rendre leurs choix nécessaires et surprenants à la fois.",
    focusPoints: [
      "Motivations lisibles et parfois conflictuelles",
      "Cohérence psychologique dans l'action",
      "Relations qui révèlent des facettes différentes",
      "Évolution progressive, jamais décrétée",
      "Voix et regard propres à chaque personnage",
    ],
    selfCheck:
      "Si je supprime son objectif principal, mon personnage prend-il encore des décisions qui lui ressemblent ?",
    workshopSlug: "construire-des-personnages",
  },
  {
    id: "dialogues",
    order: 2,
    name: "Dialogues",
    tagline: "Ce que les personnages ne disent pas.",
    description:
      "Un dialogue fort ne transmet pas seulement de l'information : il met en scène des volontés qui se rencontrent, se frottent ou se mentent. Le sous-texte naît de l'écart entre ce qui est dit et ce qui est poursuivi.",
    focusPoints: [
      "Objectifs cachés derrière les mots",
      "Voix différenciées et rythme oral",
      "Exposition intégrée plutôt que récitée",
      "Silences, esquives et interruptions utiles",
      "Équilibre entre dialogue et narration",
    ],
    selfCheck:
      "Que veut chaque personnage dans cette scène, et qu'est-ce qui l'empêche de le dire franchement ?",
    workshopSlug: "ecrire-des-dialogues",
  },
  {
    id: "tension",
    order: 3,
    name: "Tension narrative",
    tagline: "L'écart entre ce qui est et ce qui pourrait être.",
    description:
      "La tension ne dépend pas du bruit ni du danger : elle naît d'un enjeu compris, d'une incertitude entretenue et d'un coût possible. Une scène calme peut être plus tendue qu'une bataille si le lecteur sait ce qui peut être perdu.",
    focusPoints: [
      "Enjeux personnels et concrets",
      "Obstacles qui obligent à choisir",
      "Information retenue au bon moment",
      "Conséquences possibles et irréversibles",
      "Relance après chaque résolution partielle",
    ],
    selfCheck:
      "Qu'est-ce que mon personnage peut perdre dans cette scène, et pourquoi le lecteur devrait-il s'en soucier maintenant ?",
    workshopSlug: "creer-de-la-tension",
  },
  {
    id: "descriptions",
    order: 4,
    name: "Descriptions",
    tagline: "Faire voir, sentir, et surtout ressentir.",
    description:
      "Une description juste n'est pas une description complète. Elle sélectionne les détails qui comptent pour le regard, l'état intérieur ou la situation du personnage, et les intègre au mouvement de la scène.",
    focusPoints: [
      "Détails spécifiques plutôt qu'adjectifs génériques",
      "Sensorialité au service de l'émotion",
      "Point de vue incarné",
      "Dosage et placement dans l'action",
      "Effets sur le rythme et l'atmosphère",
    ],
    selfCheck:
      "Quel détail, et quel seul détail, mon personnage remarquerait-il ici parce qu'il est celui qu'il est ?",
    workshopSlug: "maitriser-les-descriptions",
  },
  {
    id: "pacing",
    order: 5,
    name: "Rythme",
    tagline: "La respiration du récit.",
    description:
      "Le rythme résulte de la longueur des phrases, de la densité des scènes, des transitions et de la quantité d'information donnée. Il ne s'agit pas d'aller vite, mais de varier la pression pour que le lecteur ait envie de continuer.",
    focusPoints: [
      "Alternance scène / résumé / ellipse",
      "Longueur des séquences et transitions",
      "Moments de respiration signifiants",
      "Répétitions et tics de rythme",
      "Accélérations motivées par l'enjeu",
    ],
    selfCheck:
      "Où mon lecteur reprend-il son souffle, et cette pause lui donne-t-elle envie de tourner la page ?",
    workshopSlug: "travailler-le-rythme",
  },
  {
    id: "structure",
    order: 6,
    name: "Structure",
    tagline: "Des causes, pas seulement des événements.",
    description:
      "Une histoire tient parce que chaque scène modifie la situation et rend la suivante nécessaire. La structure n'est pas un moule : c'est la logique des conséquences, des engagements et des seuils franchis.",
    focusPoints: [
      "Progression dramatique lisible",
      "Causalité entre les scènes",
      "Mise en place et développement des enjeux",
      "Arcs qui se répondent",
      "Résolution qui paie les promesses",
    ],
    selfCheck:
      "Si je retire cette scène, qu'est-ce qui devient incompréhensible ou moins inévitable dans la suivante ?",
    workshopSlug: "structurer-une-histoire",
  },
  {
    id: "foreshadowing",
    order: 7,
    name: "Préparation narrative",
    tagline: "Semer sans montrer la main.",
    description:
      "Préparer une révélation, c'est offrir au lecteur des indices suffisants pour qu'il puisse relire avec plaisir, sans lui donner la réponse trop tôt. Le bon indice est justifié dans la scène avant de devenir signifiant plus tard.",
    focusPoints: [
      "Indices discrets mais vérifiables",
      "Promesses narratives explicites ou implicites",
      "Retournements préparés par les personnages",
      "Éléments introduits puis réellement payés",
      "Relecture récompensée",
    ],
    selfCheck:
      "Quel détail de cette scène paraîtra anodin maintenant et évident après la révélation ?",
    workshopSlug: "preparer-les-revelations",
  },
];

export const SKILL_BY_ID: Record<SkillId, SkillDefinition> = Object.fromEntries(
  SKILLS.map((skill) => [skill.id, skill]),
) as Record<SkillId, SkillDefinition>;

export const SKILL_IDS = SKILLS.map((s) => s.id);

/** Niveaux pédagogiques (jamais présentés comme une note littéraire absolue). */
export type SkillLevel = "decouverte" | "apprenti" | "confirme" | "expert";

export const SKILL_LEVELS: Record<
  SkillLevel,
  { label: string; min: number; description: string }
> = {
  decouverte: {
    label: "Découverte",
    min: 0,
    description: "Les bases sont identifiées ; l'attention est encore intermittente.",
  },
  apprenti: {
    label: "Apprenti",
    min: 40,
    description: "Les principes sont compris et appliqués avec un accompagnement.",
  },
  confirme: {
    label: "Confirmé",
    min: 65,
    description: "Les choix sont conscients, réguliers et adaptés au projet.",
  },
  expert: {
    label: "Expert",
    min: 85,
    description: "La compétence est maîtrisée et mise au service d'une intention.",
  },
};

export function levelForScore(score: number): SkillLevel {
  if (score >= 85) return "expert";
  if (score >= 65) return "confirme";
  if (score >= 40) return "apprenti";
  return "decouverte";
}

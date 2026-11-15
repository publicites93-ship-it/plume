import type { WritingPrompt } from "./types";

export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: "personnages-trait-herite",
    text: "Dans une maison louée au bord d'un lac gelé, un personnage s'aperçoit qu'il répète un geste de son père qu'il méprisait. Écrivez l'instant exact où il le remarque, sans nommer le père ni expliquer l'héritage.",
    skillId: "characters",
    minutes: 10,
  },
  {
    id: "personnages-adversaire-intime",
    text: "Deux amants veulent des choses incompatibles : l'un rester, l'autre partir avant l'hiver. Écrivez une scène où aucun ne cède, et où pourtant l'un des deux finit par choisir.",
    skillId: "characters",
    minutes: 15,
  },
  {
    id: "dialogues-aveu-differe",
    text: "Dans une sacristie, après la dernière messe, une conversation de six répliques où l'un veut avouer et l'autre l'en empêche sans le savoir. L'aveu ne doit jamais être prononcé.",
    skillId: "dialogues",
    minutes: 8,
  },
  {
    id: "dialogues-voix-sans-noms",
    text: "Trois veilleuses de nuit se partagent un couloir d'hôpital. Écrivez leur échange sans aucune indication d'attribution : la syntaxe seule doit distinguer les voix.",
    skillId: "dialogues",
    minutes: 12,
  },
  {
    id: "tension-objet-deplace",
    text: "Dans une salle à manger bourgeoise, un couvert a été déplacé. Personne ne mentionne l'objet, mais chacun le remarque. Faites monter la gêne sans accident ni éclat.",
    skillId: "tension",
    minutes: 10,
  },
  {
    id: "tension-annonce-impossible",
    text: "Un personnage doit annoncer une rupture à quelqu'un qui ne l'écoute pas. Chaque tentative échoue pour une raison différente, de plus en plus coûteuse.",
    skillId: "tension",
    minutes: 12,
  },
  {
    id: "descriptions-apres-la-nouvelle",
    text: "Décrivez une pièce que vous connaissez bien, vue par quelqu'un qui vient d'apprendre une mauvaise nouvelle. Trois détails, pas un de plus.",
    skillId: "descriptions",
    minutes: 7,
  },
  {
    id: "descriptions-sans-la-vue",
    text: "Faites entrer un personnage dans un lieu uniquement par l'odeur et le toucher, sans jamais nommer la pièce ni sa fonction.",
    skillId: "descriptions",
    minutes: 8,
  },
  {
    id: "pacing-lettre-brulee",
    text: "Racontez le même événement — une lettre qu'on brûle — en trois versions : une page, un paragraphe, une phrase. Conservez le même point de vue.",
    skillId: "pacing",
    minutes: 15,
  },
  {
    id: "pacing-salle-attente",
    text: "Dans un salon d'attente, un personnage s'assoit et attend une réponse. À la fin de la scène, il doit avoir pris une décision qu'il n'avait pas en s'asseyant.",
    skillId: "pacing",
    minutes: 10,
  },
  {
    id: "structure-option-qui-se-ferme",
    text: "Repérez une scène de votre projet où il ne se passe rien, puis transformez-la pour qu'une option s'y ferme définitivement. Une seule modification doit suffire.",
    skillId: "structure",
    minutes: 20,
  },
  {
    id: "foreshadowing-deux-appuis",
    text: "Écrivez une scène d'ouverture dans un manoir loué pour l'été, avec deux détails qui prendront un autre sens au chapitre suivant. Ne les commentez jamais.",
    skillId: "foreshadowing",
    minutes: 12,
  },
];

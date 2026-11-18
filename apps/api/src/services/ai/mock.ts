import { SKILLS, SKILL_BY_ID, WORKSHOP_BY_SLUG, countWords, type SkillId } from "@plume/shared";
import type {
  AIProvider,
  AnalysisDraft,
  AnalysisFindingDraft,
  AnalysisProviderInput,
  CoachChatDraft,
  CoachChatProviderInput,
  ExerciseReviewDraft,
  ExerciseReviewProviderInput,
  StoryAnalysisDraft,
  StoryAnalysisProviderInput,
  StudioExtractionDraft,
  StudioExtractionInput,
} from "./provider";

/**
 * Fournisseur de DÉMONSTRATION, déterministe et hors ligne.
 *
 * Il ne prétend pas produire une analyse littéraire réelle : ses constats sont
 * construits à partir de règles observables (longueur, ponctuation, champs
 * lexicaux) et TOUTES ses citations sont vérifiées contre le manuscrit.
 * Le champ `isSimulation` et le résumé le signalent explicitement à l'auteur.
 */
export class MockPedagogicalProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "plume-mock-pedagogue-v1";

  async analyzeChapter(input: AnalysisProviderInput): Promise<AnalysisDraft> {
    const text = input.manuscript.trim();
    const sentences = extractSentences(text);
    const words = countWords(text);
    const skill = SKILL_BY_ID[input.skill];
    const workshop = WORKSHOP_BY_SLUG[skill.workshopSlug];
    const exerciseTitle = workshop?.exercises[0]?.title ?? "Exercice d'observation";

    const dialogueLines = (text.match(/(^|\n)\s*[—–-]\s+/g) ?? []).length;
    const sensoryWords = (
      text.match(
        /\b(odeur|parfum|froid|chaud|lumière|ombre|voix|souffle|peau|main|regard|goût|cire|papier|pluie|vent|silence)\b/gi,
      ) ?? []
    ).length;
    const weakAdverbs = (text.match(/\b(très|vraiment|soudain|tellement|assez|beaucoup)\b/gi) ?? [])
      .length;

    const primaryQuote =
      pickQuote(sentences, sensoryWords > 0 ? /odeur|froid|lumière|ombre|voix|peau|main|regard|pluie|vent|silence/i : null) ??
      pickQuote(sentences, null) ??
      firstSlice(text);
    const secondaryQuote =
      pickQuote(sentences, /très|vraiment|soudain|tellement|était|fut|avait/i, primaryQuote) ??
      pickQuote(sentences, null, primaryQuote) ??
      primaryQuote;
    const questionQuote =
      pickQuote(sentences, /\?/, primaryQuote) ??
      pickQuote(sentences, null, primaryQuote) ??
      secondaryQuote;

    const score = clamp(
      48 +
        Math.min(16, Math.floor(words / 120)) +
        (dialogueLines > 2 ? 5 : 0) +
        (sensoryWords > 4 ? 5 : 0) -
        (weakAdverbs > 4 ? 4 : 0),
      35,
      78,
    );

    const findings: AnalysisFindingDraft[] = [
      {
        kind: "strength",
        title: `Une matière concrète pour travailler ${skill.name.toLowerCase()}`,
        observation:
          "Le passage fournit des appuis sensibles et des décisions situées, ce qui permet au lecteur de reconstruire la scène sans explication ajoutée.",
        quote: primaryQuote,
        explanation: skillExplanation(input.skill, "strength"),
        impact:
          "Le lecteur dispose de repères corporels et matériels : il peut s'orienter dans la scène et prêter attention aux enjeux plutôt qu'aux explications.",
        priority: "low",
        confidence: 0.38,
        recommendation: null,
        exercise: null,
      },
      {
        kind: "strength",
        title: "Un seuil narratif identifiable",
        observation:
          "Le passage contient au moins un moment où une information ou une décision fait basculer la situation.",
        quote: secondaryQuote,
        explanation:
          "Un récit progresse lorsque quelque chose devient différent à cause d'un choix, d'une révélation ou d'un obstacle. Ici, le texte ménage un avant et un après perceptibles.",
        impact:
          "Le lecteur peut formuler ce qui a changé, ce qui donne au chapitre une fonction dans l'ensemble plutôt qu'un simple effet d'ambiance.",
        priority: "low",
        confidence: 0.34,
        recommendation: null,
        exercise: null,
      },
      {
        kind: "improvement",
        title: `Rendre ${skill.name.toLowerCase()} plus lisible dans l'action`,
        observation:
          "Le passage alterne des moments d'information et des moments d'action ; le lien de causalité entre les deux pourrait être rendu plus explicite par un geste ou une conséquence concrète.",
        quote: secondaryQuote,
        explanation: skillExplanation(input.skill, "improvement"),
        impact:
          "Si le lien causal reste implicite, le lecteur peut comprendre l'ambiance mais ne pas saisir pourquoi cette information compte maintenant pour le personnage.",
        priority: "medium",
        confidence: 0.36,
        recommendation:
          "Choisissez un geste ou une décision du personnage et faites-la dépendre directement de l'information donnée. Relisez ensuite la scène en supprimant l'explication : l'enchaînement doit rester compréhensible.",
        exercise: exerciseTitle,
      },
      {
        kind: "improvement",
        title: "Varier la pression plutôt que l'intensité",
        observation:
          "La scène maintient un niveau d'attention assez constant. Une respiration plus nette — un ralentissement, puis une accélération motivée — donnerait davantage de relief au moment important.",
        quote: primaryQuote,
        explanation: skillExplanation(input.skill, "pacing"),
        impact:
          "Une intensité continue finit par devenir un bruit de fond. Le lecteur s'habitue et le seuil de vigilance monte, ce qui affaiblit l'effet du point culminant.",
        priority: "medium",
        confidence: 0.33,
        recommendation:
          "Repérez la phrase la plus importante du passage. Allongez légèrement la phrase qui la précède, puis raccourcissez celle qui la suit. Lisez à voix haute pour vérifier la respiration.",
        exercise: workshop?.exercises[1]?.title ?? exerciseTitle,
      },
      {
        kind: "question",
        title: "Un choix stylistique ou un flou involontaire ?",
        observation:
          "Certaines formulations peuvent être lues comme une volonté de style ou comme une hésitation du point de vue. La distinction mérite d'être tranchée par l'auteur.",
        quote: questionQuote,
        explanation:
          "Tout diagnostic littéraire comporte une part d'interprétation. Une phrase elliptique peut produire une atmosphère voulue ; la même phrase peut aussi empêcher le lecteur de savoir qui perçoit quoi. La question n'est pas de corriger, mais de vérifier l'intention.",
        impact:
          "Clarifier l'intention permet de conserver les effets voulus et de retravailler uniquement les endroits où le lecteur risque de sortir de la scène.",
        priority: "low",
        confidence: 0.3,
        recommendation:
          "Écrivez en marge, en une phrase, ce que vous voulez que le lecteur comprenne ou ressente ici. Si le passage le fait déjà, conservez-le. Sinon, modifiez un seul élément et comparez.",
        exercise: null,
      },
    ];

    return {
      summary: `Simulation pédagogique locale — aucun modèle IA externe n'a été appelé. Lecture simulée de « ${input.chapterTitle} » (${words.toLocaleString(
        "fr-FR",
      )} mots) selon la compétence « ${skill.name} ». Les constats sont des hypothèses de travail à confronter à votre intention, pas une note de valeur littéraire.`,
      score,
      confidence: 0.35,
      findings,
      provider: this.name,
      model: this.model,
      inputTokens: Math.ceil(text.length / 4),
      outputTokens: 850,
      isSimulation: true,
    };
  }

  async analyzeStory(input: StoryAnalysisProviderInput): Promise<StoryAnalysisDraft> {
    const analyses = await Promise.all(
      SKILLS.map(async (skill) => {
        const draft = await this.analyzeChapter({
          skill: skill.id,
          manuscript: input.manuscript,
          chapterTitle: input.chapterTitle,
          storyTitle: input.storyTitle,
          scope: "chapter",
        });
        return {
          skill: skill.id,
          summary: draft.summary,
          score: draft.score,
          confidence: draft.confidence,
          findings: draft.findings,
        };
      }),
    );
    return {
      analyses,
      provider: this.name,
      model: this.model,
      inputTokens: Math.ceil(input.manuscript.length / 4) * SKILLS.length,
      outputTokens: 850 * SKILLS.length,
      isSimulation: true,
    };
  }

  async coachReply(input: CoachChatProviderInput): Promise<CoachChatDraft> {
    if (/(ré[ée]cris|ré[ée]crire|génère|invente|écris (moi|le|la|un|une)|remplace)/i.test(input.message)) {
      return {
        reply:
          "Je ne réécris pas vos passages : ce serait vous priver du travail qui fait progresser. En revanche, je peux vous aider à voir ce qui produit l'effet recherché, puis vous proposer une contrainte d'écriture pour le retravailler vous-même. Quel effet voulez-vous que le lecteur ressente à cet endroit ?",
        citations: [],
        provider: this.name,
        model: this.model,
        inputTokens: 600,
        outputTokens: 120,
        isSimulation: true,
      };
    }
    const evidence = input.evidence[0];
    const quote = evidence?.quote ?? null;
    const reply = [
      `Simulation pédagogique locale — aucun modèle IA externe n'a été appelé. Je m'appuie sur votre dernier diagnostic${input.chapterTitle ? ` du chapitre « ${input.chapterTitle} »` : ""}.`,
      evidence
        ? `Le constat le plus utile me semble être : ${evidence.observation}`
        : "Je n'ai pas encore de constat vérifié sur cette histoire. Lancez d'abord un diagnostic depuis l'onglet Coach.",
      quote
        ? `Le passage qui appuie cette observation est : « ${quote} ».`
        : "Je ne retrouve pas de citation vérifiable : je préfère ne pas en inventer.",
      evidence?.recommendation
        ? `Méthode proposée : ${evidence.recommendation}`
        : "Méthode proposée : relisez la scène en notant, pour chaque paragraphe, ce qui change pour le personnage.",
      "Je ne toucherai pas à votre texte. Quelle phrase de votre scène porte le plus l'intention que vous voulez transmettre ?",
    ].join("\n\n");
    return {
      reply,
      citations: quote ? [quote] : [],
      provider: this.name,
      model: this.model,
      inputTokens: 800,
      outputTokens: Math.ceil(reply.length / 4),
      isSimulation: true,
    };
  }

  /**
   * Simulation locale : repère les noms propres (majuscule hors début de phrase)
   * et cite la phrase où ils apparaissent. Aucune autre information n'est inventée.
   */
  async extractStudioMemory(input: StudioExtractionInput): Promise<StudioExtractionDraft> {
    const sentences = extractSentences(input.chapterText);
    const known = new Map<string, string>();
    for (const character of input.knownCharacters) {
      known.set(character.name.toLowerCase(), character.name);
      for (const alias of character.aliases) known.set(alias.toLowerCase(), character.name);
    }
    const found = new Map<string, string>();
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).slice(1);
      for (const raw of words) {
        const word = raw.replace(/[^\p{L}'’-]/gu, "");
        if (word.length < 3 || !/^\p{Lu}\p{Ll}/u.test(word)) continue;
        const name = known.get(word.toLowerCase()) ?? word;
        if (!found.has(name)) found.set(name, sentence);
      }
    }
    return {
      characters: [...found.entries()].map(([name, quote]) => ({
        name,
        aliases: [],
        facts: [{ field: "firstAppearance", value: input.chapterTitle, quote }],
      })),
      locations: [],
      relations: [],
      events: [],
      provider: this.name,
      model: this.model,
      inputTokens: 0,
      outputTokens: 0,
      isSimulation: true,
    };
  }

  async reviewExercise(input: ExerciseReviewProviderInput): Promise<ExerciseReviewDraft> {
    const words = countWords(input.content);
    const feedback =
      words < 30
        ? `Simulation pédagogique locale. Votre essai compte ${words} mots : il est trop court pour une correction fiable. Développez une scène concrète en suivant la consigne « ${input.instructions} », puis demandez une nouvelle correction.`
        : `Simulation pédagogique locale. Votre essai de ${words} mots répond en partie à l'exercice « ${input.exerciseTitle} ». La correction ci-dessous s'appuie uniquement sur ce que vous avez écrit ; aucun texte n'a été réécrit.`;
    return {
      feedback,
      strengths: [
        "Vous avez produit un texte personnel et identifiable.",
        "L'essai peut être confronté aux critères de l'atelier.",
      ],
      improvements: [
        words < 30
          ? "Développez davantage pour que les critères puissent être observés."
          : "Vérifiez chaque critère de l'atelier et notez celui qui reste le moins visible.",
        "Relisez à voix haute pour repérer une phrase dont la fonction narrative reste floue.",
      ],
      nextStep:
        "Choisissez un seul critère, modifiez un seul élément, puis demandez une nouvelle correction pour comparer.",
      score: words < 30 ? null : Math.min(80, 42 + Math.min(30, Math.floor(words / 20))),
      confidence: words < 30 ? 0.2 : 0.35,
      provider: this.name,
      model: this.model,
      inputTokens: Math.ceil(input.content.length / 4) + 400,
      outputTokens: 260,
      isSimulation: true,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25 && sentence.length <= 280);
}

function pickQuote(
  sentences: string[],
  pattern: RegExp | null,
  exclude?: string | null,
): string | null {
  const candidates = sentences.filter((s) => s !== exclude);
  if (candidates.length === 0) return null;
  if (pattern) {
    const match = candidates.find((s) => pattern.test(s));
    if (match) return match;
  }
  return candidates[0] ?? null;
}

function firstSlice(text: string): string | null {
  const slice = text.slice(0, 180).trim();
  return slice.length >= 8 ? slice : null;
}

function skillExplanation(skill: SkillId, mode: "strength" | "improvement" | "pacing"): string {
  const explanations: Record<SkillId, { strength: string; improvement: string; pacing: string }> = {
    characters: {
      strength:
        "Un personnage devient crédible lorsque ses désirs et ses peurs produisent des décisions visibles. Le passage laisse deviner un système de motivations plutôt qu'une liste de traits.",
      improvement:
        "Une motivation reste abstraite tant qu'elle ne modifie pas un choix immédiat. Le lecteur comprend mieux un personnage lorsqu'il voit le coût d'une décision, même petite.",
      pacing:
        "Le rythme d'une scène de personnage dépend de la pression exercée sur son désir. Alterner révélation et résistance évite que la psychologie ne se transforme en commentaire.",
    },
    dialogues: {
      strength:
        "Un dialogue fonctionne lorsque chaque réplique poursuit un objectif et que l'écart entre ce qui est dit et ce qui est voulu crée du sous-texte.",
      improvement:
        "Quand les personnages énoncent exactement ce qu'ils pensent, le dialogue devient une transmission d'information. Une esquive, une question détournée ou un silence peut porter davantage.",
      pacing:
        "Les répliques courtes accélèrent, les répliques longues ralentissent. La variation doit suivre la pression de la scène, non une recherche de réalisme oral absolu.",
    },
    tension: {
      strength:
        "La tension naît d'un enjeu compris et d'une incertitude entretenue. Le passage installe une attente que le lecteur peut formuler.",
      improvement:
        "Un danger annoncé mais sans coût personnel reste décoratif. Relier l'obstacle à ce que le personnage peut perdre concrètement rend l'incertitude active.",
      pacing:
        "La tension respire : une accalmie permet au lecteur de mesurer ce qui est en jeu avant la relance. Sans pause, l'urgence devient une tonalité uniforme.",
    },
    descriptions: {
      strength:
        "Une description incarnée sélectionne les détails que le personnage remarquerait, et les fait entrer dans l'action plutôt que de les suspendre.",
      improvement:
        "L'accumulation d'adjectifs génériques dilue l'image. Un détail spécifique, lié à l'état intérieur ou au conflit du moment, produit souvent plus d'effet que trois phrases d'inventaire.",
      pacing:
        "La description ralentit naturellement. Placée au mauvais moment, elle retarde une décision ; intégrée à un geste, elle peut au contraire accélérer la compréhension.",
    },
    pacing: {
      strength:
        "Le passage fait varier la longueur des phrases et la densité des informations, ce qui donne une respiration au texte.",
      improvement:
        "Une succession de phrases de même longueur crée une monotonie indépendante du contenu. La variation doit servir l'émotion ou l'action, pas décorer.",
      pacing:
        "Le rythme se juge à l'échelle de la scène : entrée, montée, seuil, sortie. Si chaque paragraphe a la même pression, le lecteur ne sait plus où regarder.",
    },
    structure: {
      strength:
        "Une scène structurée modifie la situation : elle produit une conséquence qui rend la suivante nécessaire.",
      improvement:
        "Une scène peut être belle et pourtant supprimable si elle n'engage rien. Vérifier sa fonction — révéler, décider, empêcher, retourner — aide à la rendre indispensable.",
      pacing:
        "La structure se ressent dans le rythme des engagements : promesse, retard, paiement. Un paiement trop rapide éteint l'attente ; trop tardif, il la fatigue.",
    },
    foreshadowing: {
      strength:
        "Un indice efficace est justifié dans la scène avant de devenir signifiant plus tard. Le lecteur peut le relire sans sentir une ficelle.",
      improvement:
        "Un indice trop appuyé annonce la révélation ; trop discret, il devient invisible. L'équilibre consiste à lui donner une fonction immédiate (objet, geste, détail) et une résonance différée.",
      pacing:
        "Les promesses narratives ont besoin d'être rappelées à intervalles irréguliers. Un rappel trop fréquent transforme l'indice en panneau ; trop rare, il sort de la mémoire du lecteur.",
    },
  };
  return explanations[skill][mode];
}

import type { Workshop } from "./types";

export const WORKSHOPS: Workshop[] = [
  {
    slug: "construire-des-personnages",
    skillId: "characters",
    title: "Construire des personnages",
    subtitle: "Des désirs qui coûtent, des contradictions qui décident",
    introduction:
      "Un personnage ne devient mémorable ni par sa fiche d'état civil ni par ses goûts décoratifs, mais par la manière dont ses désirs entrent en collision avec le monde. Cet atelier propose de le construire à partir de ses décisions, de ses contradictions et de ce qu'il est prêt à perdre. Vous travaillerez sur des scènes courtes, car c'est là que la psychologie se vérifie.",
    theory: [
      {
        title: "Le désir se mesure à ce qu'il coûte",
        body:
          "Un personnage commence à exister quand il veut quelque chose d'assez précis pour orienter ses gestes. « Elle veut être heureuse » ne produit aucune scène ; « elle veut récupérer la lettre avant que son frère ne l'ouvre » en produit une immédiatement, parce que le désir a un objet, un délai et un adversaire. Le désir utile est daté et localisé : il se manifeste dans les dix prochaines minutes, pas dans une vie entière. Il faut aussi distinguer ce que le personnage réclame et ce qu'il cherche réellement. Une restauratrice de tableaux peut exiger la reconnaissance d'un musée tout en cherchant à prouver qu'elle vaut mieux que sa mère. Le premier objectif fabrique l'intrigue ; le second fabrique la profondeur. Quand les deux se contredisent, vous tenez une scène. Enfin, mesurez le désir à son prix : ce que le personnage sacrifie pour l'atteindre révèle sa hiérarchie de valeurs mieux que n'importe quelle déclaration.",
      },
      {
        title: "La contradiction n'est pas l'incohérence",
        body:
          "Un personnage contradictoire n'agit pas au hasard : il obéit à deux exigences incompatibles, et chacune a sa logique. Une archiviste loyale découvre que sa famille a falsifié des actes de propriété ; sa loyauté et sa probité ne peuvent pas gagner ensemble. La contradiction devient dramatique au moment où elle doit choisir, pas avant. Il faut donc éviter deux pièges symétriques : le personnage purement rationnel, dont les décisions se déduisent comme un calcul, et le personnage imprévisible, dont les revirements servent seulement à surprendre. Dans les deux cas, le lecteur cesse de croire aux conséquences. Une bonne méthode consiste à écrire la scène deux fois, en laissant d'abord gagner un penchant, puis l'autre, et à comparer ce que chaque version coûte au personnage. Celle qui lui arrache quelque chose est généralement la bonne. La contradiction se prouve par le prix payé, jamais par une confession explicative.",
      },
      {
        title: "Le personnage existe dans le regard des autres",
        body:
          "On croit souvent construire un personnage en accumulant des traits : timide, généreux, aime le thé. Ces étiquettes informent peu, car elles ne disent pas comment la personne se comporte sous pression. Le personnage se révèle plutôt par trois canaux observables : la manière dont il traite ceux qui ne peuvent rien lui apporter, les objets qu'il garde et la façon dont il les manipule, et le récit que les autres font de lui. Un homme qui range les couverts de sa mère avant l'arrivée des invités, puis les remet en place après leur départ, raconte quelque chose que « sentimental » ne dirait pas. Le regard d'autrui ajoute une seconde couche : la même femme peut être décrite comme froide par son mari et comme protectrice par sa fille. Ces versions ne s'annulent pas, elles composent un volume. Attention toutefois : un trait distinctif n'est utile que s'il entre dans l'action. Un tic qui ne coûte rien à personne reste une décoration.",
      },
    ],
    examples: [
      {
        title: "La lettre sous la porte",
        text:
          "Marguerite posa la bougie sur le palier et ramassa l'enveloppe. Le cachet était intact, l'écriture penchée, celle de son frère. Elle la glissa dans sa manche sans l'ouvrir, puis descendit les marches deux à deux, comme si la maison pouvait la rappeler. En bas, la concierge balayait. Marguerite lui souhaita le bonsoir, s'attarda sur la pluie, demanda des nouvelles de sa fille. Elle ne reprit son souffle qu'à la troisième rue, sous l'auvent d'une boutique fermée. Alors seulement elle sortit la lettre, la tint contre la vitre éclairée, et lut à travers le papier ce qu'elle pouvait en lire.",
        commentary:
          "Le désir est clair sans être nommé : Marguerite veut savoir sans être vue en train de savoir. Chaque geste — cacher la lettre, ralentir, parler météo — est une décision qui coûte, et le lecteur comprend qu'elle craint moins le contenu que le fait d'être surprise. L'objet, la lumière et la vitre font le travail que ferait une explication psychologique. Notez que rien n'est dit de son passé : la tension vient uniquement de la manière dont elle gère l'attente.",
      },
      {
        title: "Le couteau de la cuisine",
        text:
          "— Tu veux que je le fasse ? demanda Paul.\nIl tenait le couteau par le manche, lame vers le bas, comme on tient un outil et non une arme.\n— Non, dit Hélène. Je m'en occupe.\nElle prit le couteau, le rinça, l'essuya, le rangea dans le tiroir du haut. Puis elle se lava les mains, longtemps, et Paul comprit qu'elle ne le laisserait pas partir ce soir. Il n'y avait eu ni éclat ni menace. Seulement ce geste de ranger, qui fermait la maison.",
        commentary:
          "La scène ne dit pas la peur : elle la fabrique par un contraste de gestes. Paul propose, Hélène refuse et range, et ce rangement devient une décision qui enferme. Le couteau change trois fois de fonction — outil, menace possible, objet domestique — sans qu'aucune phrase ne commente. Le lecteur peut reconstruire l'enjeu du couple à partir de la seule chorégraphie des mains. C'est le type de détail qui rend un personnage crédible : il agit selon sa logique, même quand cette logique inquiète.",
      },
    ],
    commonMistakes: [
      {
        mistake: "La fiche de personnage qui ne sert jamais",
        why:
          "Les traits, les goûts et le passé restent dans un document séparé ; dans les scènes, le personnage n'est qu'une silhouette qui transporte l'intrigue. Le lecteur ne peut pas vérifier ce qu'on lui affirme.",
        fix:
          "Pour chaque trait noté, écrivez un geste ou une décision qui le prouve dans une scène précise. Supprimez les traits qui n'ont pas de preuve.",
      },
      {
        mistake: "Le personnage réagit selon les besoins de l'auteur",
        why:
          "Il accepte une mission parce qu'il faut relancer l'intrigue, se fâche parce qu'il faut un conflit. Les décisions cessent d'être prévisibles, donc les conséquences perdent leur poids.",
        fix:
          "Avant d'écrire la scène, notez ce que le personnage veut, ce qu'il craint et ce qu'il ignore. Si la décision prévue contredit l'un des trois, changez la décision, pas le personnage.",
      },
      {
        mistake: "Le tic remplace la psychologie",
        why:
          "Un détail répété — se ronger les ongles, boire du gin — devient une étiquette commode ; il signale une émotion sans en montrer la cause ni le coût.",
        fix:
          "Faites varier le tic selon l'enjeu, ou opposez-le à un geste contraire. Demandez-vous ce que ce tic protège et ce qu'il empêche le personnage de faire.",
      },
    ],
    exercises: [
      {
        id: "personnages-choix-couteux",
        title: "Le choix qui coûte",
        objective:
          "Rendre visible la hiérarchie de valeurs d'un personnage par une décision concrète, sans commentaire psychologique.",
        instructions:
          "1. Choisissez un personnage et notez deux biens qu'il désire également : par exemple garder un emploi et protéger une sœur.\n2. Écrivez une scène de 250 mots où il ne peut conserver l'un qu'en abandonnant l'autre.\n3. Faites agir le personnage avant qu'il ne formule son dilemme : gestes, hésitations, objets manipulés.\n4. Terminez la scène sur la conséquence immédiate du choix, sans épilogue explicatif.\n5. Relisez et supprimez toute phrase qui explique ce que le personnage ressent.",
        criteria: [
          "Les deux biens sont identifiables dès les premiers gestes.",
          "Le choix est posé par une action, pas par une délibération commentée.",
          "La fin montre un coût concret, vérifiable dans la scène.",
          "Aucune phrase n'énonce la morale du choix.",
        ],
        durationMinutes: 25,
        observe:
          "Repérez le moment exact où le personnage penche pour une option. Est-il préparé par un détail antérieur, ou survient-il par commodité narrative ?",
      },
      {
        id: "personnages-objet-temoin",
        title: "L'objet témoin",
        objective:
          "Faire raconter un personnage par la manière dont il traite un objet, sans passer par la description de ses sentiments.",
        instructions:
          "1. Choisissez un objet ordinaire lié à une habitude : une tasse ébréchée, un trousseau de clés, un carnet.\n2. Écrivez trois courts paragraphes où le personnage manipule cet objet dans trois états différents : seul, en présence d'un proche, en présence d'un étranger.\n3. Conservez le même objet et le même lieu, mais changez la manière de le tenir, de le ranger ou de le cacher.\n4. N'employez aucun adjectif de caractère : pas de « soigneux », « nerveux », « sentimental ».",
        criteria: [
          "L'objet est le même dans les trois paragraphes.",
          "Le comportement change de façon lisible selon l'interlocuteur.",
          "Le texte évite les adjectifs de caractère.",
          "Le lecteur peut déduire au moins une tension intérieure.",
        ],
        durationMinutes: 20,
        observe:
          "Comparez les trois gestes : lequel contredit les deux autres ? C'est souvent là que se trouve la contradiction la plus intéressante.",
      },
      {
        id: "personnages-regard-croise",
        title: "Le regard croisé",
        objective:
          "Construire un personnage en volume, par deux perceptions incompatibles mais également crédibles.",
        instructions:
          "1. Inventez un personnage absent de la scène, mais dont on parle.\n2. Écrivez deux monologues de 150 mots : l'un d'un proche, l'autre d'une connaissance lointaine.\n3. Chaque narrateur doit décrire le même épisode avec des faits différents, sans mentir délibérément.\n4. Faites en sorte que les deux versions soient compatibles avec une même réalité.\n5. Terminez chaque monologue par un détail que l'autre ignore.",
        criteria: [
          "Les deux versions divergent sur des faits précis, pas seulement sur des opinions.",
          "Aucun des deux narrateurs n'est présenté comme fiable par le texte.",
          "Les deux récits peuvent coexister sans contradiction logique.",
          "Chaque monologue apporte une information que l'autre n'a pas.",
        ],
        durationMinutes: 30,
        observe:
          "Demandez-vous lequel des deux récits le lecteur croira spontanément, et pourquoi. Ce déséquilibre est un levier dramatique.",
      },
    ],
    manuscriptPrompt:
      "Choisissez une scène de votre manuscrit où un personnage secondaire reste flou, et réécrivez-la en lui donnant un désir daté et un prix à payer. Si la scène ne change pas, c'est que le personnage n'y avait pas sa place.",
  },
  {
    slug: "ecrire-des-dialogues",
    skillId: "dialogues",
    title: "Écrire des dialogues",
    subtitle: "Ce que les personnages ne disent pas",
    introduction:
      "Un dialogue fort ne transmet pas seulement de l'information : il met en scène des volontés qui se rencontrent, se frottent ou se mentent. Le sous-texte naît de l'écart entre ce qui est dit et ce qui est poursuivi. Cet atelier vous fait travailler la réplique comme une action, la voix comme une syntaxe, et le silence comme une réplique.",
    theory: [
      {
        title: "Une réplique est une action, pas un message",
        body:
          "Dans une scène dialoguée, chaque prise de parole cherche à produire un effet : obtenir, refuser, tester, blesser, se protéger. Si vous pouvez résumer une réplique par « elle donne une information », la scène perd sa nécessité. Une phrase comme « Il pleuvra demain » peut être une menace, une invitation à rester, ou un moyen de changer de sujet ; c'est le contexte d'action qui décide. Avant d'écrire, attribuez à chaque personnage un verbe d'action pour la scène entière : convaincre, retarder, obtenir un aveu. Puis, pour chaque réplique, demandez-vous si elle sert ce verbe ou le contrarie. Les échanges les plus vivants sont ceux où deux verbes incompatibles se rencontrent. Cela produit une autre conséquence utile : vous n'avez plus besoin de faire expliquer l'enjeu par un personnage, puisque les répliques le font exister par leurs effets.",
      },
      {
        title: "Le sous-texte naît d'un sujet évité",
        body:
          "Le sous-texte n'est pas une mystification : c'est la différence entre le sujet dont on parle et la question qui travaille les personnages. Deux sœurs discutent de la répartition des meubles ; en réalité, l'une demande si elle compte encore pour l'autre. Pour que cela fonctionne, il faut un sujet concret et crédible en surface, et une question que les personnages ne peuvent pas nommer — par pudeur, par peur, ou parce que la nommer les obligerait à agir. Le piège consiste à rendre le sous-texte trop lisible : si chaque réplique cligne de l'œil vers le lecteur, l'effet devient une devinette. À l'inverse, un sous-texte trop enfoui produit des dialogues abscons. Le bon réglage se vérifie à la relecture : le lecteur doit pouvoir comprendre la scène au premier degré, puis découvrir une seconde couche. Une réplique anodine bien placée vaut mieux qu'une allusion appuyée.",
      },
      {
        title: "La voix se travaille dans la syntaxe",
        body:
          "Deux personnages ne se distinguent pas seulement par leur vocabulaire, mais par la manière dont ils construisent leurs phrases. L'un parle par incidentes et se corrige sans cesse ; l'autre assène des infinitifs et refuse les subordonnées. Ces habitudes révèlent un rapport au risque, à l'autorité, au temps. Il faut cependant éviter la transcription phonétique des accents et des hésitations, qui ralentit la lecture sans ajouter de sens. Un « euh » isolé suffit ; trois par réplique font un procédé. Le test le plus fiable reste la lecture à voix haute : si vous devez reprendre votre souffle au milieu d'une réplique courte, la syntaxe ne correspond pas au personnage. Enfin, la voix se modifie sous pression. Un personnage qui parle par phrases longues et qui, à la fin de la scène, ne produit plus que des monosyllabes, raconte par sa syntaxe quelque chose que la narration n'a pas à expliquer.",
      },
    ],
    examples: [
      {
        title: "Les meubles",
        text:
          "— La commode te revient, dit Claire. C'est toi qui l'as cirée, l'été où papa est tombé.\n— Je ne veux pas de la commode.\n— Elle est trop lourde pour mon palier, de toute façon.\n— Alors mets-la dans l'entrée, tu la verras en passant.\nClaire rangea les tasses dans le carton, une par une, en les calant avec du papier journal.\n— Tu viendras à Noël ?\n— Je ne sais pas encore.\n— Je demandais, c'est tout. Ce n'est pas une convocation.",
        commentary:
          "La surface est un partage d'objets ; la question réelle est de savoir si les deux sœurs se reverront. Aucune ne la pose franchement : Claire la déguise en proposition logistique, l'autre en refus poli. Le geste des tasses, calées une à une, dit la tension que les mots évitent. Notez que la dernière réplique est une protestation contre une accusation que personne n'a formulée : le sous-texte affleure sans être expliqué, et c'est ce qui rend la scène douloureuse plutôt que démonstrative.",
      },
      {
        title: "Le témoin",
        text:
          "— Vous avez entendu quelque chose, cette nuit ?\n— La maison travaille. Les tuyaux, le vent.\n— À quelle heure ?\n— Je ne regarde pas l'heure. Je dors.\n— Vous dormiez ?\n— Je suis resté dans ma chambre.\nL'inspecteur tourna la page de son carnet sans écrire.\n— Vous avez dit « resté ». Pas « dormi ».\nLe vieil homme ajusta sa manche sur son poignet.\n— On dit ce qu'on veut bien dire, monsieur. Le reste, c'est pour la maison.",
        commentary:
          "Chaque réplique est une manœuvre : l'inspecteur cherche une contradiction, le témoin répond par des évidences qui protègent un espace. La bascule se fait sur un mot — resté au lieu de dormi — et le geste de la manche confirme ce que la phrase dément. Le dialogue progresse par prélèvements infimes plutôt que par aveux. Le lecteur n'apprend pas le secret, mais il apprend que le témoin le garde, ce qui est dramatiquement plus fort.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Le dialogue qui récite l'exposition",
        why:
          "Deux personnages s'informent mutuellement de choses qu'ils savent déjà, pour le bénéfice du lecteur. La scène perd sa crédibilité et son rythme, car personne n'a de raison de parler.",
        fix:
          "Confiez l'information à un personnage qui a un intérêt à la révéler, ou faites-la surgir d'un conflit : un rapport qu'on refuse de signer, un nom qu'on hésite à prononcer.",
      },
      {
        mistake: "Toutes les voix se ressemblent",
        why:
          "Les personnages partagent la même syntaxe et le même registre ; on pourrait échanger les répliques sans conséquence. Le lecteur perd le plaisir de reconnaître qui parle.",
        fix:
          "Donnez à chacun une contrainte de langage : l'un évite les questions directes, l'autre termine ses phrases par une justification. Vérifiez en masquant les noms.",
      },
      {
        mistake: "Le dialogue se résout trop vite",
        why:
          "Dès qu'un personnage demande, l'autre accorde ; la scène n'a pas d'obstacle et donc pas de tension. Les informations circulent, mais rien ne se joue.",
        fix:
          "Introduisez un refus motivé, une condition ou un malentendu. Faites payer l'information : celui qui la donne doit obtenir quelque chose en échange.",
      },
    ],
    exercises: [
      {
        id: "dialogues-demande-refusee",
        title: "La demande refusée",
        objective:
          "Faire progresser une scène par la friction entre une demande explicite et un refus qui ne se dit pas.",
        instructions:
          "1. Inventez deux personnages et une demande précise : un prêt, une signature, une heure de garde.\n2. Écrivez un échange de 12 à 16 répliques où le demandeur insiste et où l'autre refuse sans jamais dire non.\n3. Donnez au refus une raison que le lecteur peut deviner mais que le personnage ne nomme pas.\n4. Placez au moins une interruption et un changement de sujet.\n5. Terminez sur une réplique qui laisse la demande en suspens.",
        criteria: [
          "La demande est identifiable dès les trois premières répliques.",
          "Le refus n'est jamais formulé explicitement.",
          "Chaque personnage poursuit un objectif distinct et constant.",
          "La fin ne résout pas la demande.",
        ],
        durationMinutes: 20,
        observe:
          "Comptez les répliques où le demandeur change de stratégie. S'il répète la même formulation, la scène stagne.",
      },
      {
        id: "dialogues-trois-voix",
        title: "Trois voix, une phrase",
        objective:
          "Différencier les personnages par la syntaxe et le rapport au langage, sans étiquettes ni descriptions.",
        instructions:
          "1. Prenez une information neutre : la clé est sous le pot de fleurs.\n2. Faites-la transmettre par trois personnages différents dans trois courtes scènes de 80 mots.\n3. Donnez à chacun une contrainte syntaxique : phrases nominales, questions systématiques, subordonnées en cascade.\n4. Interdisez-vous les adverbes de manière et les commentaires du narrateur.\n5. Masquez les noms et faites relire : on doit reconnaître chaque voix.",
        criteria: [
          "Chaque voix repose sur une contrainte syntaxique repérable.",
          "L'information reste la même dans les trois versions.",
          "Aucun personnage n'est décrit par un adjectif de caractère.",
          "Les trois versions produisent des effets différents.",
        ],
        durationMinutes: 15,
        observe:
          "Repérez la voix qui ressemble le plus à votre narration habituelle : c'est souvent celle qui manque le plus de relief.",
      },
      {
        id: "dialogues-silence-actif",
        title: "Le silence actif",
        objective:
          "Remplacer une réplique décisive par un geste, sans perdre l'information ni l'émotion.",
        instructions:
          "1. Écrivez d'abord une scène de 200 mots où un personnage annonce une nouvelle importante par une réplique directe.\n2. Réécrivez la scène en supprimant cette réplique.\n3. Remplacez-la par deux gestes et un objet déplacé.\n4. Faites en sorte que l'autre personnage comprenne la nouvelle sans qu'elle soit dite.\n5. Gardez la même longueur approximative.",
        criteria: [
          "La nouvelle reste compréhensible pour le lecteur.",
          "Les gestes sont spécifiques et non interchangeables.",
          "Le texte ne compense pas par un commentaire explicatif.",
          "La scène gagne en tension par rapport à la première version.",
        ],
        durationMinutes: 25,
        observe:
          "Vérifiez si le geste choisi appartient au personnage ou s'il pourrait convenir à n'importe qui. Un geste universel affaiblit l'effet.",
      },
    ],
    manuscriptPrompt:
      "Prenez une scène dialoguée de votre manuscrit où les personnages s'expliquent trop clairement, et retirez la réplique qui dit l'essentiel. Remplacez-la par un geste ou un objet : voyez ce que la scène gagne en présence.",
  },
  {
    slug: "creer-de-la-tension",
    skillId: "tension",
    title: "Créer de la tension",
    subtitle: "L'écart entre ce qui est et ce qui pourrait être",
    introduction:
      "La tension ne dépend pas du bruit ni du danger : elle naît d'un enjeu compris, d'une incertitude entretenue et d'un coût possible. Une scène calme peut être plus tendue qu'une bataille si le lecteur sait ce qui peut être perdu. Cet atelier vous apprend à mesurer la pression plutôt qu'à l'annoncer.",
    theory: [
      {
        title: "L'enjeu se définit par la perte",
        body:
          "La tension ne vient pas de l'intensité des événements, mais de la clarté de ce qui peut être perdu. Un personnage poursuivi dans un couloir n'angoisse personne si le lecteur ignore ce qu'il risque ; le même couloir devient insoutenable si l'on sait qu'une clé doit être rendue avant minuit et que, faute de quoi, un enfant sera placé. L'enjeu doit être concret, personnel et proche. Concret : un objet, un délai, une personne nommée. Personnel : la perte touche une valeur propre au personnage, pas l'humanité en général. Proche : la conséquence se produira dans un temps que le lecteur peut mesurer. Attention aux enjeux abstraits — la vérité, la justice, l'avenir du monde — qui ne produisent de l'effet que s'ils sont incarnés par une perte précise. Enfin, l'enjeu doit être rappelé sans être rabâché : un objet vu, un délai mentionné une fois, suffisent souvent à maintenir la pression.",
      },
      {
        title: "L'incertitude a besoin de règles",
        body:
          "Une menace floue fatigue ; une menace dont on connaît les règles inquiète. Le lecteur doit savoir ce qui déclenche le danger, ce qui l'empêche, et ce qui arrive en cas d'échec. Ces règles n'ont pas besoin d'être expliquées en bloc : elles peuvent être découvertes par l'action, comme un personnage qui apprend qu'une porte se referme à la troisième cloche. L'incertitude porte alors non sur la nature du danger, mais sur le moment et la manière. C'est là que naît le suspense. Un outil précieux est l'ironie dramatique : le lecteur sait ce que le personnage ignore. La scène du repas devient tendue parce qu'on a vu la lettre dans le tiroir, pas parce que les convives crient. Varier les positions — savoir plus, puis moins que le personnage — évite la monotonie et permet de relancer la pression sans ajouter d'événement.",
      },
      {
        title: "La tension dans les scènes calmes",
        body:
          "Une scène sans danger peut être plus tendue qu'une poursuite, à condition qu'un risque social ou affectif y soit engagé. Un dîner où l'on doit annoncer une rupture, une visite où l'on cache un deuil, un thé où l'on attend une réponse : le danger est de perdre la face, l'amour ou l'estime. Ces scènes fonctionnent par micro-obstacles : une phrase interrompue, un convive qui monopolise la parole, un retard qui déplace l'aveu. Chaque obstacle retarde la résolution et augmente le coût de la parole. Le piège est de confondre calme et platitude : si rien ne peut se perdre, la scène n'a pas de tension, seulement de la politesse. Il faut donc identifier la question non posée et la faire peser sur chaque réplique. Enfin, terminez souvent la scène juste avant ou juste après le moment attendu : l'ellipse peut être plus tendue que l'explication, parce qu'elle laisse le lecteur travailler.",
      },
    ],
    examples: [
      {
        title: "La troisième cloche",
        text:
          "La supérieure avait été claire : la porte de la tour se fermait à la troisième cloche, et celle qui restait dehors attendrait l'aube dans le jardin. À la deuxième, Agnès était encore dans le cellier, à compter les pots de confiture. Elle savait que le compte était faux, elle savait qu'elle recommençait pour la troisième fois, et elle continuait pourtant, les doigts sur le verre froid. Par la lucarne, la corde de la cloche se balançait, immobile entre deux souffles. Elle se dit qu'il lui restait le temps de monter. Elle rangea le dernier pot, aligna l'étiquette, et sortit du cellier sans courir.",
        commentary:
          "Le danger est défini une fois, précisément : une porte, une cloche, un jardin. Tout le reste est du retardement volontaire, et c'est ce qui crée la tension. Agnès sait, le lecteur sait, et l'écart entre le savoir et l'agir devient le vrai sujet. Le détail de l'étiquette alignée montre un personnage qui se punit ou se prépare, sans que le texte tranche. La menace n'est jamais décrite : elle est seulement mesurée par le temps qui reste.",
      },
      {
        title: "Le dîner",
        text:
          "Berthe avait mis les couverts pour quatre, puis retiré une assiette, puis remis. À sept heures, elle servit le potage. À sept heures dix, elle demanda à son fils de passer le pain. À sept heures vingt, elle dit que la soupe refroidissait, ce qui était une phrase sur l'absence et non sur la température. Il répondit que Madeleine avait peut-être manqué le train. Berthe sourit, tendit la salière, et parla de la toiture. Elle ne reparla plus de l'assiette. À huit heures, elle la rangea, essuya le rebord, et dit qu'on ne garderait pas le dessert.",
        commentary:
          "Aucun danger physique, et pourtant la scène serre. L'enjeu est de ne pas nommer l'humiliation : l'assiette retirée et remise dit tout. Chaque réplique porte sur la soupe ou le pain et vise l'absence. Le retard de Madeleine est l'obstacle, et la phrase sur la toiture est une esquive qui coûte. La dernière réplique, sur le dessert, clôt la scène par une décision domestique qui vaut condamnation. C'est la retenue qui produit la tension, pas l'émotion déclarée.",
      },
    ],
    commonMistakes: [
      {
        mistake: "La tension par les adjectifs",
        why:
          "Le texte annonce que la situation est terrible, oppressante, glaciale, sans construire de perte mesurable. Le lecteur reçoit une consigne d'émotion au lieu d'en éprouver une.",
        fix:
          "Remplacez chaque adjectif d'ambiance par un fait vérifiable : un délai, un objet déplacé, une personne qui ne vient pas. Supprimez les mots qui jugent l'atmosphère.",
      },
      {
        mistake: "L'obstacle s'efface trop vite",
        why:
          "Le personnage rencontre une difficulté et la résout dans le paragraphe suivant. L'enjeu n'a pas le temps de peser et la scène suivante repart de zéro.",
        fix:
          "Faites payer chaque solution : un obstacle résolu doit créer une conséquence ou fermer une option. Vérifiez que la scène se termine dans une situation moins confortable qu'au début.",
      },
      {
        mistake: "Le secret est gardé pour le lecteur seul",
        why:
          "L'auteur retient une information dont le personnage a besoin, ce qui produit de la confusion plutôt que du suspense. Le lecteur ne peut pas évaluer le risque.",
        fix:
          "Donnez au lecteur les mêmes règles qu'au personnage, ou assumez l'ironie dramatique en montrant ce que le personnage ignore. L'incertitude doit porter sur l'issue, pas sur les données.",
      },
    ],
    exercises: [
      {
        id: "tension-porte-entrebaillee",
        title: "La porte entrebâillée",
        objective:
          "Installer une menace sans événement violent, en faisant reposer la pression sur un délai et un interdit.",
        instructions:
          "1. Définissez en une phrase un interdit simple et vérifiable : ne pas ouvrir, ne pas sortir, ne pas répondre.\n2. Écrivez une scène de 300 mots où un personnage est tenté de le franchir.\n3. Mentionnez une seule fois la conséquence de la transgression, au début ou au milieu.\n4. Faites progresser la tentation par trois gestes concrets, sans commentaire moral.\n5. Arrêtez la scène avant que le personnage ne décide.",
        criteria: [
          "L'interdit et sa conséquence sont compréhensibles dès la première page.",
          "Aucune violence physique n'est décrite.",
          "La tentation progresse par des gestes, non par des pensées explicatives.",
          "La fin laisse la décision ouverte.",
        ],
        durationMinutes: 25,
        observe:
          "Notez le moment où le lecteur comprend la conséquence. S'il la comprend trop tard, la scène paraîtra gratuite ; trop tôt, elle paraîtra mécanique.",
      },
      {
        id: "tension-compte-a-rebours",
        title: "Le compte à rebours intime",
        objective:
          "Faire sentir le temps qui reste sans employer d'indication horaire explicite.",
        instructions:
          "1. Choisissez un délai court : une heure, une nuit, le temps d'un trajet.\n2. Écrivez une scène de 250 mots où le personnage doit accomplir une tâche avant la fin de ce délai.\n3. Mesurez le temps par des éléments matériels : lumière qui baisse, bruit qui s'éloigne, fatigue.\n4. Interdisez-vous les mentions d'horloge et les phrases du type « il ne restait que ».\n5. Terminez au moment où le délai est presque écoulé, sans le dépasser.",
        criteria: [
          "Le lecteur peut estimer l'écoulement du temps.",
          "Aucune heure ni durée chiffrée n'est indiquée.",
          "Les repères temporels sont intégrés à l'action.",
          "La fin maintient l'incertitude sur l'issue.",
        ],
        durationMinutes: 20,
        observe:
          "Comptez les repères sensoriels utilisés. S'ils appartiennent tous à la même famille, la scène perd en texture.",
      },
      {
        id: "tension-mauvaise-nouvelle",
        title: "La mauvaise nouvelle retardée",
        objective:
          "Construire une tension sociale en multipliant les obstacles à une parole difficile.",
        instructions:
          "1. Un personnage doit annoncer une nouvelle grave à deux interlocuteurs.\n2. Écrivez une scène de 350 mots où chaque tentative d'annonce est interrompue par un motif différent : téléphone, repas, souvenir.\n3. Donnez aux interruptions une apparence naturelle et une utilité propre.\n4. Faites en sorte que le personnage renonce progressivement à la franchise.\n5. Terminez sur un geste qui dit l'aveu sans le prononcer.",
        criteria: [
          "Chaque interruption a une justification dans la scène.",
          "Les tentatives d'annonce sont de plus en plus courtes ou maladroites.",
          "Le personnage change de stratégie au fil de la scène.",
          "La fin évite à la fois l'aveu explicite et le malentendu total.",
        ],
        durationMinutes: 30,
        observe:
          "Repérez la tentative la plus proche d'aboutir. C'est souvent là qu'il faut ajouter un obstacle, et non après.",
      },
    ],
    manuscriptPrompt:
      "Dans votre manuscrit, choisissez une scène que vous jugez tendue et notez ce que le personnage peut perdre, en une phrase. Si la phrase est abstraite, remplacez l'enjeu par une perte concrète et datée.",
  },
  {
    slug: "maitriser-les-descriptions",
    skillId: "descriptions",
    title: "Maîtriser les descriptions",
    subtitle: "Faire voir, sentir, et surtout ressentir",
    introduction:
      "Une description juste n'est pas une description complète. Elle sélectionne les détails qui comptent pour le regard, l'état intérieur ou la situation du personnage, et les intègre au mouvement de la scène. Cet atelier vous aide à choisir un point de vue, à mobiliser les sens utiles et à faire avancer le récit par ce qu'il montre.",
    theory: [
      {
        title: "Décrire, c'est choisir un regard",
        body:
          "Une description n'est pas un relevé : c'est une sélection opérée par quelqu'un. Le même palier sera vu par une enfant comme un espace trop grand, par un serrurier comme une porte mal ajustée, par une veuve comme l'endroit où son mari est tombé. Le détail n'a pas besoin d'être rare ; il doit être motivé. Un photographe remarque les reflets, un médecin la couleur des lèvres, une femme qui a faim la vaisselle sale. Ce filtre fait deux choses à la fois : il rend la description crédible et il caractérise le personnage sans commentaire psychologique. Le piège est de décrire ce que l'auteur sait important plutôt que ce que le personnage peut percevoir. Si votre narrateur ne peut pas voir la pièce, ne la décrivez pas. La cohérence du point de vue vaut plus que la richesse du vocabulaire.",
      },
      {
        title: "Les sens qui portent la mémoire",
        body:
          "La vue domine nos brouillons, alors que l'odeur et le toucher déclenchent des associations plus anciennes. Une odeur de cire, un tissu rêche, une marche qui cède sous le pied : ces sensations convoquent un passé sans avoir à le raconter. Le mécanisme est simple : un stimulus sensoriel ouvre un souvenir, et ce souvenir colore la perception présente. Il faut éviter le catalogue des cinq sens ; un seul sens bien choisi, relié à l'état du personnage, produit plus d'effet que cinq notations juxtaposées. La température est particulièrement utile : elle dit le confort, la peur, l'appartenance. Un personnage qui n'ose pas s'asseoir près du feu raconte sa place dans la maison. Enfin, la sensation doit avoir une conséquence : si l'odeur ne modifie ni le geste ni la décision, elle reste un ornement.",
      },
      {
        title: "La description avance avec l'action",
        body:
          "Une description immobile arrête le récit ; une description en mouvement le porte. La technique consiste à accrocher les détails à des verbes : au lieu de décrire la cuisine avant que le personnage n'entre, faites-le entrer, chercher, heurter, ouvrir. Chaque perception devient alors un événement minuscule. Cela règle aussi le dosage : on ne décrit que ce que l'action amène. Un couloir se révèle par les portes qu'on essaie, une forêt par les branches qu'on écarte. La description peut également servir de retardement : plus le personnage observe, plus il hésite, et plus la scène se tend. Mais ce retard doit être motivé par son état — peur, fascination, calcul — sinon le lecteur sent la manœuvre. Règle pratique : après chaque paragraphe descriptif, demandez-vous ce qui a changé dans la scène. Si rien, coupez ou déplacez.",
      },
    ],
    examples: [
      {
        title: "Le palier",
        text:
          "Le palier sentait la soupe et le savon noir. Vue d'en bas, la rampe montait comme une échelle trop longue, et Lucie comptait les barreaux pour ne pas regarder la porte du fond. Le carrelage était froid sous ses chaussettes ; une fissure partait du paillasson et allait mourir contre le mur, comme si la maison avait craqué cette nuit. Elle posa la main sur la poignée. La peinture s'écaillait par plaques, et sous l'ongle, la poussière avait un goût de craie. En bas, sa mère l'appela. Lucie ne répondit pas.",
        commentary:
          "Le palier est décrit par une enfant : les proportions sont fausses, la rampe devient échelle, la fissure devient craquement de la maison. Le détail de la peinture sous l'ongle et le goût de craie ancrent la perception dans un corps. Rien n'est dit de la peur, mais tout la mesure : compter les barreaux, ne pas regarder la porte, ne pas répondre. La description est entièrement au service d'un état intérieur, sans une seule phrase d'analyse.",
      },
      {
        title: "La serre",
        text:
          "La serre avait été abandonnée au printemps, et l'été l'avait punie. Les vitres portaient une pellicule verte ; sous les bancs, des feuilles noires collaient au carrelage. Une odeur de terre chaude et de métal mouillé prenait à la gorge. Au fond, un citronnier survivait, ses fruits pâles suspendus comme des lampes éteintes. Élise avança la main vers une feuille et retira ses doigts couverts d'une poudre fine, presque grasse. Elle s'essuya sur sa jupe, puis, prise d'un doute, respira sa paume. L'odeur était celle du jardin de sa grand-mère, un dimanche d'août, avant l'incendie.",
        commentary:
          "La description procède par dégradation : le vert, puis le noir, puis l'odeur qui prend à la gorge. Les comparaisons — lampes éteintes — installent une mélancolie sans l'annoncer. La bascule se fait au contact : la poudre sur les doigts déclenche le souvenir, et le mot incendie arrive en fin de paragraphe, sans préparation. C'est le sensoriel qui ouvre le passé, pas une explication. Le lecteur reçoit l'émotion en même temps qu'Élise, ce qui la rend plus forte.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Le catalogue d'objets",
        why:
          "La description énumère meubles, couleurs et matières sans hiérarchie ni regard. Le lecteur ne sait pas quoi retenir et saute le passage.",
        fix:
          "Gardez trois détails au maximum par paragraphe et reliez-les à une action ou à un état du personnage. Supprimez tout ce que le personnage ne remarquerait pas.",
      },
      {
        mistake: "Les adjectifs empilés",
        why:
          "« Une immense pièce sombre et froide, sinistre et poussiéreuse » additionne des jugements au lieu de montrer. L'effet est décoratif et le rythme s'alourdit.",
        fix:
          "Remplacez deux adjectifs par un fait concret : la poussière sur le rebord, le froid qui vient des vitres. Un seul adjectif bien choisi suffit.",
      },
      {
        mistake: "La description qui suspend la scène sans contrepartie",
        why:
          "Le récit s'arrête pendant deux pages pour présenter un lieu, puis reprend comme si rien ne s'était passé. Le lecteur perd le fil de l'enjeu.",
        fix:
          "Faites de la description un moment d'action ou d'hésitation : le personnage cherche, écoute, touche. Terminez le passage sur une décision ou une modification de la situation.",
      },
    ],
    exercises: [
      {
        id: "descriptions-trois-details",
        title: "Trois détails, un état",
        objective:
          "Choisir des détails qui révèlent un état intérieur sans le nommer.",
        instructions:
          "1. Choisissez une émotion précise : honte, impatience, deuil, désir.\n2. Décrivez une pièce en trois détails seulement, sans nommer l'émotion ni le personnage.\n3. Chaque détail doit être perceptible par un sens différent.\n4. Faites en sorte que les trois détails convergent vers l'état choisi.\n5. Terminez par un geste du personnage qui confirme ou contredit cet état.",
        criteria: [
          "Exactement trois détails descriptifs sont développés.",
          "L'émotion n'est jamais nommée.",
          "Chaque détail passe par un sens distinct.",
          "Le geste final ajoute une information au lieu de répéter.",
        ],
        durationMinutes: 15,
        observe:
          "Faites lire le passage sans consigne : si le lecteur devine l'émotion, les détails sont efficaces ; s'il devine seulement l'ambiance, ils sont trop généraux.",
      },
      {
        id: "descriptions-piece-toucher",
        title: "La pièce par le toucher",
        objective:
          "Décrire un espace sans recourir à la vue, en faisant du contact une information narrative.",
        instructions:
          "1. Placez un personnage dans une pièce qu'il connaît mal, les yeux bandés ou dans l'obscurité.\n2. Décrivez la pièce uniquement par le toucher, l'ouïe et l'odorat.\n3. Interdisez-vous tout verbe de vision.\n4. Faites en sorte que chaque contact modifie sa compréhension du lieu.\n5. Terminez sur un objet qu'il reconnaît et qui change la scène.",
        criteria: [
          "Aucun verbe de vision n'est employé.",
          "Les sensations tactiles sont précises et variées.",
          "La compréhension du lieu progresse avec les contacts.",
          "L'objet final a une incidence sur l'action.",
        ],
        durationMinutes: 20,
        observe:
          "Vérifiez si le personnage pourrait décrire la même pièce sans bouger. Si oui, le déplacement n'est pas utilisé comme moteur.",
      },
      {
        id: "descriptions-portrait-differe",
        title: "Le portrait différé",
        objective:
          "Faire attendre un portrait et le construire par fragments liés à l'action.",
        instructions:
          "1. Introduisez un personnage sans donner aucun détail physique dans les dix premières lignes.\n2. Semez trois détails corporels au fil d'une scène de 300 mots : une voix, une main, une façon de se tenir.\n3. Reliez chaque détail à un geste ou à un échange.\n4. Évitez les comparaisons esthétiques et les jugements de beauté.\n5. Faites en sorte que le dernier détail contredise l'impression donnée par les deux premiers.",
        criteria: [
          "Aucun portrait n'est concentré en un seul paragraphe.",
          "Les trois détails sont intégrés à des actions.",
          "Le dernier détail modifie l'impression d'ensemble.",
          "Le texte évite les clichés de beauté ou de laideur.",
        ],
        durationMinutes: 25,
        observe:
          "Demandez-vous ce que le lecteur imagine avant le troisième détail. La contradiction finale est efficace si cette image était déjà stable.",
      },
    ],
    manuscriptPrompt:
      "Repérez dans votre manuscrit un paragraphe descriptif de plus de dix lignes et réduisez-le à trois détails choisis par le personnage. Vérifiez ensuite si la scène avance mieux.",
  },
  {
    slug: "travailler-le-rythme",
    skillId: "pacing",
    title: "Travailler le rythme",
    subtitle: "La respiration du récit",
    introduction:
      "Le rythme résulte de la longueur des phrases, de la densité des scènes, des transitions et de la quantité d'information donnée. Il ne s'agit pas d'aller vite, mais de varier la pression pour que le lecteur ait envie de continuer. Cet atelier vous fait travailler la scène, le résumé, l'ellipse et la phrase comme des outils de vitesse.",
    theory: [
      {
        title: "Scène, résumé, ellipse",
        body:
          "Le rythme se décide d'abord par le mode de narration. La scène donne au lecteur du temps réel : on entend les répliques, on suit les gestes. Le résumé compresse : « les trois semaines suivantes passèrent en visites et en lettres ». L'ellipse supprime : on saute de la veille au matin sans transition. Chacun a une fonction. La scène installe l'émotion et le conflit ; le résumé gère la logistique et les durées mortes ; l'ellipse crée du manque et de la vitesse. Le déséquilibre le plus courant est le tout-scène : le récit s'étire sur des déjeuners et des trajets sans enjeu. Le second est le tout-résumé : le lecteur est informé de tout et ne vit rien. Une bonne proportion se vérifie passage par passage : si vous pouvez raconter un épisode en une phrase sans rien perdre d'essentiel, c'est un résumé qui s'ignore.",
      },
      {
        title: "La phrase est une unité de vitesse",
        body:
          "La longueur des phrases modifie la perception du temps. Une série de phrases courtes accélère et durcit ; une phrase longue à subordonnées ralentit et enveloppe. Mais l'effet dépend du contraste : si tout est bref, la brièveté devient un tic et ne signifie plus rien. Le travail consiste à faire varier la pression à l'intérieur d'un même paragraphe. Un exemple utile : trois phrases nominales pour un geste précis, puis une phrase ample pour ce que le personnage comprend. Le retournement de rythme souligne le retournement de sens. Attention aussi aux paragraphes : un paragraphe d'une ligne isole une information et lui donne du poids, à condition que ce procédé reste rare. Enfin, lisez à voix haute : la respiration révèle les phrases trop longues mieux que n'importe quelle règle.",
      },
      {
        title: "La respiration doit changer quelque chose",
        body:
          "Une pause n'est pas une récompense : c'est un déplacement. Le moment où le personnage s'assoit, boit un thé, regarde la pluie, doit modifier sa compréhension ou sa décision. Sinon la pause n'est qu'un arrêt. Les meilleurs ralentissements sont ceux où le personnage digère une information, prend conscience d'un choix, ou se prépare à mentir. La relance vient ensuite : une question, un objet qui manque, une porte qui s'ouvre. Ce couple respiration-relance gouverne l'envie de tourner la page. Les fins de chapitre obéissent à la même logique : elles peuvent couper net, ou laisser une question ouverte, mais elles doivent laisser le lecteur dans un état différent de celui du début. Une scène peut se terminer sur un calme apparent si le lecteur sait que ce calme est faux.",
      },
    ],
    examples: [
      {
        title: "La fuite",
        text:
          "Elle prit la valise. La fermeture céda. Elle laissa le linge, garda les papiers, descendit. La rue était vide, les réverbères allumés pour rien. Au coin, une voiture attendait, moteur en marche. Elle ne courut pas. Elle marcha vite, tête baissée, et compta les plaques d'égout comme on compte les secondes. Derrière elle, une porte claqua. Elle ne se retourna pas. La portière s'ouvrit avant qu'elle n'ait levé la main.",
        commentary:
          "La vitesse vient de la syntaxe : phrases courtes, verbes d'action, presque aucun commentaire. Le détail des plaques d'égout introduit une mesure du temps qui donne au passage sa nervosité. Le refus de se retourner caractérise le personnage sans explication. Notez que le rythme ralentit imperceptiblement sur « elle ne courut pas », puis reprend : ce contraste suffit à suggérer la peur. Le dernier geste, la portière qui s'ouvre, relance la scène au lieu de la clore.",
      },
      {
        title: "Le thé",
        text:
          "Elle laissa l'eau chauffer sans surveiller la casserole. La cuisine était tiède, et la lumière du soir tombait sur la table en une nappe jaune qui allait s'éteindre dans une heure. Elle sortit deux tasses, puis en remit une dans le placard. Le thé infusa trop longtemps ; elle le but quand même, assise, les mains autour de la porcelaine. Dehors, un chien aboya, puis se tut. Elle pensa à la lettre qu'elle n'avait pas ouverte, et comprit qu'elle ne l'ouvrirait pas ce soir. Elle se leva pour rincer la tasse et la posa sur l'égouttoir, à l'envers.",
        commentary:
          "Le ralentissement est obtenu par des phrases amples et des gestes sans urgence apparente. La lumière qui va s'éteindre mesure le temps qui passe. Le détail des deux tasses, puis d'une seule, dit la décision avant que le personnage ne la formule. La compréhension finale — ne pas ouvrir la lettre — est préparée par le rythme, non par un raisonnement. La tasse retournée clôt la scène sur une image de clôture intérieure.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Tout raconter en scène",
        why:
          "Les déplacements, les repas et les préparatifs occupent le même espace que les moments décisifs. Le lecteur ne distingue plus ce qui compte et la lecture s'essouffle.",
        fix:
          "Marquez chaque passage comme scène, résumé ou ellipse. Compressez en une phrase ce qui ne contient ni choix ni conflit, et gardez la scène pour ce qui change la situation.",
      },
      {
        mistake: "L'accélération permanente",
        why:
          "Le texte enchaîne les phrases brèves et les événements sans laisser le lecteur s'installer. À force, l'urgence devient du bruit et les moments forts ne se distinguent plus.",
        fix:
          "Installez un ralentissement avant chaque accélération. Faites varier la longueur des phrases à l'intérieur du paragraphe et vérifiez que le contraste souligne un changement de sens.",
      },
      {
        mistake: "La transition explicative",
        why:
          "« Puis ils partirent et arrivèrent le lendemain » informe sans produire d'effet. La transition dit le trajet au lieu de le traverser ou de le sauter franchement.",
        fix:
          "Choisissez : soit une ellipse nette avec un ancrage temporel, soit une scène de trajet qui contient un enjeu. Supprimez les transitions qui ne font que relier.",
      },
    ],
    exercises: [
      {
        id: "pacing-trois-vitesses",
        title: "Le même événement en trois vitesses",
        objective:
          "Faire varier le mode narratif pour produire trois effets distincts sur le même matériau.",
        instructions:
          "1. Choisissez un événement simple : une lettre qu'on brûle, une clé qu'on rend, un train qu'on rate.\n2. Racontez-le en une page, en scène complète, avec répliques et gestes.\n3. Racontez-le en un paragraphe de résumé, sans dialogue.\n4. Racontez-le en une seule phrase d'ellipse qui conserve l'essentiel.\n5. Comparez les trois versions : notez ce que chacune gagne et perd.",
        criteria: [
          "Les trois versions racontent le même événement.",
          "La version scène contient au moins un échange ou un geste développé.",
          "Le résumé conserve la causalité sans dialogue.",
          "La phrase finale reste compréhensible hors contexte.",
        ],
        durationMinutes: 20,
        observe:
          "Repérez la version qui vous a demandé le plus d'efforts. C'est souvent le mode que votre projet utilise le moins.",
      },
      {
        id: "pacing-phrase-essoufflee",
        title: "La phrase qui s'essouffle",
        objective:
          "Utiliser la syntaxe pour traduire une perte de contrôle sans l'expliquer.",
        instructions:
          "1. Écrivez un paragraphe de 150 mots où un personnage garde le contrôle : phrases maîtrisées, subordonnées, vocabulaire précis.\n2. Réécrivez le même paragraphe en faisant perdre le contrôle au personnage, uniquement par la syntaxe.\n3. Supprimez les adverbes et les commentaires sur son état.\n4. Faites en sorte que la dernière phrase soit plus courte que toutes les précédentes.\n5. Gardez les mêmes faits d'un bout à l'autre.",
        criteria: [
          "Les faits racontés restent identiques.",
          "La perte de contrôle est perceptible par la syntaxe seule.",
          "Aucun commentaire psychologique n'est ajouté.",
          "La dernière phrase produit une rupture nette.",
        ],
        durationMinutes: 20,
        observe:
          "Lisez les deux versions à voix haute. Si la seconde ne modifie pas votre respiration, la syntaxe n'a pas assez changé.",
      },
      {
        id: "pacing-coupe",
        title: "La coupe",
        objective:
          "Choisir le moment exact où interrompre une scène pour relancer la lecture.",
        instructions:
          "1. Prenez une scène de 400 mots qui se termine par une explication complète.\n2. Supprimez les deux derniers paragraphes.\n3. Terminez sur une réplique, un geste ou une image qui laisse une question ouverte.\n4. Vérifiez que le lecteur peut reconstruire ce qui manque.\n5. Écrivez ensuite la première phrase de la scène suivante, sans transition explicative.",
        criteria: [
          "La scène se termine avant l'explication complète.",
          "La question laissée ouverte est précise, pas vague.",
          "Le raccord avec la scène suivante reste compréhensible.",
          "Aucune phrase ne résume ce qui vient d'être coupé.",
        ],
        durationMinutes: 15,
        observe:
          "Demandez-vous si la coupe crée une attente ou seulement une frustration. L'attente suppose que le lecteur ait une hypothèse à vérifier.",
      },
    ],
    manuscriptPrompt:
      "Prenez le chapitre de votre manuscrit qui vous semble le plus lent et marquez chaque passage d'une lettre : S pour scène, R pour résumé, E pour ellipse. Le déséquilibre visible vous indiquera où intervenir.",
  },
  {
    slug: "structurer-une-histoire",
    skillId: "structure",
    title: "Structurer une histoire",
    subtitle: "Des causes, pas seulement des événements",
    introduction:
      "Une histoire tient parce que chaque scène modifie la situation et rend la suivante nécessaire. La structure n'est pas un moule : c'est la logique des conséquences, des engagements et des seuils franchis. Cet atelier vous fait tester la causalité de votre récit scène par scène, sans imposer de plan préétabli.",
    theory: [
      {
        title: "La causalité avant la chronologie",
        body:
          "Une histoire n'est pas une suite d'événements, c'est une chaîne de conséquences. Le test le plus simple consiste à relier deux scènes par « donc » ou « mais » plutôt que par « ensuite ». Si aucune des deux conjonctions ne fonctionne, les scènes sont juxtaposées et le lecteur peut les sauter sans perdre le fil. La causalité ne signifie pas que tout doit être prévisible : elle signifie que chaque décision rend la suivante nécessaire, y compris lorsque cette nécessité est celle d'une erreur. Un personnage qui ment par peur rend probable la scène où le mensonge sera découvert. Ce n'est pas une mécanique froide : c'est ce qui donne au récit l'impression d'avancer. La chronologie, elle, ne fournit que l'ordre ; elle ne fournit pas la poussée.",
      },
      {
        title: "Le seuil et l'engagement",
        body:
          "Une histoire progresse par engagements successifs. À chaque étape, le personnage abandonne une option de repli : il signe, il avoue, il brûle une lettre, il franchit une porte qui se referme. Ces seuils sont plus efficaces que les péripéties, car ils modifient durablement la situation. Le premier seuil engage le récit ; le dernier rend la résolution inévitable. Entre les deux, il faut veiller à ce que chaque engagement coûte plus cher que le précédent, sinon la progression s'aplatit. Un personnage qui risque sa réputation, puis sa place, puis sa vie, avance ; un personnage qui risque trois fois sa réputation tourne en rond. Attention : un seuil doit être choisi, pas subi. Si le personnage est simplement poussé par les événements, il perd la qualité qui attache le lecteur, à savoir la responsabilité de ses actes.",
      },
      {
        title: "Promesses et paiement",
        body:
          "Chaque élément introduit avec insistance est une promesse : un objet, une question, une compétence, une menace. Le lecteur attend qu'elle soit payée. Le paiement n'est pas nécessairement une explication : il peut être une conséquence, un écho, une transformation. Une arme montrée au premier chapitre peut servir au dernier, ou être refusée au dernier moment, ce qui paie la promesse autrement. Le défaut le plus fréquent est la promesse oubliée : un personnage annoncé comme redoutable disparaît, un mystère est soulevé puis abandonné. Le second est le paiement sans promesse : la fin mobilise un élément que rien n'avait préparé. Pour vérifier, listez ce que le début promet et ce que la fin utilise ; l'écart indique les oublis. La résolution doit donner au lecteur le sentiment que la fin était possible depuis le début, sans avoir été évidente.",
      },
    ],
    examples: [
      {
        title: "Le registre",
        text:
          "Parce qu'il avait signé le registre de la douane sans lire, Anselme hérita d'une caisse qui ne lui appartenait pas. Il l'ouvrit dans l'arrière-salle, y trouva des cartes et un pistolet. Il aurait pu la déclarer. Il la referma, la porta chez sa sœur, et demanda qu'on la garde une nuit. Sa sœur accepta parce qu'elle lui devait de l'argent. Le lendemain, deux hommes se présentèrent à sa porte avec la copie du registre. Anselme comprit alors qu'en ne déclarant rien, il avait signé une seconde fois.",
        commentary:
          "Chaque phrase découle de la précédente par une nécessité psychologique : la négligence produit la caisse, la peur produit le silence, la dette de la sœur produit le refuge. Les liens sont explicites — parce que, aurait pu, accepta parce que — mais ils ne donnent pas l'impression d'un plan : ils donnent l'impression d'un engrenage. La dernière phrase transforme un détail administratif en condamnation. C'est la causalité, et non l'accumulation, qui produit le sentiment d'inéluctabilité.",
      },
      {
        title: "La porte",
        text:
          "La première fois, Éléonore refusa de signer et rentra chez elle. La deuxième, elle signa, mais exigea que son nom ne parût pas. La troisième, elle signa de sa main, en haut de la page, et demanda qu'on la photographie. Le notaire rangea son stylo. Elle sortit dans la cour, où les ouvriers chargeaient déjà les caisses, et comprit qu'elle ne pourrait plus dire qu'elle n'était pas au courant. La maison était à elle, avec ce qu'elle contenait.",
        commentary:
          "La progression est construite sur trois seuils de plus en plus coûteux : refus, signature anonyme, signature assumée. Chaque étape ferme une porte de repli. Le détail de la photographie rend l'engagement public, donc irréversible. La compréhension finale — ne plus pouvoir dire qu'elle ignorait — est la conséquence directe du troisième seuil. Aucun événement extérieur n'est nécessaire : la structure naît des décisions du personnage.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Les scènes juxtaposées",
        why:
          "Le récit avance par « ensuite » ; chaque scène pourrait être déplacée ou supprimée sans conséquence. Le lecteur perçoit une succession, pas une histoire.",
        fix:
          "Reliez les scènes par donc ou mais. Si le lien ne tient pas, modifiez la fin de la scène précédente pour qu'elle crée la suivante.",
      },
      {
        mistake: "Le milieu qui répète",
        why:
          "Les personnages affrontent plusieurs fois le même obstacle avec le même coût, sans que la situation change. L'impression de stagnation domine.",
        fix:
          "Augmentez l'engagement à chaque passage : ce qui était risqué devient certain, ce qui était secret devient public. Supprimez les scènes qui n'ajoutent ni information ni conséquence.",
      },
      {
        mistake: "La fin qui introduit du neuf",
        why:
          "La résolution mobilise un personnage, un objet ou un pouvoir jamais préparés. Le lecteur se sent trompé, même si la scène est bien écrite.",
        fix:
          "Listez les éléments de la fin et retrouvez leur première apparition. Ajoutez une préparation discrète dans les chapitres antérieurs, ou remplacez l'élément par un autre déjà installé.",
      },
    ],
    exercises: [
      {
        id: "structure-donc-mais",
        title: "Le test du donc et du mais",
        objective:
          "Vérifier la causalité d'une suite de scènes et repérer les passages juxtaposés.",
        instructions:
          "1. Résumez votre récit en dix scènes, une phrase par scène.\n2. Reliez chaque paire de scènes par donc ou mais, jamais par ensuite.\n3. Notez les liaisons qui résistent : ce sont les ruptures de causalité.\n4. Pour chaque rupture, modifiez la fin de la scène précédente afin de créer la suivante.\n5. Réécrivez la liste et vérifiez que chaque liaison fonctionne.",
        criteria: [
          "Les dix scènes sont résumées en une phrase chacune.",
          "Chaque liaison emploie donc ou mais.",
          "Les scènes modifiées rendent la suivante nécessaire.",
          "La chaîne finale ne comporte plus de liaison par ensuite.",
        ],
        durationMinutes: 30,
        observe:
          "Repérez la scène qui revient le plus souvent comme destination d'un donc. Elle joue probablement le rôle de charnière, même si vous ne l'aviez pas prévu.",
      },
      {
        id: "structure-carte-engagements",
        title: "La carte des engagements",
        objective:
          "Faire progresser le récit par des seuils de plus en plus coûteux, choisis par le personnage.",
        instructions:
          "1. Listez ce que le personnage peut perdre, du moins grave au plus grave.\n2. Associez à chaque perte une décision qui la rend possible.\n3. Ordonnez ces décisions de façon que chacune ferme une option de repli.\n4. Vérifiez qu'aucun engagement n'est subi sans choix.\n5. Écrivez la scène du dernier seuil en 200 mots.",
        criteria: [
          "Chaque engagement correspond à une perte identifiable.",
          "Le coût augmente d'un engagement au suivant.",
          "Chaque seuil résulte d'une décision du personnage.",
          "Le dernier seuil rend la résolution nécessaire.",
        ],
        durationMinutes: 25,
        observe:
          "Cherchez l'engagement qui ne coûte rien. S'il existe, il affaiblit tous les suivants par comparaison.",
      },
      {
        id: "structure-scene-manquante",
        title: "La scène manquante",
        objective:
          "Identifier et écrire la scène qui rend une transition actuellement incompréhensible.",
        instructions:
          "1. Choisissez deux scènes de votre projet qui se suivent et dont le lien vous paraît faible.\n2. Notez ce qui doit avoir changé entre la fin de l'une et le début de l'autre.\n3. Écrivez une scène de 250 mots qui produit ce changement.\n4. Faites en sorte que la nouvelle scène contienne un choix, pas seulement une information.\n5. Vérifiez qu'elle est nécessaire et qu'elle ne répète pas une scène existante.",
        criteria: [
          "Le changement visé est explicite avant l'écriture.",
          "La nouvelle scène contient une décision.",
          "Elle ne se contente pas de transmettre une information.",
          "Son retrait rendrait la scène suivante incompréhensible.",
        ],
        durationMinutes: 30,
        observe:
          "Si la scène manquante ressemble à une scène déjà écrite, c'est souvent que le problème se situe plus tôt, dans la fin de la scène précédente.",
      },
    ],
    manuscriptPrompt:
      "Prenez les cinq scènes centrales de votre manuscrit et reliez-les par donc ou mais. Si l'une des liaisons vous oblige à ajouter une explication, c'est que la structure demande une scène, pas un commentaire.",
  },
  {
    slug: "preparer-les-revelations",
    skillId: "foreshadowing",
    title: "Préparer les révélations",
    subtitle: "Semer sans montrer la main",
    introduction:
      "Préparer une révélation, c'est offrir au lecteur des indices suffisants pour qu'il puisse relire avec plaisir, sans lui donner la réponse trop tôt. Le bon indice est justifié dans la scène avant de devenir signifiant plus tard. Cet atelier vous apprend à semer des appuis discrets, à doser la répétition et à faire d'un retournement une relecture.",
    theory: [
      {
        title: "L'indice doit être justifié deux fois",
        body:
          "Un bon indice possède deux raisons d'être : une raison immédiate, qui le rend naturel dans la scène, et une raison différée, qui le rend signifiant après la révélation. Le couteau sur la table est justifié parce qu'on découpe le pain ; plus tard, il devient l'arme. Si l'indice n'a pas de justification immédiate, il clignote et le lecteur le repère comme un dispositif. S'il n'a pas de justification différée, il n'est qu'un détail. Le travail consiste donc à trouver un contexte où l'objet ou la phrase sert à quelque chose, puis à le faire revenir dans un autre contexte. La répétition n'est pas nécessaire : une seule apparition bien motivée peut suffire. Ce qui compte, c'est que le lecteur puisse se dire, à la relecture, qu'il aurait pu comprendre.",
      },
      {
        title: "Le poids de la répétition",
        body:
          "Répéter un élément trois fois est une convention efficace, à condition de faire varier le contexte. La première occurrence installe, la deuxième attire l'attention, la troisième prépare le retournement. Si les trois occurrences sont identiques, le procédé devient visible et le lecteur devine. Si elles sont trop différentes, le lien ne se fait pas. L'art consiste à modifier un paramètre à chaque passage : la personne qui manipule l'objet, le lieu, l'émotion associée. Un motif peut aussi être thématique plutôt que matériel : une phrase entendue dans l'enfance revient dans une bouche ennemie. Enfin, méfiez-vous de l'indice trop commenté. Si le narrateur s'attarde et souligne l'étrangeté, il désigne la porte. La meilleure préparation est celle que le lecteur traverse sans ralentir.",
      },
      {
        title: "La révélation relit le passé",
        body:
          "Une révélation ne se contente pas d'ajouter une information : elle change le sens de ce qui précède. Le lecteur doit pouvoir reconstruire plusieurs scènes à la lumière de ce qu'il apprend, et découvrir que les indices étaient là. Pour obtenir cet effet, préparez la révélation sur deux plans : factuel et émotionnel. Le plan factuel fournit les preuves ; le plan émotionnel fournit les raisons pour lesquelles le personnage n'a pas voulu voir. Une révélation purement factuelle surprend mais ne trouble pas ; une révélation purement émotionnelle émeut mais ne convainc pas. Le meilleur retournement modifie aussi la responsabilité : ce que le personnage croyait subir, il l'a peut-être permis. Enfin, vérifiez la relecture : si les scènes antérieures deviennent incohérentes, vous avez triché, et le lecteur le sentira.",
      },
    ],
    examples: [
      {
        title: "Le gant",
        text:
          "Dans l'entrée, une paire de gants pendait au portemanteau, trop petits pour Julien. Personne n'avait jamais su à qui ils appartenaient ; la mère disait qu'ils venaient d'un locataire, le père qu'on les avait toujours eus. Ils servaient à décrocher la clé du grenier, et Julien, enfant, les avait cent fois enfilés sans pouvoir plier les doigts. Le jour où il monta enfin, il trouva dans le grenier une boîte de photographies. Sur la première, une femme inconnue portait des gants identiques, et tenait un enfant qui n'était pas Julien.",
        commentary:
          "Le gant est justifié immédiatement : il sert à décrocher une clé, il est trop petit, il a une histoire familiale floue. Rien ne le désigne comme indice. À la révélation, il devient preuve d'une autre vie dans la maison, et le détail des doigts qui ne plient pas prend un sens nouveau. La répétition est évitée : une seule scène suffit, parce que l'objet est décrit avec assez de précision pour être mémorisé. Le lecteur peut relire la première phrase et comprendre qu'il avait déjà tout.",
      },
      {
        title: "La phrase de la mère",
        text:
          "Sa mère disait toujours : ne promets pas ce que tu ne peux pas tenir. Elle le disait en nouant son tablier, en vérifiant la fermeture des fenêtres, en comptant les cuillères. Le jour de l'enterrement, la voisine prit la main de Claire et lui dit la même phrase, avec la même intonation, en nouant son châle. Claire retira sa main. Elle comprit, dans la cour du cimetière, que sa mère n'avait pas seulement élevé une fille prudente : elle avait préparé quelqu'un à ne jamais rien exiger.",
        commentary:
          "La phrase est installée dans des gestes domestiques, ce qui la rend naturelle et presque invisible. Sa répétition par une autre bouche, au mauvais moment, produit le trouble. La révélation n'est pas un fait nouveau mais une relecture : la prudence maternelle devient une forme de renoncement transmis. Le geste de retirer la main traduit le refus avant toute analyse. L'indice fonctionne parce qu'il est émotionnel autant que factuel : le lecteur reconnaît la phrase et comprend ce qu'elle a coûté.",
      },
    ],
    commonMistakes: [
      {
        mistake: "L'indice qui clignote",
        why:
          "Le narrateur s'arrête, décrit longuement un objet, souligne son étrangeté. Le lecteur comprend qu'il doit le retenir et la surprise est consommée d'avance.",
        fix:
          "Donnez à l'indice une fonction immédiate et mentionnez-le en passant, au milieu d'autre chose. Supprimez les commentaires qui signalent son importance.",
      },
      {
        mistake: "L'indice jamais payé",
        why:
          "Un détail est mis en valeur puis abandonné. Le lecteur reste avec une attente déçue, même s'il ne sait pas laquelle, et la fin paraît incomplète.",
        fix:
          "Tenez une liste des éléments soulignés. Pour chacun, prévoyez un paiement — conséquence, écho, révélation — ou retirez l'insistance.",
      },
      {
        mistake: "La révélation sans préparation",
        why:
          "Le retournement arrive sans indice antérieur ; il surprend par effraction. Le lecteur a l'impression que l'auteur a changé les règles en cours de route.",
        fix:
          "Introduisez au moins deux appuis discrets dans les scènes antérieures, dont un qui puisse passer pour un détail d'ambiance. Vérifiez ensuite que les scènes anciennes restent cohérentes.",
      },
    ],
    exercises: [
      {
        id: "foreshadowing-objet-anodin",
        title: "L'objet anodin",
        objective:
          "Installer un objet dans une fonction ordinaire, puis le faire devenir signifiant sans le commenter.",
        instructions:
          "1. Choisissez un objet domestique et une fonction immédiate précise : caler une porte, mesurer, éclairer.\n2. Écrivez une scène de 200 mots où l'objet sert à cette fonction et rien de plus.\n3. Mentionnez un détail matériel qui deviendra important : une marque, une taille, une réparation.\n4. Écrivez ensuite une seconde scène de 150 mots où ce détail prend un autre sens.\n5. Ne commentez jamais le lien entre les deux scènes.",
        criteria: [
          "L'objet a une utilité réelle dans la première scène.",
          "Le détail matériel est précis et mémorisable.",
          "La seconde scène ne réexplique pas la première.",
          "Le lien entre les deux scènes est compréhensible sans commentaire.",
        ],
        durationMinutes: 25,
        observe:
          "Demandez-vous si le détail matériel pouvait passer inaperçu. S'il attire l'attention dès la première lecture, il est trop souligné.",
      },
      {
        id: "foreshadowing-replique-double-fond",
        title: "La réplique à double fond",
        objective:
          "Faire porter une information future par une phrase naturelle dans son contexte présent.",
        instructions:
          "1. Écrivez une scène de 250 mots où un personnage prononce une phrase parfaitement justifiée par la situation.\n2. Faites en sorte que cette phrase contienne, sans ambiguïté forcée, une information sur la révélation à venir.\n3. Interdisez-vous les sous-entendus appuyés et les regards entendus.\n4. Réécrivez la scène en changeant le contexte pour que la phrase devienne troublante.\n5. Vérifiez que la phrase reste naturelle dans les deux versions.",
        criteria: [
          "La phrase est motivée par la situation initiale.",
          "Elle contient une information vérifiable après coup.",
          "Aucun personnage ne souligne son double sens.",
          "Les deux versions restent crédibles.",
        ],
        durationMinutes: 20,
        observe:
          "Testez la phrase hors contexte : si elle paraît suspecte seule, elle le sera aussi dans la scène.",
      },
      {
        id: "foreshadowing-relecture",
        title: "La relecture récompensée",
        objective:
          "Vérifier qu'une révélation modifie le sens de scènes antérieures sans les rendre incohérentes.",
        instructions:
          "1. Écrivez la révélation d'un secret en 150 mots.\n2. Choisissez trois scènes antérieures de 100 mots chacune qui doivent être relues à sa lumière.\n3. Dans chaque scène, placez un appui discret différent : un objet, une phrase, un geste.\n4. Relisez les trois scènes après la révélation et vérifiez leur cohérence.\n5. Supprimez tout appui qui devient trop visible une fois la révélation connue.",
        criteria: [
          "La révélation change le sens des trois scènes.",
          "Chaque scène contient un appui distinct.",
          "Aucune scène antérieure ne devient incohérente.",
          "Les appuis restent discrets à la première lecture.",
        ],
        durationMinutes: 30,
        observe:
          "Demandez à quelqu'un de lire les scènes avant la révélation, puis après. Notez ce qu'il avait compris : c'est la mesure de votre préparation.",
      },
    ],
    manuscriptPrompt:
      "Choisissez la révélation la plus importante de votre manuscrit et listez les trois indices qui la préparent. Si vous n'en trouvez pas trois, cherchez dans les scènes déjà écrites un détail que vous pouvez transformer en appui.",
  },
];

export const WORKSHOP_BY_SLUG: Record<string, Workshop> = Object.fromEntries(
  WORKSHOPS.map((w) => [w.slug, w]),
);

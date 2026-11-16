import { and, eq } from "drizzle-orm";
import { DEMO_STORIES, countWords } from "@plume/shared";
import type { Database } from "./client";
import {
  chapters,
  chapterVersions,
  characters,
  locations,
  plotThreads,
  profiles,
  publications,
  readingProgress,
  stories,
  storyFollows,
  storyIdeas,
  timelineEvents,
  userPreferences,
  users,
} from "./schema";
import { hashPassword } from "../auth/password";
import { contentHash } from "../services/stories";
import { analyzeChapter } from "../services/ai/analysis";

export const DEMO_PASSWORD = "Plume2026";

const DRAFT_CHAPTERS = [
  {
    title: "La chambre qui écoute",
    content: `La maison de la rue des Lilas n'avait pas de numéro. Les habitants du quartier disaient qu'elle avait refusé le sien, un matin d'automne, et que personne n'avait osé insister.

Élise poussa la grille. Le jardin était en avance sur la saison : des roses de novembre, lourdes et pâles, penchées au-dessus d'un banc de pierre. Elle tenait à la main la lettre de sa tante, reçue la veille, et dont l'écriture tremblait à peine.

« Viens vider la chambre. Ne touche à rien avant d'avoir lu le carnet. »

Le carnet l'attendait sur la table de l'entrée, ouvert à la première page. Une seule phrase y était écrite, à l'encre bleue : *Une maison se souvient de ce qu'on lui cache.*

Élise referma le carnet sans le lire. Elle avait vingt-sept ans, un travail qu'elle n'aimait plus, et une sœur jumelle disparue depuis six ans. Elle n'était pas venue pour les souvenirs.

La chambre se trouvait au deuxième étage. La porte était peinte en vert, d'un vert de bibliothèque, et la poignée brillait comme si quelqu'un venait de la toucher. Élise posa la main sur le bois. Sous ses doigts, la maison fit un bruit très doux, un bruit de gorge, comme une phrase retenue.

Elle ouvrit.

L'odeur la frappa avant la lumière : cire, papier, et quelque chose de plus ancien, une odeur de terre après la pluie. Les rideaux étaient tirés. Sur le bureau, une lampe allumée éclairait un fauteuil vide.

— Tu as mis du temps, dit une voix derrière elle.

Élise se retourna. Il n'y avait personne dans le couloir. La voix avait pourtant parlé à hauteur d'épaule, avec l'accent traînant de sa sœur.

Elle aurait dû partir. Elle resta.`,
  },
  {
    title: "Le carnet bleu",
    content: `Le carnet contenait trois cent douze pages. Élise les compta deux fois. La première, parce qu'elle ne parvenait pas à croire qu'une maison pût garder un tel registre ; la seconde, parce que le nombre changeait.

Page trois : une liste de courses.
Page dix-sept : le plan d'une chambre qui ressemblait à celle où elle se tenait, mais avec un lit à baldaquin et une fenêtre en ogive.
Page quarante-deux : son prénom, suivi d'une date — le 14 novembre, celle du jour.

Elle tourna la page. L'encre était encore humide.

« Élise est venue. Elle a ouvert la porte à onze heures. Elle n'a pas encore compris que la chambre attendait quelqu'un d'autre. »

Un frisson lui parcourut les bras. Elle referma le carnet, le posa sur le bureau, puis le reprit. Le papier était tiède.

— Ce n'est pas possible, murmura-t-elle.

— Si, dit la maison.

Cette fois, la voix venait de la cheminée. Élise s'approcha. Dans l'âtre, il n'y avait pas de cendres, mais un miroir couvert de poussière. Elle le nettoya du revers de sa manche.

Son reflet apparut avec une seconde de retard. Il la regardait avec attention, la tête légèrement inclinée, comme on écoute une histoire qu'on connaît déjà.

— Tu n'es pas moi, dit Élise.

Le reflet sourit. Sur le bureau, le carnet s'ouvrit tout seul à la dernière page. Une phrase y fut écrite, lentement, d'une écriture qui était la sienne :

« Ne laisse pas la chambre choisir. »

Élise recula. Derrière elle, la porte claqua.`,
  },
  {
    title: "Ce que la maison garde",
    content: `La clé était dans la serrure, de l'autre côté. Élise le comprit en entendant le petit cliquetis, puis le silence qui suivit. La maison avait refermé la porte avec la délicatesse d'une hôtesse.

Elle s'assit sur le tapis, dos au lit, et essaya de respirer lentement. Le miroir, sur le mur, ne reflétait plus la chambre. Il montrait un couloir qu'elle ne connaissait pas, éclairé par une fenêtre en ogive. Au fond du couloir, une silhouette d'enfant lisait, assise par terre.

— Margot ?

Le reflet ne répondit pas. L'enfant tourna une page. Élise se leva et posa la main sur la vitre. Elle était froide, puis tiède, puis froide à nouveau, comme une main qu'on tient puis qu'on lâche.

— La chambre garde ce qu'on lui donne, dit la voix. Ta sœur lui a donné son nom. Toi, tu as donné ton temps.

— Rends-la-moi.

— Ce n'est pas moi qui la retiens.

Élise regarda le carnet. La dernière page était maintenant couverte d'une liste de noms, tous barrés, sauf un : le sien. Sous son nom, une date, et une phrase qu'elle lut à voix haute sans le vouloir :

« Le 15 novembre, Élise choisira de rester. »

Elle prit le carnet, l'ouvrit à la page du plan, et chercha la fenêtre en ogive. Elle n'était pas sur le mur. Elle était dessinée dans le papier, à l'endroit exact où le miroir se trouvait.

Alors Élise fit la seule chose que la chambre n'avait pas prévue. Elle déchira la page.

La maison cria.`,
  },
];

export async function seedDatabase(db: Database): Promise<{ created: boolean; demoPassword: string }> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "lecteur@plume.app"))
    .limit(1);
  if (existing) {
    return { created: false, demoPassword: DEMO_PASSWORD };
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const [reader] = await db
    .insert(users)
    .values({
      email: "lecteur@plume.app",
      passwordHash,
      plan: "plus",
      emailVerifiedAt: new Date(),
    })
    .returning();
  if (!reader) throw new Error("Seed: lecteur impossible.");
  await db.insert(profiles).values({
    userId: reader.id,
    pseudonym: "Lectrice de démonstration",
    bio: "Compte de démonstration pour la lecture et la bibliothèque.",
    avatarMotif: "moon",
    goal: "read",
    experience: "beginner",
    genres: ["Fantasy", "Romance", "Mystère"],
    skills: [],
    onboardingCompletedAt: new Date(),
  });
  await db.insert(userPreferences).values({ userId: reader.id });

  for (const demo of DEMO_STORIES) {
    const email = `${demo.slug}@demo.plume.app`;
    const [author] = await db
      .insert(users)
      .values({ email, passwordHash, plan: "plus", emailVerifiedAt: new Date() })
      .returning();
    if (!author) continue;
    await db.insert(profiles).values({
      userId: author.id,
      pseudonym: demo.author,
      bio: demo.authorBio,
      avatarMotif: demo.coverMotif,
      goal: "write",
      experience: "intermediate",
      genres: [demo.genre, ...demo.secondaryGenres],
      skills: ["characters", "tension"],
      onboardingCompletedAt: new Date(),
    });
    await db.insert(userPreferences).values({ userId: author.id });

    const [story] = await db
      .insert(stories)
      .values({
        authorId: author.id,
        title: demo.title,
        synopsis: demo.synopsis,
        genre: demo.genre,
        secondaryGenres: demo.secondaryGenres,
        keywords: demo.keywords,
        contentWarnings: demo.contentWarnings,
        status: demo.status,
        visibility: "public",
        coverMotif: demo.coverMotif,
        publishedAt: new Date(),
      })
      .returning();
    if (!story) continue;

    for (let index = 0; index < demo.chapters.length; index++) {
      const chapter = demo.chapters[index]!;
      const wordCount = countWords(chapter.content);
      const [row] = await db
        .insert(chapters)
        .values({
          storyId: story.id,
          title: chapter.title,
          content: chapter.content,
          wordCount,
          status: "published",
          orderIndex: index + 1,
          version: 1,
          lastSnapshotAt: new Date(),
          publishedAt: new Date(),
        })
        .returning();
      if (!row) continue;
      const [version] = await db
        .insert(chapterVersions)
        .values({
          chapterId: row.id,
          storyId: story.id,
          versionNumber: 1,
          title: row.title,
          content: row.content,
          wordCount,
          contentHash: contentHash(row.content),
          reason: "publish",
          createdBy: author.id,
        })
        .returning();
      await db.insert(publications).values({
        storyId: story.id,
        chapterId: row.id,
        versionId: version?.id ?? null,
      });
      if (index === 0) {
        await db.insert(storyFollows).values({ userId: reader.id, storyId: story.id }).onConflictDoNothing();
        await db.insert(readingProgress).values({
          userId: reader.id,
          storyId: story.id,
          chapterId: row.id,
          progress: 0.18,
        });
      }
    }
  }

  // Compte auteur de démonstration, avec un manuscrit privé modifiable.
  const [authorUser] = await db
    .insert(users)
    .values({
      email: "auteur@plume.app",
      passwordHash,
      plan: "premium",
      emailVerifiedAt: new Date(),
    })
    .returning();
  if (!authorUser) throw new Error("Seed: auteur impossible.");
  await db.insert(profiles).values({
    userId: authorUser.id,
    pseudonym: "Aline Moreau",
    bio: "Autrice de démonstration. Travaille un roman gothique sur la mémoire des maisons.",
    avatarMotif: "quill",
    goal: "write",
    experience: "intermediate",
    genres: ["Fantastique", "Mystère", "Romance"],
    skills: ["descriptions", "pacing", "foreshadowing"],
    onboardingCompletedAt: new Date(),
  });
  await db.insert(userPreferences).values({ userId: authorUser.id });

  const [draftStory] = await db
    .insert(stories)
    .values({
      authorId: authorUser.id,
      title: "La Chambre des échos",
      subtitle: "Un roman sur ce que les maisons refusent d'oublier",
      synopsis:
        "Élise revient dans la maison de sa tante pour vider une chambre. Elle y trouve un carnet qui écrit à l'avance ce qu'elle va faire, un miroir qui montre sa sœur disparue, et une porte qui se referme de l'autre côté. Pour sortir, elle devra comprendre ce que la maison attend d'elle — et pourquoi elle a déjà choisi son nom.",
      genre: "Fantastique",
      secondaryGenres: ["Mystère", "Romance"],
      keywords: ["maison hantée", "deuil", "carnet", "miroir", "sœurs"],
      contentWarnings: ["Mort", "Troubles mentaux"],
      status: "ongoing",
      visibility: "private",
      coverMotif: "arch",
    })
    .returning();
  if (!draftStory) throw new Error("Seed: histoire impossible.");

  for (let index = 0; index < DRAFT_CHAPTERS.length; index++) {
    const chapter = DRAFT_CHAPTERS[index]!;
    const wordCount = countWords(chapter.content);
    const [row] = await db
      .insert(chapters)
      .values({
        storyId: draftStory.id,
        title: chapter.title,
        content: chapter.content,
        wordCount,
        status: index === 0 ? "draft" : index === 1 ? "draft" : "draft",
        orderIndex: index + 1,
        version: 1,
        lastSnapshotAt: new Date(),
      })
      .returning();
    if (!row) continue;
    await db.insert(chapterVersions).values({
      chapterId: row.id,
      storyId: draftStory.id,
      versionNumber: 1,
      title: row.title,
      content: row.content,
      wordCount,
      contentHash: contentHash(row.content),
      reason: "manual",
      createdBy: authorUser.id,
    });
  }

  await db.insert(characters).values([
    {
      storyId: draftStory.id,
      name: "Élise Varenne",
      role: "Protagoniste",
      summary: "Restauratrice de livres, 27 ans, revenue dans la maison de sa tante.",
      motivation: "Retrouver sa sœur jumelle Margot, disparue six ans plus tôt.",
      fear: "Découvrir qu'elle a elle-même provoqué la disparition.",
      secret: "Elle a brûlé le carnet de Margot avant de partir.",
      arc: "Passer du déni à l'acceptation de sa part de responsabilité.",
    },
    {
      storyId: draftStory.id,
      name: "Margot Varenne",
      role: "Sœur disparue",
      summary: "Jumelle d'Élise, aperçue dans le miroir de la chambre.",
      motivation: "Être reconnue et nommée.",
      fear: "Être oubliée une seconde fois.",
      secret: "Elle n'est pas morte : elle a choisi de rester.",
    },
    {
      storyId: draftStory.id,
      name: "La Maison",
      role: "Antagoniste ambigu",
      summary: "Une présence qui conserve les noms et les souvenirs qu'on lui confie.",
      motivation: "Garder ce qu'on lui donne pour ne pas disparaître.",
      fear: "Le vide laissé par les départs.",
    },
  ]);

  await db.insert(locations).values([
    {
      storyId: draftStory.id,
      name: "La chambre verte",
      description: "Chambre du deuxième étage, rideaux tirés, bureau et miroir.",
      atmosphere: "Tiède, silencieuse, avec une odeur de cire et de terre mouillée.",
      history: "Chambre de Margot, fermée depuis sa disparition.",
    },
    {
      storyId: draftStory.id,
      name: "Le jardin de novembre",
      description: "Jardin clos où les roses fleurissent hors saison.",
      atmosphere: "Trop calme, comme une photographie.",
    },
  ]);

  await db.insert(plotThreads).values([
    {
      storyId: draftStory.id,
      name: "Le carnet qui écrit à l'avance",
      description: "Le carnet consigne les actions d'Élise avant qu'elle ne les accomplisse.",
      stakes: "S'il écrit la fin, Élise perdra la possibilité de choisir.",
      status: "active",
    },
    {
      storyId: draftStory.id,
      name: "La vérité sur Margot",
      description: "Margot a choisi de rester dans la maison ; Élise ignore pourquoi.",
      stakes: "Reconnaître sa responsabilité sans se détruire.",
      status: "planned",
    },
  ]);

  await db.insert(timelineEvents).values([
    {
      storyId: draftStory.id,
      title: "Disparition de Margot",
      description: "Margot disparaît dans la maison, six ans avant le début du récit.",
      fictionalDate: "Automne, il y a six ans",
      narrativeOrder: 1,
    },
    {
      storyId: draftStory.id,
      title: "Élise ouvre la chambre verte",
      description: "Elle entend la voix de sa sœur et décide de rester.",
      fictionalDate: "14 novembre",
      narrativeOrder: 2,
    },
  ]);

  await db.insert(storyIdeas).values([
    {
      storyId: draftStory.id,
      content: "Le miroir montre toujours une scène décalée d'une minute : utiliser ce décalage pour un retournement.",
      kind: "revelation",
    },
    {
      storyId: draftStory.id,
      content: "Faire parler la maison uniquement par des phrases empruntées aux carnets précédents.",
      kind: "dialogue",
    },
  ]);

  // Analyse de démonstration (simulation locale, clairement signalée).
  const [firstChapter] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.storyId, draftStory.id), eq(chapters.orderIndex, 1)))
    .limit(1);
  if (firstChapter) {
    try {
      await analyzeChapter(db, authorUser.id, {
        storyId: draftStory.id,
        chapterId: firstChapter.id,
        skill: "foreshadowing",
        scope: "chapter",
      });
    } catch {
      // Une analyse de démonstration ne doit jamais empêcher le seed.
    }
  }

  return { created: true, demoPassword: DEMO_PASSWORD };
}

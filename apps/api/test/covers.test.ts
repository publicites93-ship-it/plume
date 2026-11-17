import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, type BuiltApp } from "../src/app";
import {
  registerUser,
  setPlan,
  setupDatabase,
  teardown,
  type TestContext,
  type TestUser,
} from "./helpers";

let context: TestContext;
let built: BuiltApp;
let author: TestUser;

// Plus petit JPEG utile au test : seule la signature binaire compte pour le serveur.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(400, 7)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(400, 3),
]);

beforeAll(async () => {
  context = await setupDatabase();
  built = await buildApp({ db: context.db, logger: false });
  await built.app.ready();
  author = await registerUser(context.db);
  await setPlan(context.db, author.userId, "premium");
});

afterAll(async () => {
  await built.app.close();
  await teardown(context);
});

describe("couvertures personnalisées", () => {
  it("enregistre une couverture et la protège tant que l'histoire est privée", async () => {
    const story = await author.caller.stories.create({ title: "Couverture", visibility: "private" });
    const { coverAssetUrl } = await author.caller.stories.setCover({
      storyId: story.id,
      imageBase64: JPEG.toString("base64"),
    });
    expect(coverAssetUrl).toMatch(new RegExp(`^/covers/${story.id}\\?v=\\d+$`));

    const anonymous = await built.app.inject({ method: "GET", url: coverAssetUrl! });
    expect(anonymous.statusCode).toBe(404);

    const owner = await built.app.inject({
      method: "GET",
      url: coverAssetUrl!,
      headers: { authorization: `Bearer ${author.accessToken}` },
    });
    expect(owner.statusCode).toBe(200);
    expect(owner.headers["content-type"]).toBe("image/jpeg");
    expect(owner.headers["cache-control"]).toContain("private");
    expect(owner.rawPayload.equals(JPEG)).toBe(true);

    await author.caller.stories.update({ id: story.id, visibility: "public" });
    const publicRead = await built.app.inject({ method: "GET", url: coverAssetUrl! });
    expect(publicRead.statusCode).toBe(200);
    expect(publicRead.headers["cache-control"]).toContain("public");
  });

  it("remplace puis retire la couverture", async () => {
    const story = await author.caller.stories.create({ title: "Remplacement", visibility: "public" });
    const first = await author.caller.stories.setCover({ storyId: story.id, imageBase64: JPEG.toString("base64") });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await author.caller.stories.setCover({ storyId: story.id, imageBase64: PNG.toString("base64") });
    expect(second.coverAssetUrl).not.toBe(first.coverAssetUrl);
    const read = await built.app.inject({ method: "GET", url: second.coverAssetUrl! });
    expect(read.headers["content-type"]).toBe("image/png");

    await author.caller.stories.removeCover({ storyId: story.id });
    const after = await built.app.inject({ method: "GET", url: second.coverAssetUrl! });
    expect(after.statusCode).toBe(404);
    const dashboard = await author.caller.stories.dashboard({ storyId: story.id });
    expect(dashboard.story.coverAssetUrl).toBeNull();
  });

  it("refuse un faux fichier image et l'histoire d'un autre compte", async () => {
    const story = await author.caller.stories.create({ title: "Refus", visibility: "private" });
    await expect(
      author.caller.stories.setCover({
        storyId: story.id,
        imageBase64: Buffer.from("<script>alert(1)</script>".repeat(10)).toString("base64"),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const intruder = await registerUser(context.db);
    await expect(
      intruder.caller.stories.setCover({ storyId: story.id, imageBase64: JPEG.toString("base64") }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuse une image trop lourde", async () => {
    const story = await author.caller.stories.create({ title: "Lourde", visibility: "private" });
    const heavy = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(610 * 1024)]);
    await expect(
      author.caller.stories.setCover({ storyId: story.id, imageBase64: heavy.toString("base64") }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

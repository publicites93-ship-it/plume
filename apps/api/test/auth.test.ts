import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TRPCError } from "@trpc/server";
import { publicCaller, registerUser, setupDatabase, teardown, type TestContext } from "./helpers";

let context: TestContext;

beforeAll(async () => {
  context = await setupDatabase();
});
afterAll(async () => {
  await teardown(context);
});

describe("authentification", () => {
  it("crée un compte, un profil et une préférence par défaut", async () => {
    const user = await registerUser(context.db, { pseudonym: "Aurore Test" });
    const me = await user.caller.auth.me();
    expect(me.profile.pseudonym).toBe("Aurore Test");
    expect(me.profile.onboardingCompleted).toBe(false);
    expect(me.plan.plan).toBe("free");
    expect(me.preferences.readingTheme).toBe("night");
  });

  it("refuse un e-mail déjà utilisé", async () => {
    const email = `duplicate-${Date.now()}@plume.test`;
    await registerUser(context.db, { email, pseudonym: `Premier ${Date.now()}` });
    const caller = publicCaller(context.db);
    await expect(
      caller.auth.signUp({
        email,
        password: "PlumeTest1",
        pseudonym: `Second ${Date.now()}`,
        acceptedTerms: true,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refuse un mot de passe incorrect sans révéler l'existence du compte", async () => {
    const email = `wrong-${Date.now()}@plume.test`;
    await registerUser(context.db, { email, pseudonym: `Wrong ${Date.now()}` });
    const caller = publicCaller(context.db);
    await expect(
      caller.auth.signIn({ email, password: "MauvaisPass1" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.auth.signIn({ email: "inconnu@plume.test", password: "MauvaisPass1" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("fait tourner le refresh token et détecte sa réutilisation", async () => {
    const user = await registerUser(context.db);
    const caller = publicCaller(context.db);
    const rotated = await caller.auth.refresh({ refreshToken: user.refreshToken });
    expect(rotated.tokens.accessToken).not.toBe(user.accessToken);
    await expect(
      caller.auth.refresh({ refreshToken: user.refreshToken }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("termine l'onboarding et conserve les préférences", async () => {
    const user = await registerUser(context.db);
    const me = await user.caller.auth.completeOnboarding({
      goal: "both",
      genres: ["Fantasy", "Romance"],
      experience: "beginner",
      skills: ["dialogues", "tension"],
      notifications: {
        newChapters: true,
        comments: false,
        coaching: true,
        progress: false,
      },
    });
    expect(me.profile.onboardingCompleted).toBe(true);
    expect(me.profile.goal).toBe("both");
    expect(me.preferences.notifications.comments).toBe(false);
  });

  it("rejette une entrée invalide", async () => {
    const caller = publicCaller(context.db);
    await expect(
      caller.auth.signUp({
        email: "pas-un-email",
        password: "court",
        pseudonym: "x",
        acceptedTerms: true,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("contrôle d'accès", () => {
  it("refuse les procédures protégées sans jeton", async () => {
    const caller = publicCaller(context.db);
    await expect(caller.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuse un jeton falsifié", async () => {
    const { createContext } = await import("../src/trpc/trpc");
    const { appRouter } = await import("../src/trpc/router");
    const ctx = await createContext({
      db: context.db,
      authorization: "Bearer jeton.invalide.ici",
    });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("export et suppression", () => {
  it("exporte les données du compte sans secret", async () => {
    const user = await registerUser(context.db);
    const exported = await user.caller.auth.exportData();
    expect(exported.account.user.email).toContain("@plume.test");
    expect(JSON.stringify(exported)).not.toContain("passwordHash");
    expect(exported.formatVersion).toBe(1);
  });

  it("supprime le compte avec confirmation et mot de passe", async () => {
    const user = await registerUser(context.db);
    await expect(
      user.caller.auth.deleteAccount({ password: "PlumeTest1", confirmation: "SUPPRIMER" }),
    ).resolves.toMatchObject({ ok: true });
    await expect(user.caller.auth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("limitation de débit", () => {
  it("bloque après trop de tentatives de connexion", async () => {
    const caller = publicCaller(context.db);
    let lastError: TRPCError | null = null;
    for (let i = 0; i < 25; i++) {
      try {
        await caller.auth.signIn({
          email: `rate-${i}@plume.test`,
          password: "PlumeTest1",
        });
      } catch (error) {
        lastError = error as TRPCError;
        if (lastError.code === "TOO_MANY_REQUESTS") break;
      }
    }
    expect(lastError?.code).toBe("TOO_MANY_REQUESTS");
  });
});

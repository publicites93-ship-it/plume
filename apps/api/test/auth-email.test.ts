import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetConfigForTests } from "../src/config";
import { clearTestOutbox, readTestOutbox } from "../src/services/email";
import {
  publicCaller,
  setupDatabase,
  teardown,
  TEST_PASSWORD,
  type TestContext,
} from "./helpers";

process.env.REQUIRE_EMAIL_VERIFICATION = "true";
process.env.EMAIL_PROVIDER = "test";
process.env.PUBLIC_APP_URL = "http://localhost:4000";

let context: TestContext;

beforeAll(async () => {
  resetConfigForTests();
  context = await setupDatabase();
});

afterAll(async () => {
  await teardown(context);
  process.env.REQUIRE_EMAIL_VERIFICATION = "false";
  resetConfigForTests();
});

function tokenFrom(emailText: string): string {
  const match = emailText.match(/token=([A-Za-z0-9_-]+)/);
  if (!match?.[1]) throw new Error("Jeton absent de l'e-mail de test.");
  return match[1];
}

function lastEmailTo(address: string) {
  const emails = readTestOutbox().filter((email) => email.to === address);
  const email = emails[emails.length - 1];
  if (!email) throw new Error(`Aucun e-mail pour ${address}.`);
  return email;
}

describe("vérification d'e-mail obligatoire", () => {
  it("crée un compte inactif et envoie un lien de 24 heures", async () => {
    clearTestOutbox();
    const email = `verif-${Date.now()}@plume.test`;
    const caller = publicCaller(context.db);
    const result = await caller.auth.signUp({
      email,
      password: TEST_PASSWORD,
      pseudonym: `Verif ${Date.now()}`,
      acceptedTerms: true,
    });
    expect(result.verificationRequired).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(result.tokens).toBeUndefined();

    const mail = lastEmailTo(email);
    expect(mail.subject).toContain("Confirmez");
    expect(mail.text).toContain("24 heures");
    expect(mail.text).toContain("plume://verifier-email");

    await expect(
      caller.auth.signIn({ email, password: TEST_PASSWORD }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      cause: { details: { code: "EMAIL_NOT_VERIFIED" } },
    });

    const verified = await caller.auth.verifyEmail({ token: tokenFrom(mail.text) });
    expect(verified.ok).toBe(true);
    expect(verified.tokens.accessToken.length).toBeGreaterThan(20);

    const signedIn = await caller.auth.signIn({ email, password: TEST_PASSWORD });
    expect(signedIn.tokens.refreshToken.length).toBeGreaterThan(20);

    await expect(
      caller.auth.verifyEmail({ token: tokenFrom(mail.text) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("limite le renvoi à un e-mail par minute", async () => {
    const email = `resend-${Date.now()}@plume.test`;
    const caller = publicCaller(context.db);
    await caller.auth.signUp({
      email,
      password: TEST_PASSWORD,
      pseudonym: `Resend ${Date.now()}`,
      acceptedTerms: true,
    });
    await expect(caller.auth.resendVerification({ email })).resolves.toEqual({ ok: true });
    await expect(caller.auth.resendVerification({ email })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("ne révèle pas si une adresse existe lors du renvoi", async () => {
    const caller = publicCaller(context.db);
    await expect(
      caller.auth.resendVerification({ email: `absent-${Date.now()}@plume.test` }),
    ).resolves.toEqual({ ok: true });
  });
});

describe("réinitialisation du mot de passe", () => {
  it("consomme un lien d'une heure et ferme les autres sessions", async () => {
    clearTestOutbox();
    const email = `reset-${Date.now()}@plume.test`;
    const caller = publicCaller(context.db);
    await caller.auth.signUp({
      email,
      password: TEST_PASSWORD,
      pseudonym: `Reset ${Date.now()}`,
      acceptedTerms: true,
    });
    const verification = lastEmailTo(email);
    const verified = await caller.auth.verifyEmail({ token: tokenFrom(verification.text) });
    const oldRefresh = verified.tokens.refreshToken;

    await caller.auth.requestPasswordReset({ email });
    const resetMail = lastEmailTo(email);
    expect(resetMail.subject).toContain("Réinitialiser");
    expect(resetMail.text).toContain("1 heure");

    const newPassword = "NouveauPlume2026";
    await caller.auth.resetPassword({
      token: tokenFrom(resetMail.text),
      newPassword,
    });

    await expect(
      caller.auth.refresh({ refreshToken: oldRefresh }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(caller.auth.signIn({ email, password: TEST_PASSWORD })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.auth.signIn({ email, password: newPassword })).resolves.toMatchObject({
      userId: expect.any(String),
    });

    await expect(
      caller.auth.resetPassword({ token: tokenFrom(resetMail.text), newPassword }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("répond sans révéler l'existence du compte", async () => {
    const caller = publicCaller(context.db);
    await expect(
      caller.auth.requestPasswordReset({ email: `inconnu-${Date.now()}@plume.test` }),
    ).resolves.toEqual({ ok: true });
  });
});

describe("politique de mot de passe", () => {
  it("exige 12 caractères, une majuscule, une minuscule et un chiffre", async () => {
    const caller = publicCaller(context.db);
    const base = {
      email: `policy-${Date.now()}@plume.test`,
      pseudonym: `Policy ${Date.now()}`,
      acceptedTerms: true as const,
    };
    await expect(
      caller.auth.signUp({ ...base, password: "Plume2026aa" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.auth.signUp({ ...base, password: "plume2026aaaa" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.auth.signUp({ ...base, password: "PLUME2026AAAA" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.auth.signUp({ ...base, password: "PlumeSansChiffre" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

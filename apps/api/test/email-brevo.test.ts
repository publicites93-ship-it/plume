import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "../src/config";
import { parseSender, sendPasswordResetEmail } from "../src/services/email";

beforeAll(() => {
  process.env.EMAIL_PROVIDER = "brevo";
  process.env.BREVO_API_KEY = "cle-brevo-test";
  process.env.EMAIL_FROM = "Plume <plume.expediteur@example.com>";
  process.env.PUBLIC_APP_URL = "https://plume.example";
  resetConfigForTests();
});

afterAll(() => {
  vi.unstubAllGlobals();
  process.env.EMAIL_PROVIDER = "test";
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
  resetConfigForTests();
});

describe("e-mails via Brevo", () => {
  it("découpe l'expéditeur « Nom <adresse> »", () => {
    expect(parseSender("Plume <a@b.fr>")).toEqual({ name: "Plume", email: "a@b.fr" });
    expect(parseSender("a@b.fr")).toEqual({ email: "a@b.fr" });
  });

  it("envoie l'e-mail de réinitialisation à l'API Brevo", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ messageId: "1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendPasswordResetEmail("lectrice@example.com", "jeton-secret-de-test-123456");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("cle-brevo-test");
    const body = JSON.parse(String(init.body));
    expect(body.sender).toEqual({ name: "Plume", email: "plume.expediteur@example.com" });
    expect(body.to).toEqual([{ email: "lectrice@example.com" }]);
    expect(body.htmlContent).toContain("https://plume.example/reinitialiser-mot-de-passe");
  });

  it("signale un refus de Brevo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unauthorized", { status: 401 })));
    await expect(sendPasswordResetEmail("x@example.com", "jeton-secret-de-test-123456")).rejects.toThrow(
      "401",
    );
  });
});

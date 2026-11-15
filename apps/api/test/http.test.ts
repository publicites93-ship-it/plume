import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, type BuiltApp } from "../src/app";
import { setupDatabase, teardown, type TestContext } from "./helpers";

let context: TestContext;
let built: BuiltApp;

beforeAll(async () => {
  context = await setupDatabase();
  built = await buildApp({ db: context.db, logger: false });
  await built.app.ready();
});
afterAll(async () => {
  await built.app.close();
  await teardown(context);
});

describe("API HTTP", () => {
  it("expose un point de santé", async () => {
    const response = await built.app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, service: "plume-api" });
  });

  it("répond au routeur tRPC", async () => {
    const response = await built.app.inject({
      method: "GET",
      url: "/trpc/health?input=%7B%7D",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result.data.json.ok).toBe(true);
  });

  it("renvoie 401 sur une procédure protégée sans session", async () => {
    const response = await built.app.inject({
      method: "GET",
      url: "/trpc/auth.me?input=%7B%7D",
    });
    expect(response.statusCode).toBe(401);
  });

  it("applique les en-têtes de sécurité", async () => {
    const response = await built.app.inject({ method: "GET", url: "/health" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
  });
});

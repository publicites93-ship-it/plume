import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { resetConfigForTests } from "../src/config";
import { subscriptions, users } from "../src/db/schema";
import { buildApp, type BuiltApp } from "../src/app";
import { verifyStripeSignature } from "../src/services/billing";
import { TEST_PASSWORD, registerUser, setupDatabase, teardown, type TestContext } from "./helpers";

const WEBHOOK_SECRET = "whsec_test_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_cle";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_PRICE_PLUS = "price_plus";
process.env.STRIPE_PRICE_PREMIUM = "price_premium";
process.env.PUBLIC_APP_URL = "https://plume.example";

let context: TestContext;
let built: BuiltApp;

/** Faux Stripe : un abonnement en mémoire, relu par l'API à chaque événement. */
const fakeSubs = new Map<string, Record<string, unknown>>();
const calls: Array<{ method: string; url: string; body: string }> = [];

function stripeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = String(input);
  const method = init?.method ?? "GET";
  calls.push({ method, url, body: String(init?.body ?? "") });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (url.endsWith("/checkout/sessions")) return json(200, { id: "cs_1", url: "https://checkout.stripe.test/cs_1" });
  if (url.endsWith("/billing_portal/sessions")) return json(200, { url: "https://billing.stripe.test/p_1" });
  const match = url.match(/\/subscriptions\/([^/?]+)$/);
  if (match) {
    const sub = fakeSubs.get(decodeURIComponent(match[1]!));
    if (!sub) return json(404, { error: { type: "invalid_request_error", message: "No such subscription" } });
    if (method === "DELETE") sub.status = "canceled";
    return json(200, sub);
  }
  return json(404, { error: { message: "inconnu" } });
}

function signed(event: unknown) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return { payload, header: `t=${t},v1=${v1}` };
}

async function sendEvent(event: unknown, header?: string) {
  const s = signed(event);
  return built.app.inject({
    method: "POST",
    url: "/stripe/webhook",
    headers: { "content-type": "application/json", "stripe-signature": header ?? s.header },
    payload: s.payload,
  });
}

beforeAll(async () => {
  resetConfigForTests();
  context = await setupDatabase();
  built = await buildApp({ db: context.db, logger: false });
  await built.app.ready();
});

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(stripeFetch));
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await built.app.close();
  await teardown(context);
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PLUS", "STRIPE_PRICE_PREMIUM"]) {
    delete process.env[key];
  }
  resetConfigForTests();
});

describe("paiement Stripe", () => {
  it("vérifie la signature Stripe en temps constant et refuse un webhook falsifié", async () => {
    const { payload, header } = signed({ id: "evt", type: "x", data: { object: {} } });
    expect(verifyStripeSignature(Buffer.from(payload), header, WEBHOOK_SECRET)).toBe(true);
    expect(verifyStripeSignature(Buffer.from(payload + " "), header, WEBHOOK_SECRET)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(payload), header, "autre_secret")).toBe(false);
    const forged = await sendEvent({ id: "evt", type: "customer.subscription.updated", data: { object: { id: "sub_x" } } }, "t=1,v1=00");
    expect(forged.statusCode).toBe(400);
  });

  it("ouvre Checkout puis active Plume+ à la réception du webhook", async () => {
    const user = await registerUser(context.db);
    expect(await user.caller.billing.status()).toMatchObject({ available: true, subscription: null, canManage: false });

    const { url } = await user.caller.billing.checkout({ plan: "plus" });
    expect(url).toBe("https://checkout.stripe.test/cs_1");
    const body = decodeURIComponent(calls[0]!.body);
    expect(body).toContain("line_items[0][price]=price_plus");
    expect(body).toContain(`client_reference_id=${user.userId}`);
    expect(body).toContain("success_url=https://plume.example/paiement/succes");

    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400;
    fakeSubs.set("sub_plus", {
      id: "sub_plus",
      status: "active",
      customer: "cus_1",
      metadata: { userId: user.userId, plan: "plus" },
      items: { data: [{ current_period_end: periodEnd, price: { id: "price_plus" } }] },
    });
    const response = await sendEvent({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { subscription: "sub_plus", client_reference_id: user.userId } },
    });
    expect(response.statusCode).toBe(200);

    const me = await user.caller.auth.me();
    expect(me.plan).toMatchObject({ plan: "plus", creditsLimit: 15 });
    const status = await user.caller.billing.status();
    expect(status.subscription).toMatchObject({ plan: "plus", status: "active", cancelAtPeriodEnd: false });
    expect(status.canManage).toBe(true);
    expect(await user.caller.billing.portal()).toEqual({ url: "https://billing.stripe.test/p_1" });

    // Un second achat est refusé tant qu'un abonnement est actif.
    await expect(user.caller.billing.checkout({ plan: "premium" })).rejects.toMatchObject({ code: "CONFLICT" });

    // Rejouer l'événement ne crée pas de doublon.
    await sendEvent({ id: "evt_1", type: "checkout.session.completed", data: { object: { subscription: "sub_plus" } } });
    const rows = await context.db.select().from(subscriptions).where(eq(subscriptions.userId, user.userId));
    expect(rows).toHaveLength(1);
  });

  it("garde la formule jusqu'à la fin de période après résiliation, puis repasse en Gratuit", async () => {
    const user = await registerUser(context.db);
    const periodEnd = Math.floor(Date.now() / 1000) + 10 * 86_400;
    fakeSubs.set("sub_prem", {
      id: "sub_prem",
      status: "active",
      customer: "cus_2",
      cancel_at_period_end: true,
      current_period_end: periodEnd,
      metadata: { userId: user.userId },
      items: { data: [{ price: { id: "price_premium" } }] },
    });
    await sendEvent({ id: "evt_2", type: "customer.subscription.updated", data: { object: { id: "sub_prem" } } });
    let me = await user.caller.auth.me();
    expect(me.plan).toMatchObject({ plan: "premium", creditsLimit: 30 });
    expect((await user.caller.billing.status()).subscription?.cancelAtPeriodEnd).toBe(true);

    fakeSubs.get("sub_prem")!.status = "canceled";
    await sendEvent({ id: "evt_3", type: "customer.subscription.deleted", data: { object: { id: "sub_prem" } } });
    me = await user.caller.auth.me();
    expect(me.plan).toMatchObject({ plan: "free", creditsLimit: 3 });
  });

  it("résilie l'abonnement Stripe avant de supprimer le compte", async () => {
    const user = await registerUser(context.db);
    fakeSubs.set("sub_del", {
      id: "sub_del",
      status: "active",
      customer: "cus_3",
      current_period_end: Math.floor(Date.now() / 1000) + 86_400,
      metadata: { userId: user.userId },
      items: { data: [{ price: { id: "price_plus" } }] },
    });
    await sendEvent({ id: "evt_4", type: "customer.subscription.created", data: { object: { id: "sub_del" } } });
    await user.caller.auth.deleteAccount({ password: TEST_PASSWORD, confirmation: "SUPPRIMER" });
    expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/subscriptions/sub_del"))).toBe(true);
    const remaining = await context.db.select().from(users).where(eq(users.id, user.userId));
    expect(remaining).toHaveLength(0);
  });

  it("sert les pages de retour avec un lien vers l'appli", async () => {
    const page = await built.app.inject({ method: "GET", url: "/paiement/succes" });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain("plume://paiement/succes");
  });
});

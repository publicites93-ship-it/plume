import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { PlanId } from "@plume/shared";
import { getConfig } from "../config";
import type { Database } from "../db/client";
import { auditEvents, subscriptions, users } from "../db/schema";

/**
 * Abonnements Plume+ / Plume++ via Stripe.
 *
 * - L'appli ouvre une page Stripe Checkout (aucune donnée bancaire ne transite par Plume).
 * - Stripe prévient l'API par webhook ; la formule est recalculée à partir de l'état
 *   de l'abonnement relu chez Stripe (jamais à partir du seul contenu de l'événement).
 * - La formule reste active jusqu'à la fin de la période payée, plus un délai de grâce.
 */

const STRIPE_API = "https://api.stripe.com/v1";
/** Délai laissé à Stripe pour encaisser un renouvellement avant de rétrograder. */
const GRACE_MS = 3 * 86_400_000;
/** États Stripe pour lesquels l'abonné garde sa formule. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const PAID_PLANS = ["plus", "premium"] as const;
type PaidPlan = (typeof PAID_PLANS)[number];

/**
 * Contrôle de forme des variables Stripe (sans jamais afficher leur valeur) :
 * une clé publique à la place de la clé secrète ou un identifiant de produit à
 * la place d'un prix sont des erreurs fréquentes de configuration.
 */
export function billingConfigIssues(): string[] {
  const c = getConfig();
  const checks: Array<[string, string | undefined, RegExp, string]> = [
    ["STRIPE_SECRET_KEY", c.STRIPE_SECRET_KEY, /^(sk|rk)_(test|live)_/, "doit être la clé secrète (sk_test_… ou sk_live_…), pas la clé publique pk_…"],
    ["STRIPE_WEBHOOK_SECRET", c.STRIPE_WEBHOOK_SECRET, /^whsec_/, "doit commencer par whsec_"],
    ["STRIPE_PRICE_PLUS", c.STRIPE_PRICE_PLUS, /^price_/, "doit être un identifiant de prix price_…, pas un produit prod_…"],
    ["STRIPE_PRICE_PREMIUM", c.STRIPE_PRICE_PREMIUM, /^price_/, "doit être un identifiant de prix price_…, pas un produit prod_…"],
  ];
  const issues: string[] = [];
  for (const [name, value, pattern, hint] of checks) {
    if (!value) issues.push(`${name} manquant`);
    else if (!pattern.test(value.trim())) issues.push(`${name} ${hint}`);
  }
  return issues;
}

export function billingConfigured(): boolean {
  return billingConfigIssues().length === 0;
}

function requireBilling() {
  if (!billingConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Le paiement n'est pas encore ouvert. Réessayez plus tard.",
    });
  }
  return getConfig();
}

function priceFor(plan: PaidPlan): string {
  const c = getConfig();
  return (plan === "plus" ? c.STRIPE_PRICE_PLUS : c.STRIPE_PRICE_PREMIUM)!.trim();
}

function planForPrice(priceId: string | undefined): PaidPlan | null {
  const c = getConfig();
  if (priceId && priceId === c.STRIPE_PRICE_PLUS?.trim()) return "plus";
  if (priceId && priceId === c.STRIPE_PRICE_PREMIUM?.trim()) return "premium";
  return null;
}

/** Encode un objet en application/x-www-form-urlencoded à la manière de Stripe (a[b][c]=…). */
export function toStripeForm(params: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") {
      out.push(...toStripeForm(value as Record<string, unknown>, name));
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

async function stripe<T>(method: "GET" | "POST" | "DELETE", path: string, params?: Record<string, unknown>): Promise<T> {
  const { STRIPE_SECRET_KEY } = requireBilling();
  const body = params ? toStripeForm(params).join("&") : undefined;
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${STRIPE_SECRET_KEY!.trim()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: { message?: string; type?: string } };
  if (!response.ok) {
    // Journal d'exploitation : type et message Stripe, jamais la clé.
    console.error(`[plume] Stripe ${method} ${path.split("?")[0]} → ${response.status} ${json.error?.type ?? ""} ${json.error?.message ?? ""}`);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Le service de paiement n'a pas répondu correctement. Aucun débit n'a été effectué ; réessayez.",
    });
  }
  return json;
}

function appUrl(path: string): string {
  return `${getConfig().PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
}

async function activeStripeSubscription(db: Database, userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.provider, "stripe"),
        inArray(subscriptions.status, [...ACTIVE_STATUSES]),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function anyCustomerRef(db: Database, userId: string): Promise<string | null> {
  const rows = await db
    .select({ customerRef: subscriptions.customerRef })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.provider, "stripe")));
  return rows.find((row) => row.customerRef)?.customerRef ?? null;
}

export async function billingStatus(db: Database, userId: string) {
  const active = await activeStripeSubscription(db, userId);
  return {
    available: billingConfigured(),
    subscription: active
      ? {
          plan: active.plan,
          status: active.status,
          currentPeriodEnd: active.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: active.cancelAtPeriodEnd,
        }
      : null,
    canManage: Boolean(await anyCustomerRef(db, userId)),
  };
}

export async function createCheckout(db: Database, userId: string, plan: PaidPlan) {
  requireBilling();
  if (await activeStripeSubscription(db, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Vous avez déjà un abonnement. Changez de formule ou résiliez depuis « Gérer mon abonnement ».",
    });
  }
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Compte introuvable." });
  const customer = await anyCustomerRef(db, userId);
  const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
    mode: "subscription",
    line_items: { 0: { price: priceFor(plan), quantity: 1 } },
    ...(customer ? { customer } : { customer_email: user.email }),
    client_reference_id: userId,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
    allow_promotion_codes: "true",
    locale: "fr",
    success_url: appUrl("/paiement/succes"),
    cancel_url: appUrl("/paiement/annule"),
  });
  return { url: session.url };
}

export async function createPortal(db: Database, userId: string) {
  requireBilling();
  const customer = await anyCustomerRef(db, userId);
  if (!customer) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Aucun abonnement à gérer pour ce compte." });
  }
  const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
    customer,
    return_url: appUrl("/paiement/retour"),
    locale: "fr",
  });
  return { url: session.url };
}

interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ current_period_end?: number; price?: { id?: string } }> };
}

/**
 * Relit l'abonnement chez Stripe et aligne la base : table subscriptions et
 * formule du compte. Idempotent : rejouer un événement ne change rien.
 */
export async function syncStripeSubscription(db: Database, subscriptionId: string, userIdHint?: string | null) {
  const sub = await stripe<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const item = sub.items?.data?.[0];
  const plan = planForPrice(item?.price?.id);
  // Selon la version d'API Stripe, la fin de période est sur l'abonnement ou sur l'article.
  const periodEndSec = sub.current_period_end ?? item?.current_period_end ?? null;
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000) : null;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.provider, "stripe"), eq(subscriptions.providerRef, sub.id)))
    .limit(1);
  const userId = existing?.userId ?? sub.metadata?.userId ?? userIdHint ?? null;
  if (!userId || !plan) {
    console.error(`[plume] Stripe : abonnement ${sub.id} ignoré (${!userId ? "compte inconnu" : "prix inconnu"}).`);
    return { ignored: true as const };
  }
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { ignored: true as const };

  const values = {
    userId,
    plan,
    provider: "stripe",
    providerRef: sub.id,
    customerRef: sub.customer,
    status: sub.status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values(values);
  }

  if (ACTIVE_STATUSES.has(sub.status)) {
    await db
      .update(users)
      .set({ plan, planExpiresAt: periodEnd ? new Date(periodEnd.getTime() + GRACE_MS) : null })
      .where(eq(users.id, userId));
  } else {
    // Abonnement terminé : retour à Gratuit, sauf si un autre abonnement Stripe reste actif.
    const [other] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          ne(subscriptions.providerRef, sub.id),
          inArray(subscriptions.status, [...ACTIVE_STATUSES]),
        ),
      )
      .limit(1);
    if (!other) {
      await db.update(users).set({ plan: "free", planExpiresAt: null }).where(eq(users.id, userId));
    }
  }
  await db.insert(auditEvents).values({
    actorId: null,
    action: "billing.subscription_synced",
    targetType: "user",
    targetId: userId,
    metadata: { status: sub.status, plan, cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end) },
  });
  return { ignored: false as const, userId, plan, status: sub.status };
}

/**
 * Vérifie la signature Stripe-Signature (t=…,v1=…) : HMAC-SHA256 de « t.corps »
 * avec le secret du webhook, comparaison en temps constant, 5 minutes de tolérance.
 */
export function verifyStripeSignature(rawBody: Buffer, header: string | undefined, secret: string, nowSec = Date.now() / 1000): boolean {
  if (!header) return false;
  const parts = header.split(",").map((part) => part.trim().split("="));
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSec - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  return signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/** Traite un événement Stripe déjà authentifié. */
export async function handleStripeEvent(db: Database, event: StripeEvent) {
  const object = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const subscriptionId = object.subscription as string | null;
      if (subscriptionId) {
        return syncStripeSubscription(db, subscriptionId, (object.client_reference_id as string) ?? null);
      }
      return { ignored: true as const };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return syncStripeSubscription(db, object.id as string);
    case "invoice.paid":
    case "invoice.payment_failed": {
      const parent = object.parent as { subscription_details?: { subscription?: string } } | undefined;
      const subscriptionId = (object.subscription as string | undefined) ?? parent?.subscription_details?.subscription;
      return subscriptionId ? syncStripeSubscription(db, subscriptionId) : { ignored: true as const };
    }
    default:
      return { ignored: true as const };
  }
}

/**
 * À la suppression d'un compte, les abonnements Stripe actifs sont résiliés
 * immédiatement : un compte supprimé ne doit plus jamais être débité.
 */
export async function cancelSubscriptionsForDeletion(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.provider, "stripe"), inArray(subscriptions.status, [...ACTIVE_STATUSES])),
    );
  if (rows.length === 0) return;
  if (!billingConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Votre abonnement n'a pas pu être résilié automatiquement. Contactez le support avant de supprimer le compte.",
    });
  }
  for (const row of rows) {
    if (row.providerRef) await stripe("DELETE", `/subscriptions/${encodeURIComponent(row.providerRef)}`);
  }
}

export function isPaidPlan(plan: PlanId): plan is PaidPlan {
  return (PAID_PLANS as readonly string[]).includes(plan);
}

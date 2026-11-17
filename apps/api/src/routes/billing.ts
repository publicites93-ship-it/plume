import type { FastifyInstance } from "fastify";
import { getConfig } from "../config";
import type { Database } from "../db/client";
import { handleStripeEvent, verifyStripeSignature } from "../services/billing";

function page(title: string, message: string, deepLink: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} · Plume</title>
</head>
<body style="margin:0;background:#0b111c;color:#e9e1d2;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <main style="max-width:420px;padding:32px;text-align:center;">
    <p style="letter-spacing:.2em;color:#c5a46a;font-size:12px;">PLUME</p>
    <h1 style="font-weight:600;">${title}</h1>
    <p style="color:#c3b7a4;line-height:1.6;">${message}</p>
    <p><a href="${deepLink}" style="display:inline-block;margin-top:12px;padding:14px 22px;border-radius:10px;background:#c5a46a;color:#1a1409;text-decoration:none;font-family:sans-serif;font-weight:600;">Revenir dans Plume</a></p>
  </main>
  <script>setTimeout(function(){ window.location.href = ${JSON.stringify(deepLink)}; }, 600);</script>
</body>
</html>`;
}

export async function registerBillingRoutes(app: FastifyInstance, db: Database) {
  const pages: Record<string, [string, string]> = {
    succes: [
      "Merci !",
      "Votre paiement est confirmé. Votre formule s'active dans quelques secondes dans l'application.",
    ],
    annule: ["Paiement annulé", "Aucun débit n'a été effectué. Vous pouvez réessayer quand vous voulez."],
    retour: ["Abonnement mis à jour", "Vos changements sont pris en compte dans l'application."],
  };
  for (const [slug, [title, message]] of Object.entries(pages)) {
    app.get(`/paiement/${slug}`, async (_request, reply) =>
      reply.type("text/html; charset=utf-8").send(page(title, message, `plume://paiement/${slug}`)),
    );
  }

  // Périmètre isolé : le webhook a besoin du corps brut pour vérifier la signature.
  await app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) =>
      done(null, body),
    );
    scope.post("/stripe/webhook", async (request, reply) => {
      const secret = getConfig().STRIPE_WEBHOOK_SECRET;
      if (!secret) return reply.code(503).send({ error: "Paiement non configuré." });
      const raw = request.body as Buffer;
      const signature = request.headers["stripe-signature"];
      if (!Buffer.isBuffer(raw) || !verifyStripeSignature(raw, typeof signature === "string" ? signature : undefined, secret)) {
        return reply.code(400).send({ error: "Signature invalide." });
      }
      const event = JSON.parse(raw.toString("utf8"));
      try {
        await handleStripeEvent(db, event);
      } catch (error) {
        // 500 : Stripe renverra l'événement plus tard.
        console.error(`[plume] webhook Stripe ${event.type} en échec : ${(error as Error).message}`);
        return reply.code(500).send({ error: "Traitement impossible pour l'instant." });
      }
      return reply.send({ received: true });
    });
  });
}

import type { FastifyInstance } from "fastify";
import { TRPCError } from "@trpc/server";
import { passwordSchema } from "@plume/shared";
import type { Database } from "../db/client";
import { markEmailVerified, resetPasswordWithToken } from "../auth/emailTokens";
import { htmlEscape, htmlPage } from "./legal";

function errorPage(title: string, message: string): string {
  return htmlPage(
    title,
    `<p class="notice">${htmlEscape(message)}</p>
     <p><a href="plume://connexion">Ouvrir Plume</a> · <a href="/">Retour à l'accueil</a></p>`,
  );
}

function resetForm(token: string, error?: string): string {
  return htmlPage(
    "Choisir un nouveau mot de passe",
    `<p>Votre nouveau mot de passe doit contenir au moins 6 caractères.</p>
     ${error ? `<p class="notice">${htmlEscape(error)}</p>` : ""}
     <form method="post" action="/reinitialiser-mot-de-passe" style="display:grid;gap:14px;max-width:420px;margin-top:20px;">
       <input type="hidden" name="token" value="${htmlEscape(token)}" />
       <label style="display:grid;gap:6px;color:#cfc6b8;">Nouveau mot de passe
         <input name="password" type="password" autocomplete="new-password" required minlength="6"
           style="background:#111a28;border:1px solid rgba(197,164,106,.45);border-radius:8px;padding:12px;color:#e9e1d2;font:inherit;" />
       </label>
       <label style="display:grid;gap:6px;color:#cfc6b8;">Confirmer le mot de passe
         <input name="confirm" type="password" autocomplete="new-password" required minlength="6"
           style="background:#111a28;border:1px solid rgba(197,164,106,.45);border-radius:8px;padding:12px;color:#e9e1d2;font:inherit;" />
       </label>
       <button type="submit" style="background:#c5a46a;color:#0b111c;border:0;border-radius:8px;padding:13px 20px;font:inherit;font-weight:600;cursor:pointer;">
         Enregistrer le nouveau mot de passe
       </button>
     </form>
     <p style="margin-top:18px;"><a href="plume://connexion">Ouvrir Plume</a></p>`,
  );
}

export async function registerAuthPages(app: FastifyInstance, db: Database): Promise<void> {
  app.get<{ Querystring: { token?: string } }>("/verifier-email", async (request, reply) => {
    reply.type("text/html; charset=utf-8");
    reply.header("cache-control", "no-store");
    const token = request.query.token?.trim();
    if (!token) {
      return errorPage(
        "Lien de vérification incomplet",
        "Ce lien ne contient pas de jeton. Ouvrez le lien complet reçu par e-mail.",
      );
    }
    try {
      await markEmailVerified(db, token);
      return htmlPage(
        "Adresse e-mail vérifiée",
        `<p class="notice">Votre adresse e-mail est maintenant vérifiée. Vous pouvez vous connecter à Plume.</p>
         <p><a href="plume://connexion">Ouvrir Plume et se connecter</a></p>`,
      );
    } catch (error) {
      const message =
        error instanceof TRPCError
          ? error.message
          : "Le lien n'a pas pu être vérifié. Réessayez depuis l'application.";
      return errorPage("Vérification impossible", message);
    }
  });

  app.get<{ Querystring: { token?: string } }>(
    "/reinitialiser-mot-de-passe",
    async (request, reply) => {
      reply.type("text/html; charset=utf-8");
      reply.header("cache-control", "no-store");
      const token = request.query.token?.trim();
      if (!token) {
        return errorPage(
          "Lien de réinitialisation incomplet",
          "Ce lien ne contient pas de jeton. Ouvrez le lien complet reçu par e-mail.",
        );
      }
      return resetForm(token);
    },
  );

  app.post<{
    Body: { token?: string; password?: string; confirm?: string };
  }>("/reinitialiser-mot-de-passe", async (request, reply) => {
    reply.type("text/html; charset=utf-8");
    reply.header("cache-control", "no-store");
    const token = request.body?.token?.trim();
    const password = request.body?.password ?? "";
    const confirm = request.body?.confirm ?? "";
    if (!token) {
      return errorPage(
        "Lien de réinitialisation incomplet",
        "Ce lien ne contient pas de jeton. Ouvrez le lien complet reçu par e-mail.",
      );
    }
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      return resetForm(token, parsed.error.issues[0]?.message ?? "Mot de passe invalide.");
    }
    if (password !== confirm) {
      return resetForm(token, "Les deux mots de passe ne correspondent pas.");
    }
    try {
      await resetPasswordWithToken(db, token, parsed.data);
      return htmlPage(
        "Mot de passe modifié",
        `<p class="notice">Votre mot de passe a été modifié. Toutes les autres sessions ont été déconnectées.</p>
         <p><a href="plume://connexion">Ouvrir Plume et se connecter</a></p>`,
      );
    } catch (error) {
      const message =
        error instanceof TRPCError
          ? error.message
          : "Le mot de passe n'a pas pu être modifié. Demandez un nouveau lien.";
      return resetForm(token, message);
    }
  });
}

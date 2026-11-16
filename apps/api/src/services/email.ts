import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getConfig } from "../config";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export interface TestEmail extends EmailMessage {
  createdAt: string;
}

const testOutbox: TestEmail[] = [];

/** Réservé aux tests : aucun e-mail réel n'est envoyé. */
export function readTestOutbox(): TestEmail[] {
  return [...testOutbox];
}

export function clearTestOutbox(): void {
  testOutbox.length = 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appUrl(path: string, token: string): string {
  const base = getConfig().PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

function deepLink(path: string, token: string): string {
  return `plume://${path}?token=${encodeURIComponent(token)}`;
}

function layout(title: string, intro: string, actionLabel: string, webUrl: string, appLink: string, footer: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;background:#0b111c;color:#e9e1d2;font-family:Georgia,'Times New Roman',serif;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:36px 22px;">
    <div style="color:#c5a46a;letter-spacing:.18em;font-size:11px;text-transform:uppercase;">Plume · atelier d'écriture</div>
    <h1 style="font-size:28px;line-height:1.2;margin:10px 0 18px;font-weight:600;">${escapeHtml(title)}</h1>
    <p style="color:#cfc6b8;margin:0 0 22px;">${intro}</p>
    <p style="margin:0 0 14px;">
      <a href="${escapeHtml(webUrl)}" style="display:inline-block;background:#c5a46a;color:#0b111c;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:600;">${escapeHtml(actionLabel)}</a>
    </p>
    <p style="color:#9e9588;font-size:13px;margin:0 0 22px;">
      Dans l'application : <a href="${escapeHtml(appLink)}" style="color:#e7c98b;">ouvrir Plume</a>.
    </p>
    <div style="border-top:1px solid rgba(197,164,106,.3);padding-top:16px;color:#9e9588;font-size:12px;">
      ${footer}
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const config = getConfig();

  if (config.EMAIL_PROVIDER === "test") {
    testOutbox.push({ ...message, createdAt: new Date().toISOString() });
    return;
  }

  if (config.EMAIL_PROVIDER === "console") {
    if (config.isProduction) {
      throw new EmailDeliveryError(
        "Le transport d'e-mails console est désactivé en production. Configurez EMAIL_PROVIDER=resend et RESEND_API_KEY.",
      );
    }
    const folder = resolve(process.cwd(), "data/outbox");
    await mkdir(folder, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await writeFile(
      resolve(folder, filename),
      JSON.stringify(message, null, 2),
      { encoding: "utf8", mode: 0o600 },
    );
    // Ne jamais écrire le jeton dans les journaux : seul le chemin est affiché.
    console.log(`[plume] e-mail de développement écrit dans data/outbox/${filename}`);
    return;
  }

  if (config.EMAIL_PROVIDER === "brevo") {
    await sendWithBrevo(message);
    return;
  }

  if (!config.RESEND_API_KEY) {
    throw new EmailDeliveryError(
      "RESEND_API_KEY est absente : impossible d'envoyer l'e-mail.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EmailDeliveryError(
      `Le fournisseur d'e-mails a refusé la requête (${response.status}). ${detail.slice(0, 300)}`,
    );
  }
}

/** Découpe « Nom <adresse> » en nom et adresse. */
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || undefined, email: match[2]!.trim() };
  return { email: from.trim() };
}

/**
 * Brevo (API HTTP v3). Utilisable sans nom de domaine : l'expéditeur doit être
 * une adresse vérifiée dans Brevo. Avec une adresse gratuite (Gmail…), Brevo
 * remplace l'adresse d'expédition par une adresse technique conforme.
 */
async function sendWithBrevo(message: EmailMessage): Promise<void> {
  const config = getConfig();
  if (!config.BREVO_API_KEY) {
    throw new EmailDeliveryError("BREVO_API_KEY est absente : impossible d'envoyer l'e-mail.");
  }
  const sender = parseSender(config.EMAIL_FROM);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    // Le message d'erreur Brevo ne contient ni la clé ni le jeton de l'e-mail.
    const detail = await response.text().catch(() => "");
    throw new EmailDeliveryError(
      `Le fournisseur d'e-mails a refusé la requête (${response.status}). ${detail.slice(0, 300)}`,
    );
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const webUrl = appUrl("/verifier-email", token);
  const appLink = deepLink("verifier-email", token);
  const html = layout(
    "Vérifiez votre adresse e-mail",
    "Bienvenue dans Plume. Cliquez sur le bouton ci-dessous pour confirmer votre adresse. Ce lien est valable 24 heures et ne peut servir qu'une fois.",
    "Vérifier mon adresse",
    webUrl,
    appLink,
    "Si vous n'avez pas créé de compte Plume, ignorez cet e-mail. Aucun compte ne sera activé sans cette confirmation.",
  );
  const text = [
    "Bienvenue dans Plume.",
    "Vérifiez votre adresse e-mail en ouvrant ce lien :",
    webUrl,
    "",
    "Dans l'application : " + appLink,
    "",
    "Ce lien est valable 24 heures et ne peut servir qu'une fois.",
    "Si vous n'avez pas créé de compte, ignorez cet e-mail.",
  ].join("\n");
  await sendEmail({ to, subject: "Confirmez votre adresse e-mail Plume", html, text });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const webUrl = appUrl("/reinitialiser-mot-de-passe", token);
  const appLink = deepLink("reinitialiser-mot-de-passe", token);
  const html = layout(
    "Réinitialiser votre mot de passe",
    "Vous avez demandé à réinitialiser le mot de passe de votre compte Plume. Ce lien est valable 1 heure et ne peut servir qu'une fois.",
    "Choisir un nouveau mot de passe",
    webUrl,
    appLink,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable.",
  );
  const text = [
    "Réinitialisation du mot de passe Plume.",
    "Choisissez un nouveau mot de passe en ouvrant ce lien :",
    webUrl,
    "",
    "Dans l'application : " + appLink,
    "",
    "Ce lien est valable 1 heure et ne peut servir qu'une fois.",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  ].join("\n");
  await sendEmail({ to, subject: "Réinitialiser votre mot de passe Plume", html, text });
}

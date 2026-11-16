import type { FastifyInstance } from "fastify";
import { getConfig } from "../config";

const CONTACT_EMAIL = process.env.LEGAL_CONTACT_EMAIL?.trim() || "plume.lecture.ia@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index,follow" />
  <title>${escapeHtml(title)} — Plume</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0b111c;
      color: #e9e1d2;
      font-family: ui-serif, Georgia, "Times New Roman", serif;
      line-height: 1.65;
    }
    main { max-width: 780px; margin: 0 auto; padding: 48px 22px 72px; }
    header { border-bottom: 1px solid rgba(197,164,106,.35); padding-bottom: 20px; margin-bottom: 28px; }
    .brand { color: #c5a46a; letter-spacing: .22em; font-size: 12px; text-transform: uppercase; }
    h1 { font-size: clamp(30px, 6vw, 44px); line-height: 1.1; margin: 8px 0 10px; font-weight: 600; }
    h2 { color: #e7c98b; font-size: 21px; margin: 34px 0 10px; }
    h3 { color: #e9e1d2; font-size: 17px; margin: 22px 0 8px; }
    p, li { color: #cfc6b8; }
    a { color: #e7c98b; }
    ul { padding-left: 22px; }
    .notice { border: 1px solid rgba(197,164,106,.3); background: rgba(197,164,106,.06); padding: 14px 16px; border-radius: 10px; }
    .meta { color: #9e9588; font-size: 13px; }
    nav { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 14px; font-size: 14px; }
    footer { margin-top: 42px; border-top: 1px solid rgba(197,164,106,.25); padding-top: 18px; color: #9e9588; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">Plume · atelier d'écriture</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">Dernière mise à jour : 16 novembre 2026</div>
      <nav>
        <a href="/confidentialite">Confidentialité</a>
        <a href="/conditions">Conditions d'utilisation</a>
        <a href="/supprimer-compte">Supprimer mon compte</a>
      </nav>
    </header>
    ${body}
    <footer>
      Plume — contact : <a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a>.
      Ces pages sont rédigées en français et décrivent le fonctionnement de l'application Plume.
    </footer>
  </main>
</body>
</html>`;
}

function privacyBody(): string {
  const contact = escapeHtml(CONTACT_EMAIL);
  return `
  <p class="notice">
    Cette politique décrit les données traitées par l'application Plume et par son API.
    Elle doit être relue avec un conseil juridique avant une commercialisation à grande échelle.
  </p>

  <h2>1. Responsable du traitement</h2>
  <p>
    Le responsable du traitement est l'éditeur de Plume. Pour toute question ou pour exercer vos
    droits, écrivez à <a href="mailto:${contact}">${contact}</a>.
  </p>

  <h2>2. Données traitées</h2>
  <ul>
    <li><strong>Compte :</strong> adresse e-mail, pseudonyme, mot de passe haché, préférences, forfait.</li>
    <li><strong>Écriture :</strong> histoires, chapitres, versions, notes de bible, idées et brouillons.</li>
    <li><strong>Lecture :</strong> histoires suivies, progression, favoris et listes de lecture.</li>
    <li><strong>Coach :</strong> diagnostics, constats, citations vérifiées, évaluations et conversations.</li>
    <li><strong>Sécurité :</strong> jetons de session hachés, dates de connexion, événements d'audit.</li>
    <li><strong>Technique :</strong> journaux limités nécessaires au diagnostic et à la sécurité.</li>
  </ul>
  <p>
    Plume ne demande pas votre nom légal, votre adresse postale, votre numéro de téléphone ni vos
    données bancaires dans l'application actuelle. Les manuscrits privés ne sont pas publiés par
    défaut et n'apparaissent pas dans le catalogue public.
  </p>

  <h2>3. Finalités et bases légales</h2>
  <ul>
    <li>Fournir le compte, l'atelier, la bibliothèque et le coach : exécution du contrat.</li>
    <li>Protéger le service, prévenir la fraude et corriger les incidents : intérêt légitime.</li>
    <li>Envoyer les e-mails de vérification et de réinitialisation : exécution du contrat et sécurité.</li>
    <li>Respecter nos obligations légales et répondre aux demandes de droits : obligation légale.</li>
  </ul>

  <h2>4. Coach et intelligence artificielle</h2>
  <p>
    Lorsque le coach est configuré avec un fournisseur d'IA, les extraits de manuscrit nécessaires
    à la demande sont transmis à ce fournisseur pour produire l'analyse ou la réponse. Plume ne
    réutilise pas vos manuscrits pour entraîner un modèle. Le fournisseur peut traiter les données
    selon ses propres conditions et ses engagements de confidentialité.
  </p>
  <p>
    Le coach ne réécrit pas votre texte à votre place. Les citations présentées comme provenant du
    manuscrit sont vérifiées côté serveur ; une citation absente du texte enregistré est retirée.
  </p>

  <h2>5. Destinataires et sous-traitants</h2>
  <p>
    Les données sont accessibles à l'éditeur de Plume et aux prestataires techniques nécessaires :
    hébergement de l'API, base de données PostgreSQL, envoi d'e-mails transactionnels et, si activé,
    fournisseur d'IA. Ces prestataires agissent sur instruction et selon leurs engagements de
    confidentialité. Certains peuvent être situés hors de l'Union européenne ; les transferts
    s'appuient alors sur les garanties prévues par le RGPD.
  </p>
  <p>Plume ne vend pas vos données et ne les utilise pas pour de la publicité ciblée.</p>

  <h2>6. Durées de conservation</h2>
  <ul>
    <li>Compte, manuscrits et analyses : jusqu'à la suppression du compte ou de la donnée concernée.</li>
    <li>Jeton de vérification d'e-mail : 24 heures, puis invalidé.</li>
    <li>Jeton de réinitialisation de mot de passe : 1 heure, puis invalidé.</li>
    <li>Jetons de session : durée de vie configurée, puis révoqués ou expirés.</li>
    <li>Journaux techniques : durée limitée au diagnostic et à la sécurité.</li>
  </ul>

  <h2>7. Vos droits</h2>
  <p>
    Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, la limitation
    du traitement, vous opposer à certains traitements et récupérer vos données dans un format
    lisible. L'application permet déjà d'exporter vos données et de supprimer votre compte. Vous
    pouvez aussi écrire à <a href="mailto:${contact}">${contact}</a>.
  </p>
  <p>
    Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL
    (<a href="https://www.cnil.fr" rel="noreferrer">cnil.fr</a>).
  </p>

  <h2>8. Sécurité</h2>
  <p>
    Les mots de passe sont hachés avec un sel aléatoire. Les sessions utilisent des jetons à durée
    limitée et les jetons de rafraîchissement sont hachés, rotatifs et révocables. Les échanges
    passent par HTTPS. L'accès à une ressource privée vérifie la propriété du compte. Aucun système
    n'est infaillible : signalez toute faille à l'adresse de contact.
  </p>

  <h2>9. Mineurs</h2>
  <p>
    Plume est un outil d'écriture et de lecture destiné à un public capable de consentir au
    traitement de ses données. Les personnes mineures doivent obtenir l'accord de leur représentant
    légal.
  </p>

  <h2>10. Modifications</h2>
  <p>
    Cette politique peut évoluer avec le service. La date de mise à jour figure en tête de page.
    Les changements importants seront signalés dans l'application ou par e-mail.
  </p>`;
}

function termsBody(): string {
  const contact = escapeHtml(CONTACT_EMAIL);
  return `
  <p class="notice">
    Ces conditions encadrent l'utilisation de Plume. Elles doivent être relues avec un conseil
    juridique avant une commercialisation à grande échelle.
  </p>

  <h2>1. Objet</h2>
  <p>
    Plume est un atelier d'écriture et une bibliothèque de lecture. L'application permet d'écrire
    en privé, de publier volontairement certains textes, de lire des histoires et de solliciter un
    coach pédagogique.
  </p>

  <h2>2. Compte</h2>
  <p>
    Vous devez fournir une adresse e-mail valide et choisir un pseudonyme. Vous êtes responsable de
    la confidentialité de votre mot de passe et des activités réalisées depuis votre compte.
    Prévenez-nous sans délai en cas d'accès non autorisé.
  </p>

  <h2>3. Vos textes</h2>
  <p>
    Vous conservez la propriété de vos manuscrits. Vous accordez à Plume uniquement les droits
    techniques nécessaires pour stocker, afficher, sauvegarder, analyser et, si vous le décidez,
    publier vos textes. Un manuscrit privé n'est pas rendu public sans votre action.
  </p>
  <p>
    Vous garantissez que vous disposez des droits nécessaires sur les textes et images que vous
    importez. N'importez pas de contenu illicite ou portant atteinte aux droits d'un tiers.
  </p>

  <h2>4. Coach</h2>
  <p>
    Le coach observe, questionne et propose des exercices. Il ne réécrit pas votre texte à votre
    place. Ses analyses sont pédagogiques, avec un niveau de confiance, et ne constituent pas un
    jugement littéraire définitif. Les citations sont vérifiées dans le texte enregistré.
  </p>
  <p>
    Les quotas et crédits du coach sont appliqués côté serveur. Une action échouée ne doit pas
    consommer de crédits. Les quotas peuvent évoluer avec les formules.
  </p>

  <h2>5. Catalogue public</h2>
  <p>
    Seuls les textes que vous choisissez de publier apparaissent dans le catalogue. Vous pouvez
    retirer une publication. Plume peut retirer un contenu manifestement illicite ou contraire à
    ces conditions, avec information lorsque la loi le permet.
  </p>

  <h2>6. Utilisations interdites</h2>
  <ul>
    <li>Publier un contenu illicite, haineux, diffamatoire ou portant atteinte aux droits d'autrui.</li>
    <li>Tenter d'accéder au compte ou aux manuscrits d'une autre personne.</li>
    <li>Contourner les quotas, les limitations de débit ou les mesures de sécurité.</li>
    <li>Extraire massivement le catalogue ou perturber le service.</li>
    <li>Présenter une analyse du coach comme une vérité littéraire absolue ou un conseil professionnel.</li>
  </ul>

  <h2>7. Disponibilité et évolutions</h2>
  <p>
    Plume est un service en évolution. Des interruptions, maintenances ou limitations peuvent
    survenir. Les fonctionnalités présentées comme expérimentales ou non branchées ne doivent pas
    être considérées comme un engagement de disponibilité.
  </p>

  <h2>8. Suppression et résiliation</h2>
  <p>
    Vous pouvez supprimer votre compte depuis les réglages ou la page
    <a href="/supprimer-compte">Supprimer mon compte</a>. La suppression efface le compte et les
    données associées, sous réserve des obligations légales de conservation. Plume peut suspendre
    un compte en cas de violation grave de ces conditions.
  </p>

  <h2>9. Responsabilité</h2>
  <p>
    Plume met en œuvre des moyens raisonnables pour protéger les données et fournir un service
    fiable. Plume ne garantit pas l'absence totale d'erreur, de perte ou d'interruption. Sauvegardez
    régulièrement vos textes et utilisez l'export prévu à cet effet.
  </p>

  <h2>10. Droit applicable</h2>
  <p>
    Ces conditions sont soumises au droit français. En cas de litige, une solution amiable sera
    recherchée avant toute action judiciaire. Les consommateurs conservent les droits que la loi
    leur accorde.
  </p>

  <h2>11. Contact</h2>
  <p>Pour toute question : <a href="mailto:${contact}">${contact}</a>.</p>`;
}

function deleteAccountBody(): string {
  const contact = escapeHtml(CONTACT_EMAIL);
  return `
  <h2>Supprimer votre compte Plume</h2>
  <p>
    La suppression est définitive. Elle efface votre compte, votre profil, vos préférences, vos
    manuscrits privés, vos chapitres, vos versions, votre bible, vos analyses et vos conversations
    avec le coach. Les textes que vous avez publiés sont retirés du catalogue.
  </p>
  <h3>Depuis l'application</h3>
  <p>
    Ouvrez <strong>Profil → Réglages → Supprimer mon compte</strong>. Saisissez votre mot de passe
    et le mot <strong>SUPPRIMER</strong> pour confirmer.
  </p>
  <h3>Par e-mail</h3>
  <p>
    Si vous ne pouvez plus accéder à l'application, écrivez à
    <a href="mailto:${contact}?subject=Suppression%20de%20mon%20compte%20Plume">${contact}</a>
    depuis l'adresse e-mail du compte. Indiquez « Suppression de compte » en objet. Une vérification
    d'identité raisonnable pourra être demandée pour éviter une suppression frauduleuse.
  </p>
  <p class="notice">
    La demande est traitée dans un délai raisonnable. Certaines données peuvent être conservées
    temporairement lorsque la loi l'exige (par exemple pour la sécurité ou la preuve d'une
    transaction), puis supprimées ou anonymisées.
  </p>`;
}

export async function registerLegalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/confidentialite", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return page("Politique de confidentialité", privacyBody());
  });

  app.get("/conditions", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return page("Conditions d'utilisation", termsBody());
  });

  app.get("/supprimer-compte", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return page("Supprimer mon compte", deleteAccountBody());
  });

  app.get("/legal", async (_request, reply) => {
    reply.redirect("/confidentialite");
  });
}

export function legalContactEmail(): string {
  return CONTACT_EMAIL;
}

/** Exposé pour les tests et les pages d'authentification. */
export function htmlPage(title: string, body: string): string {
  return page(title, body);
}

export function htmlEscape(value: string): string {
  return escapeHtml(value);
}

export function publicAppUrl(): string {
  return getConfig().PUBLIC_APP_URL.replace(/\/$/, "");
}

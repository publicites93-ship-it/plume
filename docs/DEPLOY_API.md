# Déployer l'API Plume

Un APK preview est autonome côté JavaScript, mais il a besoin d'une **API HTTPS publique** pour l'authentification, les manuscrits, la lecture et le coach. Un tunnel gratuit dépanne quelques minutes ; il ne remplace pas un déploiement durable.

Ce document prépare un déploiement Docker + PostgreSQL sur Railway, Render ou un VPS. Aucun déploiement n'est lancé automatiquement : il faut un compte et des identifiants.

## 1. Fichiers fournis

| Fichier | Rôle |
| --- | --- |
| `Dockerfile` | Image de l'API, migrations et démarrage |
| `.dockerignore` | Exclut `node_modules`, secrets, données locales et builds mobiles |
| `railway.json` | Configuration Railway (Dockerfile, healthcheck) |
| `render.yaml` | Blueprint Render (service web ; PostgreSQL externe) |

Le conteneur :

1. installe uniquement l'API et le paquet partagé (pas le mobile) ;
2. copie `apps/api` et `packages/shared` ;
3. applique les migrations Drizzle ;
4. exécute le seed de démonstration **seulement si `SEED_DEMO=true`** ;
5. démarre Fastify/tRPC sur `PORT` (4000 par défaut).

## 2. Variables d'environnement

Service en production : **`plume-api-qk9s`** (Render, image Docker). L'ancien service
`plume-api` est suspendu et sa base ne sert plus.

| Variable | Obligatoire | Valeur |
| --- | --- | --- |
| `NODE_ENV` | oui | `production` (déjà fixé dans l'image Docker) |
| `DATABASE_URL` | oui | URL PostgreSQL durable (Neon) |
| `JWT_SECRET` | oui | aléatoire, 32 caractères minimum ; sinon l'API refuse de démarrer |
| `PUBLIC_APP_URL` | oui | `https://plume-api-qk9s.onrender.com` (liens des e-mails, retours Stripe) |
| `AI_PROVIDER` | oui | `anthropic` (ou `gemini`, ou `mock` = simulation signalée) |
| `CLAUDE_API_KEY` ou `ANTHROPIC_API_KEY` | si `anthropic` | clé Anthropic |
| `ANTHROPIC_MODEL` / `ANTHROPIC_MODEL_FREE` | non | `claude-sonnet-5-5` (payants) / `claude-haiku-5-5` (Gratuit) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | si `gemini` | clé Google AI Studio ; `gemini-3.8-flash` |
| `EMAIL_PROVIDER` | oui | `brevo` (sans domaine) ou `resend` (avec domaine) |
| `BREVO_API_KEY` / `RESEND_API_KEY` | selon le fournisseur | clé du fournisseur d'e-mails |
| `EMAIL_FROM` | oui | `Plume <adresse vérifiée chez le fournisseur>` |
| `REQUIRE_EMAIL_VERIFICATION` | non | `false` tant que la délivrabilité n'est pas validée |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PREMIUM` | pour les abonnements | les quatre ensemble ; sinon l'appli affiche « ouverture prochaine » |
| `SEED_DEMO` | non | `false` en production |
| `CORS_ORIGINS` | non | origines web autorisées (l'appli Android n'en a pas besoin) |
| `PORT`, `HOST` | non | fournis par l'hébergeur |

**Déploiement** : après chaque envoi sur GitHub, lancer **Manual Deploy → Deploy latest commit**
et vérifier le numéro de commit dans le journal. Enregistrer une variable redéploie le commit
*précédent*, pas le dernier. `/health` indique `ai`, `aiAvailable`, `email` et `billing`.

**Formule offerte** (sans Shell Render) : dans l'éditeur SQL de Neon,
`UPDATE users SET plan = 'premium', plan_expires_at = NULL WHERE email = lower('…');`
(`premium` = Plume++, `plus` = Plume+), ou `npm run db:set-plan --workspace @plume/api -- <email> <plan> [jours]`
depuis un poste ayant `DATABASE_URL`.

Ne jamais committer `DATABASE_URL` ni `JWT_SECRET`.

## 3. Option A — Railway (déploiement depuis ce dépôt local)

Railway accepte un déploiement local avec le Dockerfile, sans passer par GitHub.

```bash
# Une seule fois
npm install -g @railway/cli
railway login

# Dans la racine du dépôt
railway init
railway add --plugin postgresql

railway variables --set NODE_ENV=production
railway variables --set JWT_SECRET="$(openssl rand -base64 48)"
railway variables --set AI_PROVIDER=mock
railway variables --set SEED_DEMO=true
railway variables --set CORS_ORIGINS=https://plume.app

# Référencer la base PostgreSQL créée par le plugin.
# Le nom du service peut être Postgres, postgres ou PostgreSQL selon l'interface.
railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'

railway up
railway domain
```

Si la référence `${{Postgres.DATABASE_URL}}` échoue, ouvrir le tableau de bord Railway, sélectionner le service API, puis ajouter `DATABASE_URL` avec la référence proposée par le service PostgreSQL.

Après le déploiement :

```bash
curl https://VOTRE-DOMAINE/health
# {"ok":true,"service":"plume-api"}
```

Le conteneur applique les migrations à chaque démarrage. Avec `SEED_DEMO=true`, il crée aussi les comptes `lecteur@plume.app` et `auteur@plume.app` (mot de passe `Plume2026`). Pour une vraie production, mettre `SEED_DEMO=false`.

Railway n'est pas gratuit indéfiniment : l'offre gratuite est un crédit d'essai, puis la facturation passe à l'usage. Le volume PostgreSQL persiste tant que le projet existe. Vérifier les conditions avant de déployer.

Si la base exige SSL, ajouter `?sslmode=require` à la fin de `DATABASE_URL`.

## 4. Option B — Render + PostgreSQL durable (Neon)

Render Free Postgres **expire après 30 jours** (novembre 2026) et ne convient pas à un déploiement durable. `render.yaml` ne crée donc pas de base : il attend une `DATABASE_URL` externe. Neon propose un PostgreSQL gratuit qui ne dépend pas de cette limite.

1. Créer un projet sur [Neon](https://neon.tech), puis copier la chaîne de connexion PostgreSQL (`postgresql://…?sslmode=require`). Préférer la chaîne **directe** (sans `-pooler`) : les migrations Drizzle utilisent des transactions.
2. Pousser le dépôt sur GitHub.
3. Dans Render : **New → Blueprint**, connecter le dépôt.
4. Render lit `render.yaml` et crée `plume-api`. Il demande `DATABASE_URL` : coller la chaîne Neon.
5. Attendre la fin du déploiement, puis ouvrir `https://plume-api-qk9s.onrender.com`.
6. Vérifier `https://plume-api-qk9s.onrender.com/health`.

Le `startCommand` de `render.yaml` applique les migrations, exécute le seed si `SEED_DEMO=true`, puis démarre l'API. Le service web gratuit Render peut se mettre en veille après 15 minutes d'inactivité : la première requête peut prendre plusieurs dizaines de secondes. L'URL reste stable. Render Free dispose de 512 Mo de RAM et de 750 heures d'instance par mois.

Autres bases durables possibles : Railway PostgreSQL, Supabase, un PostgreSQL managé ou un VPS. Vérifier la politique de sauvegarde et de rétention de chaque offre.

Pour une vraie production :

- passer `SEED_DEMO` à `false` ;
- remplacer `CORS_ORIGINS` par les origines réelles ;
- supprimer ou renommer les comptes de démonstration ;
- vérifier les sauvegardes PostgreSQL ;
- passer sur une offre sans mise en veille si nécessaire.

## 5. Option C — VPS avec Docker

```bash
docker build -t plume-api .
docker run -d --name plume-api --restart unless-stopped \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgresql://plume:mot-de-passe@postgres:5432/plume' \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e AI_PROVIDER=mock \
  -e SEED_DEMO=true \
  plume-api
```

Placer l'API derrière Caddy ou Nginx avec un certificat HTTPS. Ne pas exposer PostgreSQL publiquement.

## 6. Reconstruire l'APK avec l'URL durable

Une fois l'API déployée et vérifiée :

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://VOTRE-DOMAINE/trpc \
  npx eas-cli@latest build --platform android --profile preview
```

Ou ajouter temporairement l'URL dans `build.preview.env` de `apps/mobile/eas.json`. `apps/mobile/app.config.ts` refuse un build EAS si l'URL est absente, locale ou non HTTPS.

L'ancien APK continue de pointer vers l'ancien tunnel : il faut installer le nouvel APK.

## 7. Vérifications après déploiement

```bash
curl https://VOTRE-DOMAINE/health
curl https://VOTRE-DOMAINE/trpc/health

curl -X POST https://VOTRE-DOMAINE/trpc/auth.signIn \
  -H 'content-type: application/json' \
  -H 'x-plume-client: mobile' \
  --data '{"json":{"email":"auteur@plume.app","password":"Plume2026"}}'
```

Puis, avec le jeton d'accès retourné :

```bash
curl https://VOTRE-DOMAINE/trpc/auth.me \
  -H "Authorization: Bearer VOTRE_JETON" \
  -H 'x-plume-client: mobile'
```

Enfin, installer le nouvel APK et tester la connexion, la bibliothèque, un manuscrit et le coach.

## 8. Sécurité

- Les comptes de démonstration ont des mots de passe publics : ne jamais y stocker de données réelles.
- `JWT_SECRET` doit être aléatoire, long et propre à chaque environnement.
- `CORS_ORIGINS` ne doit pas contenir `*` en production.
- PostgreSQL doit être sauvegardé et non exposé sur Internet.
- Les limites de débit sont en mémoire : plusieurs instances API nécessiteraient un stockage partagé.
- Le coach reste le moteur `mock`, clairement signalé comme simulation. Aucun fournisseur IA payant n'est activé.

## 9. Limites de cet environnement

- Docker, `psql`, Railway CLI et Render CLI ne sont pas installés ici.
- Le `Dockerfile` et `render.yaml` sont préparés mais **n'ont pas été exécutés**.
- Les tests automatisés utilisent PGlite ; le chemin PostgreSQL réel n'a pas été testé ici.
- Render Free Postgres expire après 30 jours et ne doit pas servir de base durable ; `render.yaml` attend donc une `DATABASE_URL` externe.
- Le service web gratuit Render se met en veille après 15 minutes d'inactivité ; la première requête peut être lente.
- Un déploiement réel doit être smoke-testé avec les commandes de la section 7 avant de livrer un APK.

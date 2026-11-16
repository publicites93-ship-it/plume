# Build Android avec EAS

Ce document décrit la préparation et la vérification d'un APK Plume installable sur un téléphone Android, sans Expo Go et sans serveur Metro.

## 1. Ce que produit le profil `preview`

`apps/mobile/eas.json` définit trois profils :

| Profil | Sortie | Usage |
| --- | --- | --- |
| `development` | APK avec development client | Développement natif, nécessite Metro |
| `preview` | **APK autonome** | Installation directe sur un téléphone |
| `production` | AAB | Publication Play Store |

Le profil `preview` utilise :

- `distribution: "internal"` : lien de téléchargement Expo, sans Play Store ;
- `android.buildType: "apk"` : fichier `.apk` installable ;
- aucun `developmentClient` : le bundle JavaScript est embarqué dans l'APK.

L'APK ne dépend donc **pas** d'Expo Go ni de Metro. Il dépend en revanche de l'API Plume, qui doit être joignable en HTTPS depuis le téléphone.

## 2. Prérequis

1. Un compte Expo et une connexion EAS :

   ```bash
   cd apps/mobile
   npx eas-cli@latest login
   ```

2. Un projet EAS lié. La commande `eas init` renseigne `extra.eas.projectId` et `owner` dans `app.json`. Le projet est déjà lié dans ce dépôt.

3. Une API publique en HTTPS. Une URL `localhost`, `10.0.2.2` ou une IP LAN ne fonctionne pas depuis un téléphone.

4. `EXPO_PUBLIC_API_URL` doit être défini au moment du build. `apps/mobile/app.config.ts` refuse un build EAS si l'URL est absente, non HTTPS ou privée. Cela évite de livrer un APK qui ne peut joindre aucun serveur.

## 3. Configurer l'URL de l'API

Deux méthodes équivalentes.

### Méthode A — variable du profil EAS

Dans `apps/mobile/eas.json` :

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.votre-domaine.fr/trpc"
      }
    }
  }
}
```

Cette méthode est simple pour un build ponctuel. Si l'URL change, il faut modifier le fichier et relancer un build.

### Méthode B — variable d'environnement EAS

Créer la variable dans l'environnement `preview` du projet Expo :

```bash
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_API_URL \
  --value https://api.votre-domaine.fr/trpc \
  --environment preview \
  --visibility plaintext
```

Puis ajouter `"environment": "preview"` au profil `preview` dans `eas.json`. Cette méthode garde l'URL hors du fichier.

## 4. Monorepo et racine Git

EAS compresse le dépôt à partir de sa **racine Git**, pas seulement le dossier `apps/mobile`. Deux erreurs courantes expliquent la plupart des échecs de build :

1. **Un dépôt Git imbriqué dans `apps/mobile/`.** EAS prend alors `apps/mobile` comme racine et n'envoie ni `packages/shared`, ni le `package-lock.json` racine. Le build échoue sur `Unable to resolve "@plume/shared"` ou tente un `yarn install` sans lockfile. Il doit y avoir **un seul dépôt Git, à la racine du monorepo**.
2. **Une dépendance de workspace non déclarée.** `apps/mobile/package.json` doit contenir `"@plume/shared": "*"`. Le lien fonctionne localement grâce à npm workspaces, mais EAS ne le devine pas.

Vérifier la racine utilisée :

```bash
git rev-parse --show-toplevel
# doit afficher la racine du monorepo, pas apps/mobile
```

Si `apps/mobile/.git` existe et ne contient aucun commit utile, le supprimer, puis initialiser un dépôt unique à la racine :

```bash
rm -rf apps/mobile/.git
git init
git add -A
git commit -m "Prépare le build Android EAS"
```

Le dépôt doit contenir `package-lock.json`, `packages/shared/` et `apps/mobile/eas.json`. Le fichier `package.json` racine déclare `packageManager: "npm@10.9.8"` pour éviter qu'EAS bascule sur Yarn.

## 5. Lancer le build

Depuis `apps/mobile` :

```bash
npx eas-cli@latest build --platform android --profile preview
```

Ou depuis la racine, si l'URL est déjà configurée dans `eas.json` :

```bash
npm run build:android:preview
```

EAS peut demander de générer un keystore Android. En mode non interactif, il le génère dans le cloud. La première génération prend quelques minutes.

Pour suivre sans interaction :

```bash
npx eas-cli@latest build --platform android --profile preview --non-interactive --wait
```

## 6. Installer sur le téléphone

1. Ouvrir la page de build affichée par EAS sur le téléphone.
2. Télécharger l'APK.
3. Autoriser l'installation depuis le navigateur ou le gestionnaire de fichiers si Android le demande.
4. Ouvrir Plume. L'écran de bienvenue doit s'afficher sans Expo Go.

Le lien de build est propre à chaque build. Il ne faut pas le confondre avec une page de projet Expo.

## 7. Vérifier que l'API est réellement joignable

Depuis le téléphone ou un autre réseau :

```bash
curl https://api.votre-domaine.fr/health
```

Réponse attendue :

```json
{"ok":true,"service":"plume-api"}
```

Puis vérifier une procédure tRPC publique :

```bash
curl "https://api.votre-domaine.fr/trpc/health"
```

Si ces appels échouent, l'APK s'installera mais l'authentification et les données resteront inaccessibles.

## 8. Tunnel temporaire

Pour un test immédiat sans déploiement, un tunnel HTTPS temporaire peut exposer l'API locale :

```bash
cloudflared tunnel --url http://localhost:4000
# ou
ssh -R 80:localhost:4000 nokey@localhost.run
# ou, tunnel stable pendant 60 minutes
ssh -p 443 -R0:localhost:4000 a.pinggy.io
```

Pinggy affiche une URL `https://….pinggy-free.link` ou `https://….free.pinggy.net`. Vérifier immédiatement `/health` et une mutation `auth.signIn` avant de lancer le build. Cloudflare quick tunnel peut être indisponible selon le réseau ; localhost.run change de domaine périodiquement.

Limites à annoncer clairement :

- l'URL change et le tunnel s'arrête avec la machine ;
- l'API de démonstration devient publiquement joignable ;
- les comptes de démonstration ont des mots de passe connus ;
- ce n'est pas une solution de production.

Pour un test durable, voir [docs/DEPLOY_API.md](DEPLOY_API.md) : Dockerfile, PostgreSQL, Railway et Render sont préparés. Utiliser ensuite l'URL permanente dans le profil `preview`.

### Builds réalisés

| Date | Build EAS | APK | État de l'API |
| --- | --- | --- | --- |
| 2026-11-15 14:18 UTC | `9c096b0f-6b99-4ec6-8ec1-a4175a9fe77d` | [APK](https://expo.dev/artifacts/eas/eSiftpIQ0tfVb8nJcffhVQ9jumpKjS9pJve1R3ybYjQ.apk) | Tunnel Pinggy expiré à 14:54 UTC |
| 2026-11-15 15:52 UTC | `9a70e677-0ed6-497e-8fd1-afaf00358fa0` | [APK](https://expo.dev/artifacts/eas/9rT-2iH90C5l1P-h5SDKFy-UUvFZn_B286rm1cuI7RA.apk) | Tunnel Pinggy expiré à 16:36 UTC |
| 2026-11-16 08:08 UTC | `800f3995-2a34-4155-b5a1-22a3c9538ef8` | [APK](https://expo.dev/artifacts/eas/Dk-8_Aa5aJYNy7KLkJpmx2NGNUgWTPhva-5Y7tRx8Cs.apk) | API Render active : `https://plume-api.onrender.com` |

Les deux premiers APK sont installables, mais leurs URL d'API sont mortes. Le troisième pointe vers l'API Render durable.

## 9. Production

Le profil `production` produit un AAB, pas un APK. Avant toute publication :

- `JWT_SECRET` fort et aléatoire (32 caractères minimum) ;
- `DATABASE_URL` PostgreSQL réel ;
- HTTPS et HSTS ;
- CORS restreint aux origines réelles ;
- sauvegardes et test de restauration ;
- politique de confidentialité réelle (remplacer l'URL `example.invalid`) ;
- revue des accès aux manuscrits privés.

## 10. Limites de l'environnement de développement

- Pas de Java, pas d'Android SDK, pas de Xcode : aucun build natif local.
- Le compilateur Hermes fourni est `linux64` (x86_64) et ne s'exécute pas sur l'environnement ARM64 actuel. Un `expo export --platform android --no-bytecode` permet de vérifier le bundle JavaScript, mais pas de produire un APK.
- EAS Build est la voie prévue pour l'APK.

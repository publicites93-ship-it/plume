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

## 4. Lancer le build

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

## 5. Installer sur le téléphone

1. Ouvrir la page de build affichée par EAS sur le téléphone.
2. Télécharger l'APK.
3. Autoriser l'installation depuis le navigateur ou le gestionnaire de fichiers si Android le demande.
4. Ouvrir Plume. L'écran de bienvenue doit s'afficher sans Expo Go.

Le lien de build est propre à chaque build. Il ne faut pas le confondre avec une page de projet Expo.

## 6. Vérifier que l'API est réellement joignable

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

## 7. Tunnel temporaire

Pour un test immédiat sans déploiement, un tunnel HTTPS temporaire peut exposer l'API locale :

```bash
cloudflared tunnel --url http://localhost:4000
# ou
ssh -R 80:localhost:4000 nokey@localhost.run
```

Limites à annoncer clairement :

- l'URL change et le tunnel s'arrête avec la machine ;
- l'API de démonstration devient publiquement joignable ;
- les comptes de démonstration ont des mots de passe connus ;
- ce n'est pas une solution de production.

Pour un test durable, déployer l'API sur un hébergeur avec HTTPS et une base PostgreSQL, puis utiliser cette URL dans le profil `preview`.

## 8. Production

Le profil `production` produit un AAB, pas un APK. Avant toute publication :

- `JWT_SECRET` fort et aléatoire (32 caractères minimum) ;
- `DATABASE_URL` PostgreSQL réel ;
- HTTPS et HSTS ;
- CORS restreint aux origines réelles ;
- sauvegardes et test de restauration ;
- politique de confidentialité réelle (remplacer l'URL `example.invalid`) ;
- revue des accès aux manuscrits privés.

## 9. Limites de l'environnement de développement

- Pas de Java, pas d'Android SDK, pas de Xcode : aucun build natif local.
- Le compilateur Hermes fourni est `linux64` (x86_64) et ne s'exécute pas sur l'environnement ARM64 actuel. Un `expo export --platform android --no-bytecode` permet de vérifier le bundle JavaScript, mais pas de produire un APK.
- EAS Build est la voie prévue pour l'APK.

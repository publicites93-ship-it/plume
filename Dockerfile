# syntax=docker/dockerfile:1

# Image de l'API Plume pour un déploiement durable (Railway, Render, VPS).
# Le mobile n'est pas construit ici : seul le backend Fastify/tRPC est servi.

FROM node:22-bookworm-slim

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# On installe uniquement l'API et le paquet partagé : le mobile n'est pas
# nécessaire au runtime et ses dépendances Expo/React Native sont lourdes.
# On copie les manifestes avant le code pour profiter du cache Docker.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# `tsx` est une devDependency : on l'installe même si NODE_ENV=production
# est injecté par la plateforme au moment du build.
RUN npm ci --include=dev --workspace @plume/api --workspace @plume/shared

# Seuls l'API et le paquet partagé sont nécessaires au runtime.
# Les tsconfig héritent de la racine : le fichier doit être présent.
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# L'image n'est utilisée qu'en déploiement : le mode production active les
# garde-fous de config.ts (JWT_SECRET aléatoire ≥ 32 caractères, DATABASE_URL
# obligatoire) et masque les traces d'erreur. Placé après `npm ci` pour que
# les devDependencies (tsx) restent installées.
ENV NODE_ENV=production

EXPOSE 4000

# Les migrations sont idempotentes. Le seed de démonstration n'est exécuté
# que si SEED_DEMO=true : les comptes de démo ont des mots de passe connus.
CMD ["sh", "-c", "npm run db:migrate --workspace @plume/api && if [ \"$SEED_DEMO\" = \"true\" ]; then npm run db:seed --workspace @plume/api; else echo '[plume] seed de démonstration ignoré (SEED_DEMO != true)'; fi && npm run start --workspace @plume/api"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

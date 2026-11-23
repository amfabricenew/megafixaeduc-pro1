# Dockerfile pour MégafixaEduc Pro
FROM node:22-slim AS builder

WORKDIR /app

# Installation des dépendances de compilation pour better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Installer devDependencies nécessaires au build (vite, esbuild, @tailwindcss/vite)
# avec repli automatique sur npm install si package-lock.json diffère légèrement
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .

# Construction du frontend Vite et du backend Node.js puis nettoyage des devDependencies
RUN npm run build && npm prune --omit=dev --no-audit --no-fund && mkdir -p /app/backups

# Image de production finale ultra-légère
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Dépendances système d'exécution SQLite
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copie des dépendances de production déjà compilées et des bundles depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/backups ./backups

EXPOSE 3000

CMD ["node", "dist/server.cjs"]

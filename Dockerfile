# Dockerfile pour MégafixaEduc Pro
FROM node:20-slim AS builder

WORKDIR /app

# Installation des dépendances de compilation pour better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Construction du frontend Vite et du backend Node.js
RUN npm run build

# Image de production finale ultra-légère
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Dépendances système d'exécution SQLite
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copie des dépendances déjà compilées et des bundles depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

# Création du répertoire de données et de sauvegardes
RUN mkdir -p /app/backups

EXPOSE 3000

CMD ["node", "dist/server.cjs"]

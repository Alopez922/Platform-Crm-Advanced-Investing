# ── Etapa 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero (cache layer)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las deps (incluye devDeps para compilar TS)
RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente y compilar TypeScript
COPY . .
RUN npm run build

# ── Etapa 2: Producción ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copiar solo lo necesario para producción
COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Generar Prisma Client en producción
RUN npx prisma generate

# Copiar build compilado
COPY --from=builder /app/dist ./dist

# Cloud Run requiere el puerto 8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/server.js"]

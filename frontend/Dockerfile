# ── Etapa 1: Build de React/Vite ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL del backend en producción — hardcodeada para garantizar que Vite la incluya en el bundle
ENV VITE_API_URL=https://crm-backend-326048189386.us-central1.run.app/api
RUN npx vite build

# ── Etapa 2: Servir con Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copiar el build de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx para React SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run usa el puerto 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

# ── Etapa 1: Build de React/Vite ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# La URL del backend se pasa en tiempo de build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: Servir con Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copiar el build de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx para React SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run usa el puerto 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

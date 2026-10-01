# Imagem do proxy público: builda o SPA do painel e serve com o Caddy, que
# também faz o proxy da API e termina o TLS.
# Contexto de build = raiz do repo (ver docker-compose: context: .).

FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY caddy/Caddyfile /etc/caddy/Caddyfile

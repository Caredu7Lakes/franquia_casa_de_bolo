# Painel administrativo — Casa do Bolo (frontend)

SPA em **React + Vite + TypeScript + Tailwind** que consome a API do backend.
Autenticação por JWT; telas de Dashboard (analytics), Produtos (CRUD com upload
de foto), Clientes (CRM) e Marketing (disparo de campanha).

## Rodar em desenvolvimento
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```
O proxy do Vite encaminha `/auth`, `/products`, `/customers`, `/analytics` e
`/marketing` para `http://localhost:3000` (o backend). Para apontar para outro
backend em dev: `VITE_DEV_API=http://host:porta npm run dev`.

## Build
```bash
npm run build   # gera dist/ (estáticos)
```

## Produção
O build é feito dentro da imagem do **Caddy** (`caddy/Dockerfile`), que serve o
SPA e faz o proxy da API no mesmo domínio — não precisa subir nada à parte.
Basta `docker compose up -d --build` na raiz do projeto.

## Rotas (HashRouter)
`#/` Dashboard · `#/produtos` · `#/clientes` · `#/marketing` · `#/login`.
O HashRouter evita colisão das rotas de tela com os caminhos da API.

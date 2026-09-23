# 🍰 Chatbot Casa do Bolo — Backend & Engine de Automação

Backend **self-hosted** de atendimento no WhatsApp para confeitaria/padaria, sem custo por mensagem. Entrega cardápio interativo, FAQ, disparo em massa com proteção anti-ban, CRM de clientes com integração ao iFood e um painel administrativo protegido por autenticação.

---

## 🎯 Módulos

- **Atendimento WhatsApp** — cardápio por categoria, FAQ, encaminhamento para iFood/99Food, opt-in de promoções.
- **CRM** — cadastro de clientes, histórico de interações, hábitos de compra (ticket médio, frequência, total gasto), tags, notas e NPS.
- **Integração iFood** — ingestão de pedidos via webhook, alimentando os hábitos de compra do CRM.
- **Marketing** — disparo em massa de campanhas com fila e delay dinâmico (anti-ban), restrito a quem deu opt-in.
- **Analytics** — opções de menu mais acessadas, horários de pico, base apta a promoções.
- **Autenticação** — login JWT protegendo todos os endpoints administrativos.

---

## 🛠️ Stack

| Tecnologia | Função |
| :--- | :--- |
| **NestJS 11 (TypeScript)** | Framework backend modular |
| **Evolution API v2** (`evoapicloud/evolution-api`) | Engine do WhatsApp, sem taxa por disparo |
| **PostgreSQL** | Clientes, logs, cardápio, pedidos |
| **TypeORM** | ORM (entidades declarativas) |
| **Redis + BullMQ** | Filas de disparo assíncronas com rate limiting |
| **Cloudinary** | Armazenamento das fotos do cardápio (URL pública) |
| **JWT + Passport + bcrypt** | Autenticação do painel |
| **Docker Compose** | Postgres + Redis + Evolution + backend |

---

## 📐 Decisões arquiteturais

1. **Desacoplamento** — o bot consome `ProductsService`, não repositórios de outros módulos.
2. **Mídias em nuvem** — o banco guarda só a URL do Cloudinary; disco da VM é efêmero.
3. **Webhooks não-bloqueantes** — controllers respondem `200 OK` na hora e processam em background (evita reenvio de Evolution e iFood).
4. **Anti-ban serial** — workers de disparo rodam um job por vez, com delay progressivo + jitter.
5. **Segurança** — endpoints administrativos exigem JWT; dados sensíveis (telefone/nome) são mascarados na listagem; HTTPS via reverse proxy; criptografia em repouso pelo disco Azure.

---

## 🗄️ Modelo de dados

- **`Customer`** — telefone (único), nome, email, endereço, opt-in, tags, notas, NPS, e hábitos de compra (`orders_count`, `total_spent`, `average_ticket`, `last_order_at`).
- **`Product`** — nome, descrição, preço, categoria (10 categorias), `imageUrl`, disponibilidade.
- **`InteractionLog`** — cliente, opção de menu, mensagem, data.
- **`Order`** — pedido do iFood (idempotente por `ifood_order_id`), itens, total, canal, data.

### Categorias de produto
`BOLOS`, `MINI_BABY`, `BITES`, `RECHEADOS`, `CASEIRO_POTE`, `GELADOS`, `CUCAS_TORTAS`, `COBERTURAS`, `ESPECIAIS`, `ACESSORIOS`.

---

## 🔀 Fluxos

**Atendimento:**
```
WhatsApp ⇄ Evolution API → webhook /webhook → WhatsAppBotService
   → menu (1..10 categorias, P pedido, D dúvidas) → resposta
   → InteractionLog
```

**Pedido iFood → CRM:**
```
iFood (evento) → webhook /ifood/webhook → IfoodOrderService
   → busca detalhe do pedido → grava Order → atualiza stats do Customer
```

---

## 🔐 Autenticação e rotas

Login: `POST /auth/login` → retorna JWT (validade 12h). Enviar `Authorization: Bearer <token>` nas rotas protegidas.

| Rota | Acesso |
| :--- | :--- |
| `POST /auth/login` | Aberto |
| `GET /products` | Aberto (cardápio) |
| `POST` / `PATCH /products/:id` | **JWT** |
| `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id` | **JWT** |
| `GET /analytics/*` | **JWT** |
| `POST /marketing/campaign` | **JWT** |
| `POST /webhook` (Evolution) | Aberto |
| `POST /ifood/webhook` | Aberto |

---

## 🚀 Ambiente de desenvolvimento

### Pré-requisitos
- Node.js v18+ · Docker + Docker Compose

### 1. Instalar
```bash
git clone https://github.com/Caredu7Lakes/franquia_casa_de_bolo
cd franquia_casa_de_bolo
npm install
```

### 2. Variáveis de ambiente (`.env`)
```env
# Banco
DB_HOST=postgres
DB_PORT=5432
DB_USER=casadobolo_user
DB_PASS=casadobolo_pass
DB_NAME=casadobolo_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Evolution API
EVOLUTION_API_URL=http://evolution_api:8080
EVOLUTION_API_KEY=sua_chave_forte
EVOLUTION_INSTANCE_NAME=casa_do_bolo_instance

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud
CLOUDINARY_API_KEY=sua_key
CLOUDINARY_API_SECRET=seu_secret

# Autenticação (painel)
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=hash_bcrypt_da_senha
JWT_SECRET=segredo_longo_aleatorio

# iFood (app de parceiro)
IFOOD_CLIENT_ID=
IFOOD_CLIENT_SECRET=
```

### 3. Subir infraestrutura
```bash
docker compose up -d --build
```
Sobe PostgreSQL, Redis, Evolution API e backend.

### 4. Conectar a instância do WhatsApp
Acesse `http://SEU_IP:8080/manager`, informe a `EVOLUTION_API_KEY`, gere o QR e pareie um **número dedicado** (não o pessoal).

### 5. Popular o cardápio
```bash
docker compose cp products.seed.json backend:/app/products.seed.json
docker compose cp seed-products.js backend:/app/seed-products.js
docker compose exec -T backend node /app/seed-products.js
```

---

## ⚠️ Notas de operação e segurança

- **Risco de ban (Evolution/Baileys)**: use número dedicado, aqueça antes de disparar, mantenha os delays.
- **Sessão do WhatsApp** pode cair (atualização/desconexão): monitore `connection.update` e releia o QR.
- **iFood**: exige app de parceiro (CNPJ), homologação, autorização da loja e **webhook HTTPS**. O código está pronto; falta o credenciamento e o TLS.
- **HTTPS**: obrigatório antes de uso real — dados de clientes não devem trafegar em texto puro.
- **Produção**: trocar `synchronize: true` por `false` + migrations, para não alterar/dropar colunas com dado.
# 🍰 Chatbot Casa do Bolo — Backend & Engine de Automação

Backend **self-hosted** de atendimento no WhatsApp para confeitaria/padaria, sem custo por mensagem. Entrega cardápio interativo, FAQ, disparo em massa com proteção anti-ban, CRM de clientes com integração ao iFood e um painel administrativo protegido por autenticação.

---

## 🎯 Módulos

- **Atendimento WhatsApp** — cardápio por categoria, FAQ, encaminhamento para iFood/99Food, opt-in de promoções.
- **CRM** — cadastro de clientes, histórico de interações, hábitos de compra (ticket médio, frequência, total gasto), tags, notas e NPS.
- **Integração iFood** — ingestão de pedidos via webhook, alimentando os hábitos de compra do CRM.
- **Marketing** — disparo em massa de campanhas com fila e delay dinâmico (anti-ban), restrito a quem deu opt-in.
- **Analytics** — opções de menu mais acessadas, horários de pico, base apta a promoções.
- **Autenticação e usuários** — login JWT; gestão de usuários do painel (cadastro de e-mail/senha, papéis OWNER/OPERATOR, ativar/desativar, redefinir senha) restrita ao OWNER.
- **Painel administrativo (frontend)** — SPA React/Vite/Tailwind: dashboard de analytics, CRUD de produtos, CRM de clientes, disparo de campanhas e **gestão de usuários**. Ver [`frontend/`](./frontend/README.md).

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
| **React + Vite + Tailwind** | Painel administrativo (SPA), servido pelo Caddy |
| **Caddy** | Reverse proxy com HTTPS automático (Let's Encrypt) + serve o SPA |
| **Docker Compose** | Postgres + Redis + Evolution + backend + relay + Caddy |

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
WhatsApp ⇄ Evolution API → webhook_relay (assina HMAC) → /webhook → WhatsAppBotService
   → menu (1..10 categorias, P pedido, D dúvidas) → resposta
   → InteractionLog
```
> A Evolution não assina os webhooks; o **webhook_relay** calcula o HMAC-SHA256
> do corpo e repassa ao backend com `x-signature-256`.

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
| `GET` / `POST /users`, `PATCH` / `DELETE /users/:id` | **JWT (OWNER)** — gestão de usuários (trava do último OWNER) |
| `GET /products` | **JWT** (cardápio do tenant; o bot usa o serviço direto) |
| `POST` / `PATCH /products/:id` | **JWT** |
| `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id` | **JWT** |
| `GET /analytics/*` | **JWT** |
| `POST /marketing/campaign` | **JWT** |
| `POST /webhook` (Evolution) | **HMAC** (assinatura do corpo) |
| `POST /ifood/webhook` | **HMAC** (assinatura do corpo) |

> **Webhooks** exigem assinatura **HMAC-SHA256** do corpo cru no header
> `x-signature-256` (`sha256=<hexdigest>`), validada contra `WEBHOOK_HMAC_SECRET`.
> Sem o segredo configurado, os webhooks são recusados (fail-safe).

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

### 4. Rodar as migrations
O schema é gerido por migrations (`synchronize: false`). Rode após subir o banco:
```bash
docker compose exec backend npm run migration:run
```
Inclui o baseline, as políticas **RLS multi-tenant** e o `DEFAULT` de `tenant_id`
(preenche o tenant corrente da sessão RLS em cada insert). **Sem isso, as
gravações nas tabelas com RLS são rejeitadas.** Depois, crie o tenant e o usuário
OWNER:
```bash
docker compose exec -T backend node /app/migrate-phase1.js
docker compose exec -T backend node /app/migrate-phase2.js
```

### 5. Conectar a instância do WhatsApp
Acesse `http://SEU_IP:8080/manager`, informe a `EVOLUTION_API_KEY`, gere o QR e pareie um **número dedicado** (não o pessoal).

Aponte o webhook da instância para o **relay de assinatura** (não direto para o
backend), com `webhookByEvents=false` para postar sempre em `/webhook`:
```bash
curl -s -X POST http://SEU_IP:8080/webhook/set/casa_do_bolo_instance \
 -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
 -d '{"webhook":{"enabled":true,"url":"http://webhook_relay:3001/webhook","webhookByEvents":false,"events":["MESSAGES_UPSERT"]}}'
```
O relay assina o corpo (HMAC-SHA256) e repassa ao backend. Sem ele, a Evolution
(que não assina) receberia `401` do `HmacSignatureGuard`.

### 6. Popular o cardápio
Os arquivos já vão na imagem do backend. Com o tenant criado (Fase 1), rode:
```bash
docker compose exec -T backend node /app/seed-products.js
```
O seed resolve o tenant, seta o contexto RLS e insere os produtos. É idempotente:
se já houver produtos, não duplica — use `SEED_FORCE=1` para limpar e recriar
(`docker compose exec -T -e SEED_FORCE=1 backend node /app/seed-products.js`).

### 7. HTTPS (reverse proxy Caddy)
O serviço **caddy** termina o TLS e repassa para o backend; o backend fica
exposto só em `127.0.0.1`. Pré-requisitos:
1. **Domínio** com registro **DNS A** apontando para o IP público da VM.
2. Portas **80 e 443** abertas no **NSG do Azure** e no firewall da VM.
3. `DOMAIN` e `ACME_EMAIL` definidos no `.env`.

Subir:
```bash
docker compose up -d --build caddy
```
O Caddy obtém e renova o certificado do Let's Encrypt automaticamente, **builda o
painel** (SPA) e o serve no mesmo domínio, fazendo o proxy da API. A partir daí o
painel abre em `https://SEU_DOMINIO` e a API responde nos mesmos caminhos (o
`http://` redireciona). Acompanhe a emissão do certificado:
```bash
docker compose logs -f caddy
```
O código do painel fica em [`frontend/`](./frontend/README.md) (dev: `npm run dev`).

---

## ⚠️ Notas de operação e segurança

- **Risco de ban (Evolution/Baileys)**: use número dedicado, aqueça antes de disparar, mantenha os delays.
- **Sessão do WhatsApp** pode cair (atualização/desconexão): monitore `connection.update` e releia o QR.
- **iFood**: exige app de parceiro (CNPJ), homologação, autorização da loja e **webhook HTTPS**. O código está pronto; falta o credenciamento e o TLS.
- **HTTPS**: via reverse proxy **Caddy** (TLS automático). Depende de domínio + DNS + portas 80/443 abertas. O backend não deve ser exposto sem TLS.
- **Schema**: já em `synchronize: false` + migrations. Nunca ativar `synchronize` em produção (altera/dropa colunas com dado).
- **Segredos**: nenhuma senha no código. `APP_DB_PASSWORD` (role de runtime do banco), `JWT_SECRET`, `WEBHOOK_HMAC_SECRET`, `OWNER_PASSWORD` e `CLOUDINARY_*` vêm do `.env` (ver `.env.example`). Para rotacionar a senha do banco: defina o novo `APP_DB_PASSWORD` no `.env`, rode `ALTER ROLE casadobolo_app WITH PASSWORD '<novo>';` como `casadobolo_user` e `docker compose up -d backend`.
- **Backup**: `bash scripts/backup-db.sh` gera um dump comprimido em `./backups/` com rotação (padrão: 14). Agende no cron, ex.: `0 3 * * * cd ~/franquia_casa_de_bolo && bash scripts/backup-db.sh`. Restaurar: `gunzip -c backups/ARQ.sql.gz | docker compose exec -T postgres psql -U casadobolo_user -d casadobolo_db`.

---

## 📋 Pendências

| # | Item | Status | Bloqueio / Próximo passo |
| :-- | :--- | :--- | :--- |
| 1 | **Chip do WhatsApp** | ⏳ Aguardando | O número dedicado ainda **não foi recebido**. Sem o chip não é possível parear a instância na Evolution (QR code), então o bot **grava no banco mas não responde** (erro 404 `instance does not exist` no `sendText`). Quando chegar: ativar o número num celular → `POST /instance/create` → ler o QR em `http://IP:8080/manager` (ou `/instance/connect/casa_do_bolo_instance`) → parear. |
| 2 | **HTTPS / reverse proxy** | 🟡 Pronto, falta config | Reverse proxy **Caddy** implementado (TLS automático). Falta só o lado operacional: registrar o **domínio**, criar o **DNS A** para o IP da VM, abrir **80/443** no NSG e preencher `DOMAIN`/`ACME_EMAIL` no `.env`. |
| 3 | **Credenciamento iFood** | ⏳ Pendente | Código pronto; falta app de parceiro (CNPJ), homologação, autorização da loja e webhook HTTPS. |
| 4 | **99Food** | ⏳ Pendente | Link de pedido ainda não disponível (placeholder no menu). |

> ✅ **Resolvido:**
> - Gravação no banco sob RLS multi-tenant (`tenant_id` com `DEFAULT` da sessão + `SET app.current_tenant` na conexão correta da transação).
> - `TenantInterceptor` ativo globalmente — rotas do painel operam sob RLS.
> - Webhooks protegidos por assinatura **HMAC-SHA256** do corpo.
> - **webhook_relay** assina os webhooks da Evolution (que não assina nativamente) ponta a ponta.
> - **HTTPS** via Caddy (reverse proxy com TLS automático); backend restrito a `127.0.0.1`.
> - **Painel administrativo** (React/Vite/Tailwind) servido pelo Caddy: dashboard, produtos, clientes e marketing.
> - **Testes** unitários (Jest) do bot e do analytics.
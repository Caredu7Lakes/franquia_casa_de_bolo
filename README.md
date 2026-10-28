# ðŸ° Chatbot Casa do Bolo â€” Backend & Engine de AutomaÃ§Ã£o

Backend **self-hosted** de atendimento no WhatsApp para confeitaria/padaria, sem custo por mensagem. Entrega cardÃ¡pio interativo, FAQ, disparo em massa com proteÃ§Ã£o anti-ban, CRM de clientes com integraÃ§Ã£o ao iFood e um painel administrativo protegido por autenticaÃ§Ã£o.

---

## ðŸŽ¯ MÃ³dulos

- **Atendimento WhatsApp** â€” cardÃ¡pio por categoria, FAQ, encaminhamento para iFood/99Food, opt-in de promoÃ§Ãµes.
- **CRM** â€” cadastro de clientes, histÃ³rico de interaÃ§Ãµes, hÃ¡bitos de compra (ticket mÃ©dio, frequÃªncia, total gasto), tags, notas e NPS.
- **IntegraÃ§Ã£o iFood** â€” ingestÃ£o de pedidos via webhook, alimentando os hÃ¡bitos de compra do CRM.
- **Marketing** â€” disparo em massa de campanhas com fila e delay dinÃ¢mico (anti-ban), restrito a quem deu opt-in.
- **Analytics** â€” opÃ§Ãµes de menu mais acessadas, horÃ¡rios de pico, base apta a promoÃ§Ãµes.
- **AutenticaÃ§Ã£o e usuÃ¡rios** â€” login JWT; gestÃ£o de usuÃ¡rios do painel (cadastro de e-mail/senha, papÃ©is OWNER/OPERATOR, ativar/desativar, redefinir senha) restrita ao OWNER.
- **Painel administrativo (frontend)** â€” SPA React/Vite/Tailwind: dashboard de analytics, CRUD de produtos, CRM de clientes, disparo de campanhas e **gestÃ£o de usuÃ¡rios**. Ver [`frontend/`](./frontend/README.md).

---

## ðŸ› ï¸ Stack

| Tecnologia | FunÃ§Ã£o |
| :--- | :--- |
| **NestJS 11 (TypeScript)** | Framework backend modular |
| **Evolution API v2** (`evoapicloud/evolution-api`) | Engine do WhatsApp, sem taxa por disparo |
| **PostgreSQL** | Clientes, logs, cardÃ¡pio, pedidos |
| **TypeORM** | ORM (entidades declarativas) |
| **Redis + BullMQ** | Filas de disparo assÃ­ncronas com rate limiting |
| **Cloudinary** | Armazenamento das fotos do cardÃ¡pio (URL pÃºblica) |
| **JWT + Passport + bcrypt** | AutenticaÃ§Ã£o do painel |
| **React + Vite + Tailwind** | Painel administrativo (SPA), servido pelo Caddy |
| **Caddy** | Reverse proxy com HTTPS automÃ¡tico (Let's Encrypt) + serve o SPA |
| **Docker Compose** | Postgres + Redis + Evolution + backend + relay + Caddy |

---

## ðŸ“ DecisÃµes arquiteturais

1. **Desacoplamento** â€” o bot consome `ProductsService`, nÃ£o repositÃ³rios de outros mÃ³dulos.
2. **MÃ­dias em nuvem** â€” o banco guarda sÃ³ a URL do Cloudinary; disco da VM Ã© efÃªmero.
3. **Webhooks nÃ£o-bloqueantes** â€” controllers respondem `200 OK` na hora e processam em background (evita reenvio de Evolution e iFood).
4. **Anti-ban serial** â€” workers de disparo rodam um job por vez, com delay progressivo + jitter.
5. **SeguranÃ§a** â€” endpoints administrativos exigem JWT; dados sensÃ­veis (telefone/nome) sÃ£o mascarados na listagem; HTTPS via reverse proxy; criptografia em repouso pelo disco Azure.

---

## ðŸ—„ï¸ Modelo de dados

- **`Customer`** â€” telefone (Ãºnico), nome, email, endereÃ§o, opt-in, tags, notas, NPS, e hÃ¡bitos de compra (`orders_count`, `total_spent`, `average_ticket`, `last_order_at`).
- **`Product`** â€” nome, descriÃ§Ã£o, preÃ§o, categoria (10 categorias), `imageUrl`, disponibilidade.
- **`InteractionLog`** â€” cliente, opÃ§Ã£o de menu, mensagem, data.
- **`Order`** â€” pedido do iFood (idempotente por `ifood_order_id`), itens, total, canal, data.

### Categorias de produto
`BOLOS`, `MINI_BABY`, `BITES`, `RECHEADOS`, `CASEIRO_POTE`, `GELADOS`, `CUCAS_TORTAS`, `COBERTURAS`, `ESPECIAIS`, `ACESSORIOS`.

---

## ðŸ”€ Fluxos

**Atendimento:**
```
WhatsApp â‡„ Evolution API â†’ webhook_relay (assina HMAC) â†’ /webhook â†’ WhatsAppBotService
   â†’ menu (1..10 categorias, P pedido, D dÃºvidas) â†’ resposta
   â†’ InteractionLog
```
> A Evolution nÃ£o assina os webhooks; o **webhook_relay** calcula o HMAC-SHA256
> do corpo e repassa ao backend com `x-signature-256`.

**Pedido iFood â†’ CRM:**
```
iFood (evento) â†’ webhook /ifood/webhook â†’ IfoodOrderService
   â†’ busca detalhe do pedido â†’ grava Order â†’ atualiza stats do Customer
```

---

## ðŸ” AutenticaÃ§Ã£o e rotas

Login: `POST /auth/login` â†’ retorna JWT (validade 12h). Enviar `Authorization: Bearer <token>` nas rotas protegidas.

| Rota | Acesso |
| :--- | :--- |
| `POST /auth/login` | Aberto |
| `GET` / `POST /users`, `PATCH` / `DELETE /users/:id` | **JWT (OWNER)** â€” gestÃ£o de usuÃ¡rios (trava do Ãºltimo OWNER) |
| `GET /products` | Aberto (cardÃ¡pio) |
| `POST` / `PATCH /products/:id` | **JWT** |
| `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id` | **JWT** |
| `GET /analytics/*` | **JWT** |
| `POST /marketing/campaign` | **JWT** |
| `POST /webhook` (Evolution) | **HMAC** (assinatura do corpo) |
| `POST /ifood/webhook` | **HMAC** (assinatura do corpo) |

> **Webhooks** exigem assinatura **HMAC-SHA256** do corpo cru no header
> `x-signature-256` (`sha256=<hexdigest>`), validada contra `WEBHOOK_HMAC_SECRET`.
> Sem o segredo configurado, os webhooks sÃ£o recusados (fail-safe).

---

## ðŸš€ Ambiente de desenvolvimento

### PrÃ©-requisitos
- Node.js v18+ Â· Docker + Docker Compose

### 1. Instalar
```bash
git clone https://github.com/Caredu7Lakes/franquia_casa_de_bolo
cd franquia_casa_de_bolo
npm install
```

### 2. VariÃ¡veis de ambiente (`.env`)
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

# AutenticaÃ§Ã£o (painel)
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
O schema Ã© gerido por migrations (`synchronize: false`). Rode apÃ³s subir o banco:
```bash
docker compose exec -T backend node ./node_modules/typeorm/cli.js -d dist/data-source.js migration:run
```
Inclui o baseline, as polÃ­ticas **RLS multi-tenant** e o `DEFAULT` de `tenant_id`
(preenche o tenant corrente da sessÃ£o RLS em cada insert). **Sem isso, as
gravaÃ§Ãµes nas tabelas com RLS sÃ£o rejeitadas.** Depois, crie o tenant e o usuÃ¡rio
OWNER:
```bash
docker compose exec -T backend node /app/migrate-phase1.js
docker compose exec -T backend node /app/migrate-phase2.js
```

### 5. Conectar a instÃ¢ncia do WhatsApp
Acesse `http://SEU_IP:8080/manager`, informe a `EVOLUTION_API_KEY`, gere o QR e pareie um **nÃºmero dedicado** (nÃ£o o pessoal).

Aponte o webhook da instÃ¢ncia para o **relay de assinatura** (nÃ£o direto para o
backend), com `webhookByEvents=false` para postar sempre em `/webhook`:
```bash
curl -s -X POST http://SEU_IP:8080/webhook/set/casa_do_bolo_instance \
 -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
 -d '{"webhook":{"enabled":true,"url":"http://webhook_relay:3001/webhook","webhookByEvents":false,"events":["MESSAGES_UPSERT"]}}'
```
O relay assina o corpo (HMAC-SHA256) e repassa ao backend. Sem ele, a Evolution
(que nÃ£o assina) receberia `401` do `HmacSignatureGuard`.

### 6. Popular o cardÃ¡pio
```bash
docker compose cp products.seed.json backend:/app/products.seed.json
docker compose cp seed-products.js backend:/app/seed-products.js
docker compose exec -T backend node /app/seed-products.js
```

### 7. HTTPS (reverse proxy Caddy)
O serviÃ§o **caddy** termina o TLS e repassa para o backend; o backend fica
exposto sÃ³ em `127.0.0.1`. PrÃ©-requisitos:
1. **DomÃ­nio** com registro **DNS A** apontando para o IP pÃºblico da VM.
2. Portas **80 e 443** abertas no **Security Group da AWS** e no firewall da VM.
3. `DOMAIN` e `ACME_EMAIL` definidos no `.env`.

Subir:
```bash
docker compose up -d --build caddy
```
O Caddy obtÃ©m e renova o certificado do Let's Encrypt automaticamente, **builda o
painel** (SPA) e o serve no mesmo domÃ­nio, fazendo o proxy da API. A partir daÃ­ o
painel abre em `https://SEU_DOMINIO` e a API responde nos mesmos caminhos (o
`http://` redireciona). Acompanhe a emissÃ£o do certificado:
```bash
docker compose logs -f caddy
```
O cÃ³digo do painel fica em [`frontend/`](./frontend/README.md) (dev: `npm run dev`).

---

## âš ï¸ Notas de operaÃ§Ã£o e seguranÃ§a

- **Risco de ban (Evolution/Baileys)**: use nÃºmero dedicado, aqueÃ§a antes de disparar, mantenha os delays.
- **SessÃ£o do WhatsApp** pode cair (atualizaÃ§Ã£o/desconexÃ£o): monitore `connection.update` e releia o QR.
- **iFood**: exige app de parceiro (CNPJ), homologaÃ§Ã£o, autorizaÃ§Ã£o da loja e **webhook HTTPS**. O cÃ³digo estÃ¡ pronto; falta o credenciamento e o TLS.
- **HTTPS**: via reverse proxy **Caddy** (TLS automÃ¡tico). Depende de domÃ­nio + DNS + portas 80/443 abertas. O backend nÃ£o deve ser exposto sem TLS.
- **Schema**: jÃ¡ em `synchronize: false` + migrations. Nunca ativar `synchronize` em produÃ§Ã£o (altera/dropa colunas com dado).
- **Segredos**: nenhuma senha no cÃ³digo. `APP_DB_PASSWORD` (role de runtime do banco), `JWT_SECRET`, `WEBHOOK_HMAC_SECRET`, `OWNER_PASSWORD` e `CLOUDINARY_*` vÃªm do `.env` (ver `.env.example`). Para rotacionar a senha do banco: defina o novo `APP_DB_PASSWORD` no `.env`, rode `ALTER ROLE casadobolo_app WITH PASSWORD '<novo>';` como `casadobolo_user` e `docker compose up -d backend`.
- **Backup**: `bash scripts/backup-db.sh` gera um dump comprimido em `./backups/` com rotaÃ§Ã£o (padrÃ£o: 14). Agende no cron, ex.: `0 3 * * * cd ~/franquia_casa_de_bolo && bash scripts/backup-db.sh`. Restaurar: `gunzip -c backups/ARQ.sql.gz | docker compose exec -T postgres psql -U casadobolo_user -d casadobolo_db`.

---

## ðŸ“‹ PendÃªncias

| # | Item | Status | Bloqueio / PrÃ³ximo passo |
| :-- | :--- | :--- | :--- |
| 1 | **Chip do WhatsApp** | â³ Aguardando | O nÃºmero dedicado ainda **nÃ£o foi recebido**. Sem o chip nÃ£o Ã© possÃ­vel parear a instÃ¢ncia na Evolution (QR code), entÃ£o o bot **grava no banco mas nÃ£o responde** (erro 404 `instance does not exist` no `sendText`). Quando chegar: ativar o nÃºmero num celular â†’ `POST /instance/create` â†’ ler o QR em `http://IP:8080/manager` (ou `/instance/connect/casa_do_bolo_instance`) â†’ parear. |
| 2 | **HTTPS / reverse proxy** | ðŸŸ¡ Pronto, falta config | Reverse proxy **Caddy** implementado (TLS automÃ¡tico). Falta sÃ³ o lado operacional: registrar o **domÃ­nio**, criar o **DNS A** para o IP da VM, abrir **80/443** no NSG e preencher `DOMAIN`/`ACME_EMAIL` no `.env`. |
| 3 | **Credenciamento iFood** | â³ Pendente | CÃ³digo pronto; falta app de parceiro (CNPJ), homologaÃ§Ã£o, autorizaÃ§Ã£o da loja e webhook HTTPS. |
| 4 | **99Food** | â³ Pendente | Link de pedido ainda nÃ£o disponÃ­vel (placeholder no menu). |

> âœ… **Resolvido:**
> - GravaÃ§Ã£o no banco sob RLS multi-tenant (`tenant_id` com `DEFAULT` da sessÃ£o + `SET app.current_tenant` na conexÃ£o correta da transaÃ§Ã£o).
> - `TenantInterceptor` ativo globalmente â€” rotas do painel operam sob RLS.
> - Webhooks protegidos por assinatura **HMAC-SHA256** do corpo.
> - **webhook_relay** assina os webhooks da Evolution (que nÃ£o assina nativamente) ponta a ponta.
> - **HTTPS** via Caddy (reverse proxy com TLS automÃ¡tico); backend restrito a `127.0.0.1`.
> - **Painel administrativo** (React/Vite/Tailwind) servido pelo Caddy: dashboard, produtos, clientes e marketing.
> - **Testes** unitÃ¡rios (Jest) do bot e do analytics.

## âš ï¸ DÃ­vida tÃ©cnica â€” correÃ§Ãµes exigidas para operaÃ§Ã£o SaaS

Itens levantados em auditoria. Em loja Ãºnica funcionam; num SaaS multi-tenant
sÃ£o falhas que precisam ser corrigidas antes de escalar.

### SeguranÃ§a

1. **Senha do Postgres hardcoded no docker-compose** (`POSTGRES_PASSWORD: casadobolo_pass`,
   e a mesma na `DATABASE_CONNECTION_URI` da Evolution). EstÃ¡ versionada e Ã© fraca.
   **CorreÃ§Ã£o:** mover para `.env` (`${DB_PASSWORD}`), gerar senha forte, rotacionar.

2. **Porta 8080 da Evolution publicada** (`ports: ['8080:8080']` no compose). O manager
   do WhatsApp fica exposto na internet se o firewall abrir. Hoje sÃ³ o SG a protege â€”
   defesa Ãºnica.
   **CorreÃ§Ã£o:** `127.0.0.1:8080:8080` (ou sem publish) e acesso ao manager via tÃºnel SSH.

3. **Senha do role de runtime interpolada por string na migration**
   (`CREATE ROLE casadobolo_app LOGIN PASSWORD '${appPassword}'`). Quebra com caracteres
   especiais e Ã© mÃ¡ prÃ¡tica de DDL.
   **CorreÃ§Ã£o:** usar `format('... PASSWORD %L', appPassword)` para escapar com seguranÃ§a.

4. **Segredos geridos Ã  mÃ£o** â€” `.env` montado por SSH na VM, sem gerenciador. Se a VM
   morre, os segredos se perdem; nÃ£o hÃ¡ rotaÃ§Ã£o nem auditoria.
   **CorreÃ§Ã£o:** AWS SSM Parameter Store / Secrets Manager; a VM lÃª de lÃ¡ no boot.

5. **CardÃ¡pio pÃºblico single-tenant** â€” `GET /products` (sem auth) resolve um tenant fixo
   pela instÃ¢ncia Evolution do `.env`. Funciona com uma loja; com vÃ¡rias, expÃµe/mistura
   cardÃ¡pio do tenant errado.
   **CorreÃ§Ã£o:** resolver o tenant por contexto (subdomÃ­nio, query validado) ou tornar
   a rota autenticada por loja. Rota pÃºblica nÃ£o pode assumir tenant Ãºnico.

### Arquitetura

6. **Deploy manual sem artefato versionado** â€” deploy Ã© SSH + `git pull` + `docker build`
   na VM de produÃ§Ã£o. ConsequÃªncias: o **artefato testado no CI â‰  o servido** (builds
   diferentes, mÃ¡quinas diferentes); build consome RAM/CPU do servidor de produÃ§Ã£o;
   sem rollback; sem rastro.
   **CorreÃ§Ã£o (direÃ§Ã£o madura):** CI builda e testa as imagens â†’ publica em registry
   (GHCR/ECR) com **tag de versÃ£o** (nÃ£o `latest`) â†’ VM faz `docker compose pull` da
   imagem exata que passou no CI. Rollback = apontar para a tag anterior.

7. **Frontend compilado dentro da imagem do Caddy** â€” mistura responsabilidades (proxy
   que tambÃ©m builda React) e obriga rebuild do Caddy a cada mudanÃ§a de tela.
   **CorreÃ§Ã£o:** build do SPA em estÃ¡gio/pipeline separado; Caddy apenas serve estÃ¡ticos
   prontos.

8. **Workers BullMQ rodam fora do contexto RLS** â€” nÃ£o tÃªm request/JWT, logo nÃ£o setam
   `app.current_tenant`. Qualquer escrita futura de worker em tabela com RLS falha (42501).
   **CorreÃ§Ã£o:** expor `runForTenant(tenantId, work)` pÃºblico no `TenantResolverService`;
   carregar `tenantId` no job e envolver a escrita nesse contexto. (Bloqueia o mÃ³dulo de
   persistÃªncia de campanha.)

### Boas prÃ¡ticas

9. **Scripts operacionais precisam setar o tenant** â€” `seed-products.js` falhava sob RLS
   por nÃ£o setar `app.current_tenant`. JÃ¡ corrigido; padronizar: todo script que conecta
   como `casadobolo_app` deve setar o tenant da sessÃ£o antes de escrever.

10. **`migrate-phase2.js` sem normalizaÃ§Ã£o de e-mail** â€” permitiu dois OWNERs com e-mails
    quase idÃªnticos, causando confusÃ£o de login. Reset de senha tambÃ©m nÃ£o tem fluxo
    prÃ³prio (foi feito por UPDATE direto no banco).
    **CorreÃ§Ã£o:** normalizar e-mail (lowercase/trim), e um comando dedicado de reset de senha.

### Capacidades ainda nÃ£o modeladas (placeholders no dashboard)

- **ConversÃ£o (interaÃ§Ãµes â†’ pedidos):** exige atribuiÃ§Ã£o no schema (marcar origem do
  pedido). Sem isso, qualquer taxa Ã© invÃ¡lida. Card estÃ¡ como "Em breve".
- **Marketing (resultado de campanha):** exige persistir cada disparo
  (`CampaignDispatch` + migration RLS + instrumentaÃ§Ã£o do worker â€” ver item 8). Card
  estÃ¡ como "Em breve".

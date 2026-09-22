# 🍰 Chatbot Casa do Bolo — Backend & Engine de Automação

Repositório central do **Chatbot Casa do Bolo**: uma solução **self-hosted** de atendimento no WhatsApp para a confeitaria/padaria, sem custo por mensagem. Entrega menu interativo com fotos e preços, respostas para dúvidas frequentes e uma engine de disparos em massa com proteção anti-ban.

---

## 🎯 Objetivos

- **Zero custo por mensagem** — Evolution API (self-hosted) no lugar da API oficial da Meta.
- **Menu visual interativo** — envio de produtos (pães, salgados, bolos, doces) com foto e preço em tempo real.
- **Captura de leads + opt-in** — cadastro do contato com consentimento explícito para campanhas.
- **Analytics do negócio** — log de interações para mapear opções mais acessadas e horários de pico.
- **Dashboard-ready** — backend preparado para um front-end Next.js.

---

## 🛠️ Stack

| Tecnologia | Função | Por quê |
| :--- | :--- | :--- |
| **NestJS 11 (TypeScript)** | Framework backend | Arquitetura modular, injeção de dependências, bom casamento com TypeORM. |
| **Evolution API v2** | Engine do WhatsApp | Consome o WhatsApp via HTTP/Webhooks, sem taxa por disparo. |
| **PostgreSQL** | Banco relacional | Persistência de clientes, logs de métricas e cardápio. |
| **TypeORM** | ORM | Entidades declarativas em TypeScript e migrations organizadas. |
| **Redis + BullMQ** | Filas | Disparos em massa assíncronos com rate limiting e delay dinâmico (anti-ban). |
| **Docker Compose** | Conteinerização | Postgres + Redis + Evolution sobem com um comando. |

> **Imagem Docker da Evolution:** `evoapicloud/evolution-api` (série v2.3.x). O antigo `atendai/evolution-api` foi descontinuado.

---

## 📐 Decisões arquiteturais

1. **Desacoplamento de módulos** — o `WhatsAppBotService` não acessa repositórios de outros módulos: consome o `ProductsService` exportado pelo `ProductsModule`. A regra do cardápio fica isolada.
2. **Mídias em nuvem** — deploy em disco efêmero (Render, Fly.io, Railway); o banco guarda apenas a **URL pública** da imagem (Cloudinary/S3), nunca o binário.
3. **Webhook não-bloqueante** — o controller responde `200 OK` de imediato e processa a mensagem em background (`.catch` sem `await`), evitando timeout e reenvio pela Evolution. As filas do BullMQ são usadas nos **disparos em massa e campanhas**, não no atendimento em tempo real.
4. **Anti-ban serial** — os workers de disparo rodam **um job por vez**, com delay progressivo + jitter. Não aumentar a concorrência desses workers: envio em paralelo acelera o bloqueio do número.
5. **Alinhamento com Evolution v2** — payloads `sendText`/`sendMedia` no formato v2 (`{ number, text }` achatado). Sem resíduo de template/formatos da API Meta.

---

## 🗄️ Modelo de dados

- **`Customer`** — `id`, `phone_number` (único), `name`, `opt_in_promotions` (bool), `opt_in_updated_at`, `created_at`.
- **`Product`** — `id`, `name`, `description`, `price`, `category` (`BREADS_SAVORIES` | `CAKES_SWEETS`), `imageUrl`, `available` (bool).
- **`InteractionLog`** — `id`, `customer_id`, `menuOption` (ex.: `1.1`, `3_DUVIDAS`), `userMessage`, `created_at`.

---

## 🔀 Fluxo de atendimento

```
WhatsApp ⇄ Evolution API (Docker)
                │  webhook: messages.upsert
                ▼
        WhatsAppWebhookController  → 200 OK imediato
                │  processamento em background
                ▼
          WhatsAppBotService
                ├─ opt-in de promoções (sim/não)
                ├─ roteamento de menu (1 / 1.1 / 1.2 / 2 / 3)
                ├─ ProductsService.findAvailableByCategory → sendMedia
                └─ InteractionLog (menuOption, userMessage)
```

---

## 🚀 Ambiente de desenvolvimento

### Pré-requisitos
- **Node.js** v18+
- **Docker** e **Docker Compose**

### 1. Instalar dependências
```bash
git clone https://github.com/Caredu7Lakes/franquia_casa_de_bolo
cd franquia_casa_de_bolo
npm install
```

### 2. Variáveis de ambiente (`.env`)
```env
# Banco
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=casa_do_bolo

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_global
EVOLUTION_INSTANCE_NAME=casa_do_bolo_instance
```

### 3. Subir a infraestrutura
```bash
docker compose up -d --build
```
Sobe PostgreSQL, Redis e Evolution API.

### 4. Conectar a instância do WhatsApp
Gere o QR pela Evolution e leia com o aparelho dedicado. Durante o setup, `LOG_LEVEL=INFO` ajuda a diagnosticar; em produção, volte para `ERROR`.

### 5. Rodar o backend
```bash
npm run start:dev
```

---

## 📊 Endpoints de Analytics

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/analytics/frequent-questions` | Opções de menu mais acessadas. |
| `GET` | `/analytics/peak-hours` | Dias e horários de pico. |
| `GET` | `/analytics/opted-in-customers` | Contatos aptos a receber promoções. |

---

## ⚠️ Notas de operação

- **Risco de ban**: a Evolution é não-oficial (Baileys). Use número dedicado, aqueça antes de disparar em massa e mantenha os delays. Ban é a premissa de risco central do projeto.
- **Sessão**: a instância pode cair (WhatsApp atualiza, aparelho desconecta). Monitorar o evento `connection.update` é recomendado para religar/reler QR.
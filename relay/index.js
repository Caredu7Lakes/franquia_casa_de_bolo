'use strict';

/**
 * Relay de assinatura HMAC para webhooks.
 *
 * A Evolution API não assina os webhooks que envia. Este relay fica entre a
 * Evolution e o backend: recebe o POST sem assinatura, calcula o HMAC-SHA256 do
 * corpo CRU (os mesmos bytes recebidos) usando WEBHOOK_HMAC_SECRET e repassa ao
 * backend com o header de assinatura — exatamente o que o HmacSignatureGuard
 * espera.
 *
 * É agnóstico de rota: repassa req.url como veio (/webhook, /ifood/webhook, ...)
 * para UPSTREAM_URL + req.url. Roda só na rede interna do Docker.
 */

const http = require('http');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3001', 10);
const UPSTREAM = (process.env.UPSTREAM_URL || 'http://backend:3000').replace(/\/+$/, '');
const SECRET = process.env.WEBHOOK_HMAC_SECRET || '';
const HEADER = (process.env.WEBHOOK_HMAC_HEADER || 'x-signature-256').toLowerCase();

if (!SECRET) {
  console.error('[relay] WEBHOOK_HMAC_SECRET ausente — não há como assinar. Encerrando.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks);
    const signature = 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
    const target = UPSTREAM + req.url;

    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          'content-type': req.headers['content-type'] || 'application/json',
          [HEADER]: signature,
        },
        body: raw.length ? raw : undefined,
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json',
      });
      res.end(text);
    } catch (err) {
      console.error('[relay] falha ao repassar para', target, '-', (err && err.message) || err);
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad_gateway' }));
    }
  });
  req.on('error', (err) => {
    console.error('[relay] erro na requisição:', (err && err.message) || err);
    res.writeHead(400);
    res.end();
  });
});

server.listen(PORT, () => {
  console.log(`[relay] assinando webhooks e repassando para ${UPSTREAM} na porta ${PORT}`);
});

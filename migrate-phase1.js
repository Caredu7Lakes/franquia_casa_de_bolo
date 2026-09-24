/**
 * Fase 1 — migração de dados:
 * 1. Garante 1 tenant "Casa do Bolo" (o cliente atual).
 * 2. Vincula esse tenant à instância Evolution existente.
 * Idempotente: rodar 2x não duplica.
 */
const { Client } = require('pg');

async function run() {
  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await c.connect();

  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance';

  // Cria o tenant se ainda não existe (por instância).
  const existing = await c.query('SELECT id FROM tenants WHERE evolution_instance = $1', [instance]);
  let tenantId;
  if (existing.rows.length) {
    tenantId = existing.rows[0].id;
    console.log('Tenant já existe:', tenantId);
  } else {
    const res = await c.query(
      `INSERT INTO tenants (name, active, evolution_instance) VALUES ($1, true, $2) RETURNING id`,
      ['Casa do Bolo', instance],
    );
    tenantId = res.rows[0].id;
    console.log('Tenant criado:', tenantId);
  }
  await c.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
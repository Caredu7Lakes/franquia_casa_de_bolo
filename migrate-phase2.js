/**
 * Fase 2 — cria o usuário OWNER do tenant "Casa do Bolo".
 * Idempotente: não duplica se o email já existe.
 */
const { Client } = require('pg');

const EMAIL = 'nprimos31@icloud.com';
const NAME = 'Casa do Bolo';
const PASSWORD_HASH = '$2b$10$odb4ddme4XodYZ8nAMCvg.pbwD6ZBdntCZw8771ZE6tIPucja2ZtO'; // Samantha

async function run() {
  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await c.connect();

  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance';
  const t = await c.query('SELECT id FROM tenants WHERE evolution_instance = $1', [instance]);
  if (!t.rows.length) throw new Error('Tenant não encontrado — rode a migração da Fase 1 antes.');
  const tenantId = t.rows[0].id;

  const exists = await c.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
  if (exists.rows.length) {
    console.log('Usuário já existe:', exists.rows[0].id);
  } else {
    const res = await c.query(
      `INSERT INTO users (email, password_hash, name, role, active, tenant_id)
       VALUES ($1, $2, $3, 'OWNER', true, $4) RETURNING id`,
      [EMAIL, PASSWORD_HASH, NAME, tenantId],
    );
    console.log('Usuário OWNER criado:', res.rows[0].id, 'no tenant', tenantId);
  }
  await c.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
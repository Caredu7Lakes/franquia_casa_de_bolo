/**
 * Fase 2 — cria (ou atualiza a senha d)o usuário OWNER do tenant.
 *
 * Credenciais vêm do AMBIENTE, nunca hardcoded:
 *   OWNER_EMAIL     (obrigatório)
 *   OWNER_PASSWORD  (obrigatório — texto puro; é hasheado aqui com bcrypt)
 *   OWNER_NAME      (opcional, default "Casa do Bolo")
 *
 * Idempotente: se o usuário já existe, atualiza a senha (útil para rotacionar);
 * senão, cria com papel OWNER.
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME || 'Casa do Bolo';
  if (!email || !password) {
    throw new Error('OWNER_EMAIL e OWNER_PASSWORD são obrigatórios — defina no .env.');
  }

  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await c.connect();

  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance';
  const t = await c.query('SELECT id FROM tenants WHERE evolution_instance = $1', [instance]);
  if (!t.rows.length) throw new Error('Tenant não encontrado — rode a migração da Fase 1 antes.');
  const tenantId = t.rows[0].id;

  const passwordHash = await bcrypt.hash(password, 10);

  const exists = await c.query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length) {
    await c.query('UPDATE users SET password_hash = $1, name = $2 WHERE email = $3', [passwordHash, name, email]);
    console.log('Senha do OWNER atualizada:', exists.rows[0].id);
  } else {
    const res = await c.query(
      `INSERT INTO users (email, password_hash, name, role, active, tenant_id)
       VALUES ($1, $2, $3, 'OWNER', true, $4) RETURNING id`,
      [email, passwordHash, name, tenantId],
    );
    console.log('Usuário OWNER criado:', res.rows[0].id, 'no tenant', tenantId);
  }
  await c.end();
}
run().catch((e) => { console.error(e); process.exit(1); });

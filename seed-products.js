/**
 * Seed do cardápio em products.seed.json.
 *
 * products está sob RLS: é preciso resolver o tenant e setar app.current_tenant
 * na MESMA conexão antes de inserir (o tenant_id é preenchido pelo DEFAULT da
 * coluna a partir desse contexto). Sem isso o INSERT é rejeitado.
 *
 * Idempotente por segurança: se já houver produtos no tenant, não duplica —
 * aborta com aviso. Use SEED_FORCE=1 para limpar o cardápio do tenant e recriar.
 */
const fs = require('fs');
const { Client } = require('pg');

async function seed() {
  const products = JSON.parse(fs.readFileSync(__dirname + '/products.seed.json', 'utf-8'));
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance';
  const t = await client.query('SELECT id FROM tenants WHERE evolution_instance = $1', [instance]);
  if (!t.rows.length) throw new Error('Tenant não encontrado — rode a Fase 1 antes.');
  const tenantId = t.rows[0].id;

  // Contexto RLS desta conexão.
  await client.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenantId]);

  const existing = await client.query('SELECT COUNT(*)::int AS n FROM products');
  if (existing.rows[0].n > 0) {
    if (process.env.SEED_FORCE === '1') {
      await client.query('DELETE FROM products'); // RLS limita ao tenant atual
      console.log(`SEED_FORCE: ${existing.rows[0].n} produtos removidos antes de recriar.`);
    } else {
      console.log(`Já existem ${existing.rows[0].n} produtos neste tenant — nada a fazer. Use SEED_FORCE=1 para recriar.`);
      await client.end();
      return;
    }
  }

  let count = 0;
  for (const p of products) {
    await client.query(
      `INSERT INTO products (name, description, price, category, "imageUrl", available)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [p.name, p.description || null, p.price, p.category, p.imageUrl || null, p.available],
    );
    count++;
  }
  console.log(`Inseridos: ${count}`);
  await client.end();
}
seed().catch((e) => { console.error(e); process.exit(1); });

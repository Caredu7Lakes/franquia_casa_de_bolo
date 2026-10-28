const fs = require('fs');
const { Client } = require('pg');

async function seed() {
  const tenantId = process.env.SEED_TENANT_ID;
  if (!tenantId) {
    console.error('Erro: defina SEED_TENANT_ID (uuid do tenant) no ambiente.');
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(__dirname + '/products.seed.json', 'utf-8'));
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  // Role casadobolo_app respeita RLS: fixa o tenant da sessão antes dos inserts,
  // senão a policy WITH CHECK rejeita (42501).
  await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant', tenantId]);

  let count = 0;
  for (const p of products) {
    await client.query(
      `INSERT INTO products (tenant_id, name, description, price, category, "imageUrl", available)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, p.name, p.description || null, p.price, p.category, p.imageUrl || null, p.available],
    );
    count++;
  }
  console.log(`Inseridos: ${count}`);
  await client.end();
}
seed().catch((e) => { console.error(e); process.exit(1); });

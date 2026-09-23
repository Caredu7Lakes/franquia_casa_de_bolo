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
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("HIBA: A DATABASE_URL környezeti változó nincs beállítva a .env.local fájlban!");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  await client.query('ALTER TABLE public.felhasznalo_profil ADD COLUMN IF NOT EXISTS telefon TEXT;');
  console.log('SQL executed successfully!');
  await client.end();
}

run().catch(console.error);

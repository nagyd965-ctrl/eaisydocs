const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("HIBA: A DATABASE_URL környezeti változó nincs beállítva a .env.local fájlban!");
    process.exit(1);
  }
  const sql = fs.readFileSync('supabase/migrations/20260729000001_hr_add_probaido_to_rpc.sql', 'utf8');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

main();

import { Client } from 'pg';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("HIBA: A DATABASE_URL környezeti változó nincs beállítva a .env.local fájlban!");
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const filePath = process.argv[2] || 'supabase/migrations/20260722000009_add_szerzodes_adatok.sql';
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log("Migration executed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();

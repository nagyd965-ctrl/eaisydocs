import { Client } from 'pg';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("HIBA: A DATABASE_URL környezeti változó nincs beállítva a .env.local fájlban!");
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Kapcsolódva az adatbázishoz...");

    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20261014000001_add_eaisybill_company_id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Migráció futtatása...");
    await client.query(sql);

    // Ellenőrzés
    const res = await client.query(`
      SELECT id, name, tax_number, eaisybill_company_id 
      FROM public.companies;
    `);
    console.log("Sikeres migráció! Jelenlegi cégek az eaisyDocs-ban:");
    console.table(res.rows);

  } catch (err) {
    console.error("Hiba a migráció futtatásakor:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

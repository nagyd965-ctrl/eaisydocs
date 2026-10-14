import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function check() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("HIBA: A DATABASE_URL környezeti változó nincs beállítva a .env.local fájlban!");
    process.exit(1);
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('irat', 'ugyirat', 'partner', 'hr_dolgozo_adatlap');
  `);
  console.log('Existing Policies:', res.rows);
  await client.end();
}

check();

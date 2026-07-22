import { Client } from 'pg';
import fs from 'fs';

const connectionString = "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

async function runMigration() {
  const client = new Client({
    connectionString,
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

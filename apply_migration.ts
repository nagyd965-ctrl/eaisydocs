import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';

config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/20260722000004_hr_dolgozo_tabs_tables.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await client.end();
  }
}

run();

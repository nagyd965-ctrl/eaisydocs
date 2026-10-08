import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'company_id' AND table_schema = 'public'
      )
    ORDER BY table_name;
  `);
  console.log('Tables WITHOUT company_id:', res.rows.map(r => r.table_name));
  await client.end();
}

check();

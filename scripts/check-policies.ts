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
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('irat', 'ugyirat', 'partner', 'hr_dolgozo_adatlap');
  `);
  console.log('Existing Policies:', res.rows);
  await client.end();
}

check();

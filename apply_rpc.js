const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const sql = fs.readFileSync('supabase/migrations/20260729000001_hr_add_probaido_to_rpc.sql', 'utf8');
  const client = new Client({
    connectionString: "postgresql://postgres:Nincsapellata1%27@db.pdthccijqnhphjbtrtwo.supabase.co:5432/postgres",
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

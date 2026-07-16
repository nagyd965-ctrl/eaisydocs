const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  await client.connect();
  const sql = fs.readFileSync('supabase/migrations/20260716000003_add_disposal_tables.sql', 'utf-8');
  
  try {
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();

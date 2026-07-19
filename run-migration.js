const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  const sql = fs.readFileSync('supabase/migrations/20260719075925_mentett_kereses.sql', 'utf8');
  
  try {
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();

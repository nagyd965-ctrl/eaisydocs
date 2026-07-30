const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Nincsapellata1%27@db.pdthccijqnhphjbtrtwo.supabase.co:6543/postgres'
});

async function run() {
  await client.connect();
  await client.query('ALTER TABLE public.felhasznalo_profil ADD COLUMN IF NOT EXISTS telefon TEXT;');
  console.log('SQL executed successfully!');
  await client.end();
}

run().catch(console.error);

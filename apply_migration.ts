import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';

config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    const sql = fs.readFileSync(process.argv[2], 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await client.end();
  }
}

run();

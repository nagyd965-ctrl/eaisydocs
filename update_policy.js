require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query(`CREATE POLICY "Users can delete their own notifications" ON public.alkalmazas_ertesites FOR DELETE USING (auth.uid() = user_id);`);
    console.log("Policy created successfully.");
  } catch (err) {
    if (err.code === '42710') {
        console.log("Policy already exists.");
    } else {
        console.error("Error:", err);
    }
  } finally {
    await client.end();
  }
}

run();

import { Client } from 'pg';

async function checkPolicies() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  const query = `
    SELECT schemaname, tablename, policyname, qual, with_check 
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND (
      qual::text LIKE '%szerepkor%' 
      OR with_check::text LIKE '%szerepkor%'
    )
  `;
  
  const res = await client.query(query);
  const rows = res.rows.filter(r => 
    r.qual?.includes('legacy_szerepkor') || 
    r.with_check?.includes('legacy_szerepkor') ||
    r.qual?.match(/[^_]szerepkor/) || 
    r.with_check?.match(/[^_]szerepkor/)
  );
  
  console.log(JSON.stringify(rows, null, 2));
  
  await client.end();
}

checkPolicies().catch(console.error);

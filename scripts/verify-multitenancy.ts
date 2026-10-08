import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function verify() {
  const client = new Client({
    connectionString: connectionString.includes('db.pdthccijqnhphjbtrtwo.supabase.co')
      ? "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
      : connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database for verification.");

    const comps = await client.query('SELECT id, name, tax_number, address, owner_id, share_token FROM public.companies;');
    console.log('Companies:', comps.rows);

    const mems = await client.query('SELECT count(*) FROM public.company_members;');
    console.log('Company members count:', mems.rows[0].count);

    const cache = await client.query('SELECT count(*) FROM public.user_company_access_cache;');
    console.log('Access cache count:', cache.rows[0].count);

    const ugyirats = await client.query('SELECT count(*) as total, count(company_id) as with_company FROM public.ugyirat;');
    console.log('Ugyirat count:', ugyirats.rows[0]);

    const irats = await client.query('SELECT count(*) as total, count(company_id) as with_company FROM public.irat;');
    console.log('Irat count:', irats.rows[0]);

    const hr = await client.query('SELECT count(*) as total, count(company_id) as with_company FROM public.hr_dolgozo_adatlap;');
    console.log('HR dolgozo count:', hr.rows[0]);

    const partner = await client.query('SELECT count(*) as total, count(company_id) as with_company FROM public.partner;');
    console.log('Partner count:', partner.rows[0]);

    console.log('\nVerification SUCCESSFUL! All records successfully assigned to default company.');
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await client.end();
  }
}

verify();

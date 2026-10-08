import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: "postgresql://postgres.pdthccijqnhphjbtrtwo:Nincsapellata1%27@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Connected to PostgreSQL");
  
  await client.query(`
    ALTER TABLE public.companies 
    ADD COLUMN IF NOT EXISTS share_token_created_at timestamptz DEFAULT now();
  `);
  console.log("Column share_token_created_at ensured on companies table!");

  // Frissítsük a join_company_by_token RPC-t hogy kisbetű/nagybetű független legyen és ellenőrizze az érvényességet
  await client.query(`
    CREATE OR REPLACE FUNCTION public.join_company_by_token(p_share_token text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_company_id uuid;
      v_company_name text;
      v_token_created timestamptz;
      v_user_id uuid;
      v_existing_role text;
    BEGIN
      v_user_id := auth.uid();
      IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Nincs aktív bejelentkezett munkamenet.');
      END IF;

      SELECT id, name, share_token_created_at 
      INTO v_company_id, v_company_name, v_token_created
      FROM public.companies
      WHERE upper(trim(share_token)) = upper(trim(p_share_token));

      IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Érvénytelen vagy nem létező meghívókód.');
      END IF;

      -- Ellenőrizzük a token érvényességét (pl. 24 óra vagy 10 perc)
      IF v_token_created IS NOT NULL AND (now() - v_token_created) > interval '24 hours' THEN
        RETURN json_build_object('success', false, 'error', 'A meghívókód sajnos lejárt. Kérj új kódot a cég tulajdonosától.');
      END IF;

      -- Ellenőrizzük, hogy tag-e már
      SELECT role INTO v_existing_role
      FROM public.company_members
      WHERE company_id = v_company_id AND user_id = v_user_id;

      IF v_existing_role IS NOT NULL THEN
        RETURN json_build_object(
          'success', true, 
          'company_id', v_company_id, 
          'company_name', v_company_name,
          'already_member', true
        );
      END IF;

      -- Hozzáadás a members-hez tagként
      INSERT INTO public.company_members (company_id, user_id, role)
      VALUES (v_company_id, v_user_id, 'member')
      ON CONFLICT (user_id, company_id) DO NOTHING;

      RETURN json_build_object(
        'success', true, 
        'company_id', v_company_id, 
        'company_name', v_company_name,
        'already_member', false
      );
    END;
    $$;
  `);
  console.log("join_company_by_token function updated with case-insensitivity and 24h validity!");

  await client.end();
}

migrate().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});

import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("Applying migration: 20261014000002_add_companies_delete_policy.sql...");
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' 
          AND policyname = 'Owners can delete companies'
      ) THEN
        CREATE POLICY "Owners can delete companies"
        ON public.companies
        FOR DELETE
        USING (
          owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = companies.id
              AND cm.user_id = auth.uid()
              AND cm.role = 'owner'
          )
        );
      END IF;
    END $$;
  `);

  console.log("Migration applied successfully!");
  await client.end();
}

main().catch(console.error);

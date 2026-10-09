import { Client } from "pg"
import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

dotenv.config({ path: ".env.local" })

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await c.connect()
  console.log("Connected to PostgreSQL DB.")

  const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20261009000003_create_company_filing_rules.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  console.log("Running migration 20261009000003_create_company_filing_rules.sql...")
  await c.query(sql)
  console.log("Migration executed successfully!")

  // Seed sample filing rule
  const thinkAiId = "e5bfda61-81f9-475a-9bd9-ccee7bc8aba8"
  
  // Find an IT department or similar
  const deptRes = await c.query("SELECT id, nev FROM public.szervezeti_egyseg LIMIT 2")
  const planRes = await c.query("SELECT id, tetelszam, megnevezes FROM public.irattari_terv LIMIT 2")

  const sampleDeptId = deptRes.rows[0]?.id || null
  const samplePlanId = planRes.rows[0]?.id || null

  await c.query(
    `INSERT INTO public.company_filing_rules 
     (company_id, rule_name, search_pattern, partner_name, target_department_id, target_irattari_tetel_id, target_document_type, target_subject_prefix, scope, is_active)
     VALUES 
     ($1, $2, $3, $4, $5, $6, $7, $8, 'company', true)
     ON CONFLICT DO NOTHING`,
    [
      thinkAiId,
      "Telekom számlák és előfizetések",
      "Telekom",
      "Magyar Telekom Nyrt.",
      sampleDeptId,
      samplePlanId,
      "szamla",
      "[Távközlés]",
    ]
  )

  const res = await c.query("SELECT id, rule_name, partner_name, target_subject_prefix, is_active FROM public.company_filing_rules")
  console.log("Current filing rules in DB:", res.rows)

  await c.end()
}

main().catch((e) => {
  console.error("Migration error:", e)
  process.exit(1)
})

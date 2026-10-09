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

  const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20261009000004_create_hr_shift_planning.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  console.log("Running migration 20261009000004_create_hr_shift_planning.sql...")
  await c.query(sql)
  console.log("Migration executed successfully!")

  const templates = await c.query("SELECT id, company_id, kod, megnevezes, kezdes_ido, befejezes_ido, munkaora, szin_kod FROM public.hr_muszak_sablon")
  console.log(`Shift templates created (${templates.rowCount} rows):`, templates.rows)

  await c.end()
}

main().catch((e) => {
  console.error("Migration error:", e)
  process.exit(1)
})

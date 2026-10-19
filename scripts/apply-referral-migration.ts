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

  const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20261019000001_create_hr_dolgozoi_ajanlas.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  console.log("Running migration 20261019000001_create_hr_dolgozoi_ajanlas.sql...")
  await c.query(sql)
  console.log("Migration executed successfully!")

  const res1 = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'referral_bonus_amount'")
  console.log("Verified column in companies:", res1.rows)

  const res2 = await c.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'hr_dolgozoi_ajanlas'")
  console.log("Verified table hr_dolgozoi_ajanlas:", res2.rows)

  await c.end()
}

main().catch((e) => {
  console.error("Migration error:", e)
  process.exit(1)
})

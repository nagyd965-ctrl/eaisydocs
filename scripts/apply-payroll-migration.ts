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

  const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20261010000003_add_hr_berpapir.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  console.log("Running migration 20261010000003_add_hr_berpapir.sql...")
  await c.query(sql)
  console.log("Migration executed successfully!")

  const res = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_berpapir' ORDER BY ordinal_position")
  console.log(`Verified table hr_berpapir with ${res.rows.length} columns:`, res.rows.map(r => r.column_name))

  await c.end()
}

main().catch((e) => {
  console.error("Migration error:", e)
  process.exit(1)
})

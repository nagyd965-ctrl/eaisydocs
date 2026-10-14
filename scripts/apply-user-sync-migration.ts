import { Client } from "pg"
import fs from "fs"
import path from "path"

async function run() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error("Missing DATABASE_URL")
    process.exit(1)
  }
  const pgClient = new Client({ connectionString: dbUrl })
  await pgClient.connect()

  const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20261014000003_add_eaisybill_user_sync_columns.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  console.log("Applying migration...")
  await pgClient.query(sql)
  console.log("Migration applied successfully!")

  const { rows } = await pgClient.query("SELECT id, nev, email, sync_source FROM felhasznalo_profil LIMIT 5")
  console.log("Sample profiles after backfill:", rows)

  await pgClient.end()
}

run()

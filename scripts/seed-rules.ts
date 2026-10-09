import { Client } from "pg"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await c.connect()
  const thinkAiId = "e5bfda61-81f9-475a-9bd9-ccee7bc8aba8"

  await c.query(
    `INSERT INTO public.company_prompt_rules (company_id, rule_name, rule_prompt, category, is_active)
     VALUES 
     ($1, $2, $3, $4, true),
     ($1, $5, $6, $7, true)
     ON CONFLICT DO NOTHING`,
    [
      thinkAiId,
      "Szoftver licenc előfizetések",
      "Minden 'szoftver', 'licenc', 'előfizetés' nevű vagy technológiai partnerhez (pl. Adobe, Slack, Zoom, Google Workspace, GitHub, Microsoft) tartozó bejövő számlát az IT szervezeti egységhez és a Szoftverlicencek irattári tételhez rendeld. A tárgy elé írd: '[SaaS]'.",
      "szamla",
      "MOL és OMV üzemanyag beszerzés",
      "Minden üzemanyag vagy gázolaj beszerzést (pl. MOL, OMV, Shell) a Gépjármű üzemeltetés és üzemanyag költség irattári tételhez sorolj be, és a tárgyban tüntesd fel az '[Üzemanyag]' jelölést.",
      "szamla",
    ]
  )

  const res = await c.query("SELECT company_id, rule_name, is_active FROM public.company_prompt_rules")
  console.log("Current rules in DB:", res.rows)
  await c.end()
}

main().catch((e) => {
  console.error("Seeding error:", e)
  process.exit(1)
})

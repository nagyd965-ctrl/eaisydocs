import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log("Seeding HR demo data...")

  // 1. hr_toborzas (Recruitment pipeline)
  console.log("Seeding toborzas...")
  await supabaseAdmin.from("hr_toborzas").insert([
    { nev: "Kovács István", email: "kovacs@example.com", statusz: "uj" },
    { nev: "Németh Anna", email: "anna@example.com", statusz: "uj" },
    { nev: "Szabó Gábor", email: "gabor@example.com", statusz: "interju" },
    { nev: "Tóth Júlia", email: "julia@example.com", statusz: "interju" },
    { nev: "Kiss Péter", email: "peter@example.com", statusz: "ajanlat" },
  ])

  // 2. hr_onboarding
  console.log("Seeding onboarding...")
  // We need to fetch an existing user to attach onboarding to, but we can just use the admin or any user in felhasznalo_profil.
  const { data: users } = await supabaseAdmin.from("felhasznalo_profil").select("id").limit(2)
  if (users && users.length > 0) {
    await supabaseAdmin.from("hr_onboarding").insert([
      { dolgozo_id: users[0].id, statusz: "elokeszites" },
      { dolgozo_id: users[users.length - 1].id, statusz: "folyamatban" }
    ])

    // 3. hr_tavollet (Leaves) - set for today so "Mai hiányzók" shows up
    console.log("Seeding tavollet...")
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    await supabaseAdmin.from("hr_tavollet").insert([
      { dolgozo_id: users[0].id, kezdet_datuma: today, veg_datuma: today, tipus: "betegszabadsag", statusz: "jovahagyva" },
      { dolgozo_id: users[users.length - 1].id, kezdet_datuma: "2026-07-20", veg_datuma: "2026-08-01", tipus: "szabadsag", statusz: "jovahagyasra_var" }
    ])
  }

  console.log("Seeding finished successfully.")
}

main().catch(console.error)

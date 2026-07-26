import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from("hr_beosztas")
    .select(`
      id,
      jogviszony_id,
      munkakor_id,
      hr_jogviszony (
        id,
        belepes_datuma,
        dolgozo_id,
        hr_dolgozo_adatlap (
          id,
          felhasznalo_profil (nev)
        )
      )
    `)
    .limit(5)

  console.log("Error:", error)
  console.dir(data, { depth: null })
}

test()

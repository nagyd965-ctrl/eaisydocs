import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data: adatlap } = await supabase.from("hr_dolgozo_adatlap").select("*")
  console.log("Dolgozó adatlap count:", adatlap?.length)
  
  if (adatlap?.length) {
     console.log("Sample adatlap belepes_datuma:", adatlap[0].belepes_datuma, adatlap[0].munkaviszony_vege)
  }

  const { data: tavollet } = await supabase.from("hr_tavollet").select("*")
  console.log("Távollét count:", tavollet?.length)
  
  if (tavollet?.length) {
     console.log("Sample tavollet statusz:", tavollet.map(t => t.statusz))
  }
}

run()

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Hiba: hiányzó env változók")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  const { data: munkakorok } = await supabase.from('hr_munkakor').select('id').limit(1)
  const munkakorId = munkakorok?.[0]?.id || null

  const { error: e1 } = await supabase.from('hr_toborzas').insert([
    { nev: 'Szabó Dávid', email: 'david.szabo@example.com', megpalyazott_munkakor_id: munkakorId, statusz: 'uj' },
    { nev: 'Kovács Rita', email: 'rita.kovacs@example.com', megpalyazott_munkakor_id: munkakorId, statusz: 'uj' },
    { nev: 'Németh Gábor', email: 'gabor.nemeth@example.com', megpalyazott_munkakor_id: munkakorId, statusz: 'eloszurt' },
    { nev: 'Tóth Eszter', email: 'eszter.toth@example.com', megpalyazott_munkakor_id: munkakorId, statusz: 'interju' },
    { nev: 'Varga Bálint', email: 'balint.varga@example.com', megpalyazott_munkakor_id: munkakorId, statusz: 'ajanlat' }
  ])
  if (e1) console.error("Toborzás hiba:", e1)
  else console.log("Toborzás OK")

  const { data: dolgozok } = await supabase.from('hr_dolgozo_adatlap').select('id').limit(2)
  if (dolgozok && dolgozok.length >= 2) {
    const { error: e2 } = await supabase.from('hr_teljesitmeny').insert([
      { dolgozo_id: dolgozok[0].id, ertekeles_datuma: '2026-07-21', ertekelt_idoszak: '2026 H2', pontszam: 80, kpi_statusz: 'kivalo', ertekeles_szovege: 'Új HR rendszer bevezetve' },
      { dolgozo_id: dolgozok[0].id, ertekeles_datuma: '2026-07-21', ertekelt_idoszak: '2026 H2', pontszam: 45, kpi_statusz: 'fejlesztendo', ertekeles_szovege: 'Technikai adósság csökkentve' },
      { dolgozo_id: dolgozok[1].id, ertekeles_datuma: '2026-07-21', ertekelt_idoszak: '2026 H2', pontszam: 10, kpi_statusz: 'nem_megfelelo', ertekeles_szovege: 'Fluktuáció magas' }
    ])
    if (e2) console.error("Teljesítmény hiba:", e2)
    else console.log("Teljesítmény OK")
  }
}

seed()

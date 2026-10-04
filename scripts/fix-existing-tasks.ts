import { Client } from "pg"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function fixExisting() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()

    // 1. Megkeressük az eseménynaplóból az elutasítások indoklását
    const logsRes = await client.query(`
      SELECT uj_ertek, indoklas, tortent, entitas_id
      FROM public.esemeny_naplo
      WHERE indoklas LIKE '%Indoklás:%'
      ORDER BY tortent DESC
    `)

    console.log("Found rejection logs:", logsRes.rows.length)
    for (const log of logsRes.rows) {
      const match = log.indoklas?.match(/Indoklás:\s*(.*)$/)
      if (match) {
        const indoklasText = match[1].trim()
        console.log("Indoklás detected:", indoklasText)

        // Frissítjük az elutasított feladatokat ennél az ügyiratnál
        await client.query(`
          UPDATE public.feladat
          SET indoklas = $1
          WHERE ugyirat_id = $2 AND allapot = 'elutasitott' AND (indoklas IS NULL OR indoklas = '')
        `, [indoklasText, log.entitas_id])
      }
    }

    // 2. Beállítjuk a kategóriát, prioritást és instrukciót a meglévő teszt feladathoz
    await client.query(`
      UPDATE public.feladat
      SET 
        kategoria = 'penzugy',
        prioritas = 'magas',
        leiras = 'Jóváhagyás és kifizetés engedélyezése',
        reszletek = 'Számla alaki és tartalmi jóváhagyása, utalási csomagba helyezése és banki indítás engedélyezése.',
        indoklas = COALESCE(indoklas, 'Téves szignálás / Nem az én hatásköröm')
      WHERE leiras LIKE '%[penzugy%' OR leiras LIKE '%Jóváhagyás és kifizetés%'
    `)

    console.log("Adatok sikeresen szinkronizálva és tisztítva!")
  } finally {
    await client.end()
  }
}

fixExisting()

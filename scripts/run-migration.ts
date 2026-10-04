import { Client } from "pg"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const connectionString = process.env.DATABASE_URL

async function run() {
  if (!connectionString) {
    console.error("Nincs DATABASE_URL a .env.local-ban!")
    process.exit(1)
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log("Sikeresen kapcsolódva az adatbázishoz.")

    // 1. Enum kiegészítése ha szükséges
    await client.query(`
      DO $$
      BEGIN
          ALTER TYPE public.feladat_allapot ADD VALUE IF NOT EXISTS 'varakozik';
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `)
    console.log("feladat_allapot enum ellenőrizve.")

    // 2. Oszlopok hozzáadása a feladat táblához
    await client.query(`
      ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS kategoria TEXT;
      ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS prioritas TEXT DEFAULT 'normal';
      ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS indoklas TEXT;
      ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS reszletek TEXT;

      CREATE INDEX IF NOT EXISTS idx_feladat_kategoria ON public.feladat(kategoria);
      CREATE INDEX IF NOT EXISTS idx_feladat_prioritas ON public.feladat(prioritas);
    `)
    console.log("Oszlopok sikeresen hozzáadva a feladat táblához!")

    // 3. Rendszerbeállítások ellenőrzése
    await client.query(`
      INSERT INTO public.rendszer_beallitas (kulcs, ertek, leiras)
      VALUES (
          'feladat_sablonok',
          '[]'::jsonb,
          'Egyéni és vállalati feladatsablonok a feladatkatalógushoz.'
      )
      ON CONFLICT (kulcs) DO NOTHING;
    `)
    console.log("Rendszerbeállítás biztosítva.")

    console.log("Minden adatbázis migráció SIKERESEN LEFUTOTT!")
  } catch (err) {
    console.error("Migrációs hiba:", err)
  } finally {
    await client.end()
  }
}

run()

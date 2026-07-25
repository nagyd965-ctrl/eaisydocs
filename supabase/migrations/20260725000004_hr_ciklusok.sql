-- Ciklus státuszok
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_ciklus_statusz') THEN
        CREATE TYPE hr_ciklus_statusz AS ENUM ('tervezes', 'nyitott', 'ertekeles', 'lezart');
    END IF;
END
$$;

-- Értékelési Ciklusok Tábla
CREATE TABLE IF NOT EXISTS hr_teljesitmeny_ciklus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    megnevezes TEXT NOT NULL,
    kezdo_datum DATE NOT NULL,
    befejezo_datum DATE NOT NULL,
    statusz hr_ciklus_statusz DEFAULT 'tervezes',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hr_teljesitmeny tábla bővítése a ciklus azonosítóval
ALTER TABLE hr_teljesitmeny
ADD COLUMN IF NOT EXISTS ciklus_id UUID REFERENCES hr_teljesitmeny_ciklus(id) ON DELETE RESTRICT;

-- RLS beállítása
ALTER TABLE hr_teljesitmeny_ciklus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mindenki latja a ciklusokat akinek van HR modulja" ON hr_teljesitmeny_ciklus
FOR SELECT TO authenticated 
USING ( (SELECT elerheto_modulok FROM felhasznalo_profil WHERE id = auth.uid()) @> '{hr}'::text[] );

CREATE POLICY "HR adminok es vezetok modolithatjak a ciklusokat" ON hr_teljesitmeny_ciklus
FOR ALL TO authenticated 
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'hr_munkatars', 'admin') );

-- Alapértelmezett nyitott ciklus beszúrása a kompatibilitás miatt
INSERT INTO hr_teljesitmeny_ciklus (megnevezes, kezdo_datum, befejezo_datum, statusz) 
VALUES ('2026. H2 - Éves Értékelés', '2026-07-01', '2026-12-31', 'nyitott')
ON CONFLICT DO NOTHING;

-- Régi KPI rekordok frissítése az új alapértelmezett ciklusra, hogy ne árválkodjanak
UPDATE hr_teljesitmeny 
SET ciklus_id = (SELECT id FROM hr_teljesitmeny_ciklus ORDER BY created_at ASC LIMIT 1) 
WHERE ciklus_id IS NULL;

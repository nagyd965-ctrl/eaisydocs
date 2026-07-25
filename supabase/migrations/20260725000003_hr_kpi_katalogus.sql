-- KPI Mérőszám típusok
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_meroszam_tipus') THEN
        CREATE TYPE kpi_meroszam_tipus AS ENUM ('szam', 'szazalek', 'osszeg', 'igen_nem', 'skala');
    END IF;
END
$$;

-- KPI Katalógus (Sablonok)
CREATE TABLE IF NOT EXISTS hr_kpi_katalogus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    megnevezes TEXT NOT NULL,
    leiras TEXT,
    meroszam_tipusa kpi_meroszam_tipus DEFAULT 'szazalek',
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- hr_teljesitmeny bővítése az új mérőszámokkal
ALTER TABLE hr_teljesitmeny
ADD COLUMN IF NOT EXISTS kpi_katalogus_id UUID REFERENCES hr_kpi_katalogus(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meroszam_tipusa kpi_meroszam_tipus DEFAULT 'szazalek',
ADD COLUMN IF NOT EXISTS cel_ertek NUMERIC,
ADD COLUMN IF NOT EXISTS aktualis_ertek NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sulyozas NUMERIC DEFAULT 1.0;

-- RLS a katalógusra
ALTER TABLE hr_kpi_katalogus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mindenki latja a KPI katalogust akinek van HR modulja" ON hr_kpi_katalogus 
FOR SELECT TO authenticated 
USING ( (SELECT elerheto_modulok FROM felhasznalo_profil WHERE id = auth.uid()) @> '{hr}'::text[] );

CREATE POLICY "HR adminok es vezetok modolithatjak a KPI katalogust" ON hr_kpi_katalogus 
FOR ALL TO authenticated 
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'hr_munkatars', 'vezeto', 'admin') );

-- Néhány alapértelmezett KPI sablon beszúrása
INSERT INTO hr_kpi_katalogus (megnevezes, leiras, meroszam_tipusa) VALUES
('Éves árbevétel elvárás (Céges)', 'A vállalat éves árbevételi céljához való egyéni hozzájárulás.', 'osszeg'),
('Ügyfél-elégedettségi index (CSAT)', 'Átlagos ügyfél-elégedettség a saját projekteken.', 'skala'),
('Sikeres projektátadások aránya', 'Határidőre és büdzsén belül átadott projektek százaléka.', 'szazalek'),
('Kötelező éves tréning elvégzése', 'Vállalati adatvédelmi és IT biztonsági oktatás elvégzése.', 'igen_nem'),
('Új ügyfelek akvirálása', 'Hozott új szerződések száma az évben.', 'szam')
ON CONFLICT DO NOTHING;

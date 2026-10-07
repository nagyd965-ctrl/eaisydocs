-- 20261007000002_hr_jelenlet_korrekcio.sql
-- Jelenléti korrekciós kérelmek tábla és jogosultságok

CREATE TABLE IF NOT EXISTS hr_jelenlet_korrekcio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    datum DATE NOT NULL,
    eredeti_becsekkolas TIMESTAMPTZ,
    eredeti_kicsekkolas TIMESTAMPTZ,
    uj_becsekkolas TIMESTAMPTZ NOT NULL,
    uj_kicsekkolas TIMESTAMPTZ NOT NULL,
    indoklas TEXT NOT NULL,
    statusz TEXT NOT NULL DEFAULT 'jovahagyasra_var' CHECK (statusz IN ('jovahagyasra_var', 'jovahagyva', 'elutasitva')),
    jovahagyo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
    jovahagyva_ekkor TIMESTAMPTZ,
    elutasitas_oka TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_jelenlet_korrekcio_dolgozo ON hr_jelenlet_korrekcio(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_jelenlet_korrekcio_statusz ON hr_jelenlet_korrekcio(statusz);
CREATE INDEX IF NOT EXISTS idx_hr_jelenlet_korrekcio_datum ON hr_jelenlet_korrekcio(datum);

ALTER TABLE hr_jelenlet_korrekcio ENABLE ROW LEVEL SECURITY;

-- 1. Lekérdezési szabály: Dolgozó sajátját látja; Vezető a beosztottét; HR/Admin mindet
DROP POLICY IF EXISTS "Dolgozo latja sajat jelenlet korrekcioit" ON hr_jelenlet_korrekcio;
CREATE POLICY "Dolgozo latja sajat jelenlet korrekcioit" ON hr_jelenlet_korrekcio
FOR SELECT TO authenticated
USING (
    dolgozo_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM felhasznalo_profil p
        WHERE p.id = auth.uid() AND (p.hr_szerepkor IN ('hr_vezeto', 'admin') OR p.id = hr_jelenlet_korrekcio.jovahagyo_id)
    ) OR
    EXISTS (
        SELECT 1 FROM felhasznalo_profil beosztott
        WHERE beosztott.id = hr_jelenlet_korrekcio.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
    )
);

-- 2. Beszúrási szabály: Bármely bejelentkezett dolgozó rögzíthet saját magának kérelmet
DROP POLICY IF EXISTS "Dolgozo benyujthat jelenlet korrekciot" ON hr_jelenlet_korrekcio;
CREATE POLICY "Dolgozo benyujthat jelenlet korrekciot" ON hr_jelenlet_korrekcio
FOR INSERT TO authenticated
WITH CHECK (dolgozo_id = auth.uid());

-- 3. Módosítási szabály: Kizárólag a vezető vagy HR/Admin bírálhatja el
DROP POLICY IF EXISTS "Vezeto vagy HR modolithatja jelenlet korrekciot" ON hr_jelenlet_korrekcio;
CREATE POLICY "Vezeto vagy HR modolithatja jelenlet korrekciot" ON hr_jelenlet_korrekcio
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil p
        WHERE p.id = auth.uid() AND (
            p.hr_szerepkor IN ('hr_vezeto', 'admin') OR
            p.id = hr_jelenlet_korrekcio.jovahagyo_id
        )
    ) OR
    EXISTS (
        SELECT 1 FROM felhasznalo_profil beosztott
        WHERE beosztott.id = hr_jelenlet_korrekcio.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
    )
);

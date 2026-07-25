-- 20260725000007_hr_karrieroldal.sql
-- Publikus karrieroldal és álláshirdetések táblája

CREATE TABLE hr_allashirdetes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    munkakor_id UUID REFERENCES hr_munkakor(id) ON DELETE CASCADE,
    cim TEXT NOT NULL,
    rovid_leiras TEXT,
    reszletes_leiras TEXT,
    publikus BOOLEAN DEFAULT false,
    aktiv BOOLEAN DEFAULT true,
    nyitva_tol TIMESTAMPTZ DEFAULT NOW(),
    nyitva_ig TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_allashirdetes ENABLE ROW LEVEL SECURITY;

-- HR-esek mindent láthatnak és szerkeszthetnek
CREATE POLICY "HR latja és szerkesztheti az allashirdeteseket" ON hr_allashirdetes 
FOR ALL TO authenticated 
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin') );

-- Publikus hozzáférés az aktív és publikus hirdetésekhez (anon és hitelesített felhasználók is láthatják)
CREATE POLICY "Mindenki latja a publikus hirdeteseket" ON hr_allashirdetes 
FOR SELECT TO anon, authenticated
USING ( publikus = true AND aktiv = true );

-- A jelentkezések összekötése az álláshirdetéssel
ALTER TABLE hr_toborzas ADD COLUMN allashirdetes_id UUID REFERENCES hr_allashirdetes(id) ON DELETE SET NULL;

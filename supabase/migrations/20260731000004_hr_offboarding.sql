-- HR Offboarding Táblák

CREATE TABLE hr_offboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    kilepes_datuma TEXT,
    statusz TEXT DEFAULT 'folyamatban', -- folyamatban, lezart
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_offboarding_feladat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offboarding_id UUID REFERENCES hr_offboarding(id) ON DELETE CASCADE,
    cim TEXT NOT NULL,
    felelos_reszleg TEXT NOT NULL, -- HR, IT, Bérszámfejtés, EHS
    statusz TEXT DEFAULT 'pending', -- pending, done
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS beállítása
ALTER TABLE hr_offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_offboarding_feladat ENABLE ROW LEVEL SECURITY;

-- Minden bejelentkezett felhasználó olvashatja és módosíthatja az offboardingot 
CREATE POLICY "Offboarding olvasás" ON hr_offboarding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Offboarding írás" ON hr_offboarding FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Offboarding feladat olvasás" ON hr_offboarding_feladat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Offboarding feladat írás" ON hr_offboarding_feladat FOR ALL TO authenticated USING (true) WITH CHECK (true);

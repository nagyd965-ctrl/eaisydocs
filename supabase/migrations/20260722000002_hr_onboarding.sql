-- HR Onboarding Táblák

CREATE TABLE hr_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toborzas_id UUID REFERENCES hr_toborzas(id) ON DELETE CASCADE,
    nev TEXT NOT NULL,
    munkakor TEXT,
    belepes_datuma TEXT,
    statusz TEXT DEFAULT 'folyamatban', -- folyamatban, lezart
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_onboarding_feladat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID REFERENCES hr_onboarding(id) ON DELETE CASCADE,
    cim TEXT NOT NULL,
    felelos_reszleg TEXT NOT NULL, -- HR, IT, Bérszámfejtés, EHS
    statusz TEXT DEFAULT 'pending', -- pending, done
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS beállítása
ALTER TABLE hr_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_onboarding_feladat ENABLE ROW LEVEL SECURITY;

-- Minden bejelentkezett felhasználó olvashatja és módosíthatja az onboardingot 
-- (a valóságban ezt szerepkörhöz kéne kötni, de az egyszerűség kedvéért a hr/admin szűrést az UI/Server Action végzi)
CREATE POLICY "Onboarding olvasás" ON hr_onboarding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Onboarding írás" ON hr_onboarding FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Onboarding feladat olvasás" ON hr_onboarding_feladat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Onboarding feladat írás" ON hr_onboarding_feladat FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tesztadat beszúrása (hogy ne legyen üres az oldal)
INSERT INTO hr_onboarding (nev, munkakor, belepes_datuma, statusz) 
VALUES ('Varga Bálint', 'UX Designer', '2026-08-01', 'folyamatban');

INSERT INTO hr_onboarding_feladat (onboarding_id, cim, felelos_reszleg, statusz)
SELECT id, 'Munkaszerződés aláírása', 'HR', 'done' FROM hr_onboarding WHERE nev = 'Varga Bálint';

INSERT INTO hr_onboarding_feladat (onboarding_id, cim, felelos_reszleg, statusz)
SELECT id, 'T1041 NAV bejelentés', 'Bérszámfejtés', 'pending' FROM hr_onboarding WHERE nev = 'Varga Bálint';

INSERT INTO hr_onboarding_feladat (onboarding_id, cim, felelos_reszleg, statusz)
SELECT id, 'Eszközigénylés (Laptop, Telefon)', 'IT', 'pending' FROM hr_onboarding WHERE nev = 'Varga Bálint';

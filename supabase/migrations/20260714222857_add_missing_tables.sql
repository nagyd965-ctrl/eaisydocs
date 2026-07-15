-- Enums for new tables
CREATE TYPE feladat_allapot AS ENUM ('nyitott', 'folyamatban', 'kesz', 'elutasitott');
CREATE TYPE ertesites_csatorna AS ENUM ('email', 'sms');
CREATE TYPE ertesites_trigger_tipus AS ENUM ('hatarido_kozeledik', 'hatarido_lejart', 'uj_szignalas', 'uj_erkeztetes', 'allapotvaltozas', 'megorzesi_ido_lejart');

-- Feladat table
CREATE TABLE feladat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ugyirat_id UUID REFERENCES ugyirat(id) ON DELETE CASCADE,
    felelos_user_id UUID NOT NULL,
    leiras TEXT NOT NULL,
    hatarido TIMESTAMPTZ NOT NULL,
    allapot feladat_allapot DEFAULT 'nyitott',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE feladat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on feladat" ON feladat FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ertesites szabaly table
CREATE TABLE ertesites_szabaly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_tipus ertesites_trigger_tipus NOT NULL,
    csatorna ertesites_csatorna NOT NULL,
    sablon_szoveg TEXT NOT NULL,
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ertesites_szabaly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on ertesites_szabaly" ON ertesites_szabaly FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ertesites naplo table
CREATE TABLE ertesites_naplo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    szabaly_id UUID REFERENCES ertesites_szabaly(id) ON DELETE SET NULL,
    mikor TIMESTAMPTZ DEFAULT NOW(),
    kinek TEXT NOT NULL, -- Email address or Phone number
    csatorna ertesites_csatorna NOT NULL,
    szoveg TEXT NOT NULL,
    sikeres BOOLEAN DEFAULT false,
    hiba_uzenet TEXT
);
ALTER TABLE ertesites_naplo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ertesites naplo is insert only for authenticated" ON ertesites_naplo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Ertesites naplo is readable for authenticated" ON ertesites_naplo FOR SELECT TO authenticated USING (true);

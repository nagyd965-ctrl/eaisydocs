-- Migration: hr_munkahelyi_eszkoz (Workplace Assets and Inventory Liability)
-- Tracks physical and IT assets handed over to employees / onboarding candidates

CREATE TABLE IF NOT EXISTS hr_munkahelyi_eszkoz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    onboarding_id UUID REFERENCES hr_onboarding(id) ON DELETE SET NULL,
    eszkoz_kategoria TEXT NOT NULL DEFAULT 'it', -- it, telekom, iroda, jarmu, egyeb
    megnevezes TEXT NOT NULL, -- pl. Lenovo ThinkPad T14 Gen 4
    gyari_szam TEXT, -- Sorozatszám / IMEI / Rendszám
    tartozekok TEXT, -- pl. 65W USB-C töltő, táska, vezeték nélküli egér
    allapot TEXT DEFAULT 'uj', -- uj, ujszeru, hasznalt, serult
    atadas_datuma DATE NOT NULL DEFAULT CURRENT_DATE,
    visszavetel_datuma DATE,
    statusz TEXT DEFAULT 'kiadva', -- kiadva, visszaveve, selejtezve
    megjegyzes TEXT,
    dokumentum_id UUID REFERENCES hr_dokumentum(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_hr_eszkoz_dolgozo ON hr_munkahelyi_eszkoz(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_eszkoz_onboarding ON hr_munkahelyi_eszkoz(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_hr_eszkoz_statusz ON hr_munkahelyi_eszkoz(statusz);

-- RLS
ALTER TABLE hr_munkahelyi_eszkoz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR modul eszkoz olvasas"
    ON hr_munkahelyi_eszkoz
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "HR modul eszkoz iras"
    ON hr_munkahelyi_eszkoz
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

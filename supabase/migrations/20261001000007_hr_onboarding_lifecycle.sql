-- Migration: hr_onboarding lifecycle and account activation
-- Adds dolgozo_id, fiok_allapot, fiok_aktivalva_ekor, lezarva_ekor, lezarta_id, reszleg

ALTER TABLE hr_onboarding
ADD COLUMN IF NOT EXISTS dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fiok_allapot TEXT DEFAULT 'varakozik',
ADD COLUMN IF NOT EXISTS fiok_aktivalva_ekor TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lezarva_ekor TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lezarta_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reszleg TEXT;

-- Indexek a hatékony szűréshez és kapcsolathoz
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_dolgozo_id ON hr_onboarding(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_toborzas_id ON hr_onboarding(toborzas_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_statusz ON hr_onboarding(statusz);

-- Felhasználói jóváhagyás alapján az összes meglévő hibás/duplikált tesztadat törlése
-- A hozzájuk tartozó hr_onboarding_feladat sorok a foreign key ON DELETE CASCADE miatt automatikusan törlődnek
DELETE FROM hr_onboarding;

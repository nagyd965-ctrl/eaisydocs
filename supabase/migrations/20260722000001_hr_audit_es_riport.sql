-- HR Különálló Eseménynapló (Audit Log)
-- Biztosítja, hogy az eaisyDocs iratkezelő naplójával nem keveredik össze.
-- Append-only (csak hozzáadható), szigorú RLS védelemmel.

CREATE TABLE hr_esemeny_naplo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    felhasznalo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL, -- Ki csinálta
    esemeny_tipus TEXT NOT NULL, -- pl. 'kpi_hozzaadas', 'munkatars_felvetel', 'tavollet_jovahagyas', 'adat_megtekintes'
    entitas_tipus TEXT NOT NULL, -- pl. 'hr_teljesitmeny', 'hr_dolgozo_adatlap'
    entitas_id UUID, -- Melyik azonosítójú rekordon történt
    regi_adat JSONB, -- Mi volt előtte (UPDATE/DELETE esetén hasznos)
    uj_adat JSONB, -- Mi lett belőle (INSERT/UPDATE esetén hasznos)
    ip_cim TEXT,
    bongeszo_info TEXT,
    megjegyzes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) bekapcsolása
ALTER TABLE hr_esemeny_naplo ENABLE ROW LEVEL SECURITY;

-- 1. INSERT (Új naplóbejegyzés létrehozása) BÁRKINEK megengedett, aki be van jelentkezve
-- Mivel az audit trigger vagy edge function hozhatja létre, vagy a szerver actions, 
-- a hitelesített felhasználók tudnak írni bele.
CREATE POLICY "Eseménynapló rögzítés"
    ON hr_esemeny_naplo
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 2. SELECT (Olvasás) csak HR Munkatársaknak, HR Vezetőknek és Adminoknak
CREATE POLICY "Eseménynapló olvasás HR és Admin számára"
    ON hr_esemeny_naplo
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM felhasznalo_profil 
            WHERE felhasznalo_profil.id = auth.uid() 
            AND szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
        )
    );

-- Fontos: Nincs UPDATE és nincs DELETE policy! (Append-only védelem)

-- 3. Hozzáadunk pár teszt bejegyzést a demonstrációhoz
INSERT INTO hr_esemeny_naplo (felhasznalo_id, esemeny_tipus, entitas_tipus, megjegyzes)
SELECT id, 'rendszer_inditas', 'system', 'Az eaisyHR Audit Napló inicializálva'
FROM felhasznalo_profil
WHERE szerepkor = 'admin' LIMIT 1;

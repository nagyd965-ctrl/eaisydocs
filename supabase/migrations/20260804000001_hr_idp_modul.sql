-- hr_idp_statusz és hr_idp_cel_tipus enumok
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_idp_statusz') THEN
        CREATE TYPE hr_idp_statusz AS ENUM ('nyitott', 'folyamatban', 'jovahagyasra_var', 'teljesitve', 'elmaradt');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_idp_cel_tipus') THEN
        CREATE TYPE hr_idp_cel_tipus AS ENUM ('kompetencia', 'kepzes', 'nyelv', 'egyeb');
    END IF;
END
$$;

-- hr_fejlesztesi_terv (IDP Fejléc)
CREATE TABLE hr_fejlesztesi_terv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    ciklus_id UUID REFERENCES hr_teljesitmeny_ciklus(id) ON DELETE SET NULL,
    megnevezes TEXT NOT NULL,
    statusz hr_idp_statusz DEFAULT 'nyitott',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hr_fejlesztesi_cel (IDP Tételek)
CREATE TABLE hr_fejlesztesi_cel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terv_id UUID NOT NULL REFERENCES hr_fejlesztesi_terv(id) ON DELETE CASCADE,
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    tipus hr_idp_cel_tipus NOT NULL,
    megnevezes TEXT NOT NULL,
    leiras TEXT,
    hatarido DATE,
    statusz hr_idp_statusz DEFAULT 'nyitott',
    tanulmanyi_szerzodes_id UUID REFERENCES hr_tanulmanyi_szerzodes(id) ON DELETE SET NULL,
    eredmeny_kepzettseg_id UUID REFERENCES hr_kepzettseg(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Bekapcsolása
ALTER TABLE hr_fejlesztesi_terv ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_fejlesztesi_cel ENABLE ROW LEVEL SECURITY;

-- 1. Dolgozói policy-k (Saját adataikat olvashatják és a célokat módosíthatják státusz szinten)
CREATE POLICY "Dolgozok latjak a sajat tervuket" ON hr_fejlesztesi_terv
FOR SELECT TO authenticated USING ( dolgozo_id = auth.uid() );

CREATE POLICY "Dolgozok latjak a sajat celjaikat" ON hr_fejlesztesi_cel
FOR SELECT TO authenticated USING ( dolgozo_id = auth.uid() );

CREATE POLICY "Dolgozok modosithatjak a sajat celjaikat" ON hr_fejlesztesi_cel
FOR UPDATE TO authenticated USING ( dolgozo_id = auth.uid() );

-- 2. Vezetői policy-k (Általános hozzáférés, HR és vezetők számára)
CREATE POLICY "Vezetok kezelik a beosztott terveket" ON hr_fejlesztesi_terv
FOR ALL TO authenticated
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'hr_munkatars', 'admin', 'vezeto') );

CREATE POLICY "Vezetok kezelik a beosztott celokat" ON hr_fejlesztesi_cel
FOR ALL TO authenticated
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'hr_munkatars', 'admin', 'vezeto') );

-- 3. HR Munkatárs / Vezető policy-k (Teljes hozzáférés, ha van HR szerepkör)
CREATE POLICY "HR modul latja a terveket" ON hr_fejlesztesi_terv
FOR ALL TO authenticated 
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'hr_munkatars', 'admin') );

CREATE POLICY "HR modul latja a celokat" ON hr_fejlesztesi_cel
FOR ALL TO authenticated 
USING ( (SELECT hr_szerepkor FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'hr_munkatars', 'admin') );

-- Eseménynapló trigger hr_fejlesztesi_terv
CREATE TRIGGER esemeny_naplo_hr_fejlesztesi_terv_insert
    AFTER INSERT ON hr_fejlesztesi_terv
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER esemeny_naplo_hr_fejlesztesi_terv_update
    AFTER UPDATE ON hr_fejlesztesi_terv
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER esemeny_naplo_hr_fejlesztesi_terv_delete
    AFTER DELETE ON hr_fejlesztesi_terv
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();

-- Eseménynapló trigger hr_fejlesztesi_cel
CREATE TRIGGER esemeny_naplo_hr_fejlesztesi_cel_insert
    AFTER INSERT ON hr_fejlesztesi_cel
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER esemeny_naplo_hr_fejlesztesi_cel_update
    AFTER UPDATE ON hr_fejlesztesi_cel
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER esemeny_naplo_hr_fejlesztesi_cel_delete
    AFTER DELETE ON hr_fejlesztesi_cel
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();

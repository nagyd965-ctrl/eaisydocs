-- 20260721000003_hr_jelenlet_es_dokumentum.sql

-- Jelenlét (Időrögzítés) tábla
CREATE TABLE hr_jelenlet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE RESTRICT,
    datum DATE NOT NULL DEFAULT CURRENT_DATE,
    becsekkolas_ideje TIMESTAMPTZ,
    kicsekkolas_ideje TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dolgozo_id, datum)
);

-- HR Dokumentum tábla (Független az eaisyDocs iratkezelőtől!)
CREATE TABLE hr_dokumentum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE RESTRICT,
    nev TEXT NOT NULL,
    kategoria TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) engedélyezése
ALTER TABLE hr_jelenlet ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_dokumentum ENABLE ROW LEVEL SECURITY;

-- 1. hr_jelenlet Policiák
CREATE POLICY "Dolgozó látja saját jelenlétét" ON hr_jelenlet 
FOR SELECT TO authenticated 
USING (dolgozo_id = auth.uid() OR (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

CREATE POLICY "Dolgozó rögzíthet saját jelenlétet" ON hr_jelenlet 
FOR INSERT TO authenticated 
WITH CHECK (dolgozo_id = auth.uid());

CREATE POLICY "Dolgozó frissítheti saját jelenlétét" ON hr_jelenlet 
FOR UPDATE TO authenticated 
USING (dolgozo_id = auth.uid());

-- 2. hr_dokumentum Policiák
CREATE POLICY "Dolgozó látja saját dokumentumait" ON hr_dokumentum 
FOR SELECT TO authenticated 
USING (dolgozo_id = auth.uid() OR (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

-- A HR Dokumentumokat kizárólag a HR hozhatja létre/módosíthatja! (a dolgozó csak letölti/olvassa)
CREATE POLICY "HR szerkeszti a dokumentumokat" ON hr_dokumentum 
FOR ALL TO authenticated 
USING ((SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

-- Audit Triggerek
CREATE TRIGGER audit_hr_jelenlet
  AFTER INSERT OR UPDATE OR DELETE ON hr_jelenlet
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

CREATE TRIGGER audit_hr_dokumentum
  AFTER INSERT OR UPDATE OR DELETE ON hr_dokumentum
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

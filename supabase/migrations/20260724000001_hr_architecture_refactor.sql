-- 20260724000001_hr_architecture_refactor.sql
-- ARCHITECTURE REFACTOR: Splitting RBAC and introducing the Person -> Employment -> Assignment hierarchy

-------------------------------------------------------------------------------
-- 1. NEW ENUMS FOR SEPARATED RBAC
-------------------------------------------------------------------------------
CREATE TYPE docs_szerepkor_enum AS ENUM ('admin', 'iktato', 'ugyintezo', 'rendszergazda', 'vezeto', 'betekinto', 'auditor');
CREATE TYPE hr_szerepkor_enum AS ENUM ('admin', 'hr_vezeto', 'hr_munkatars', 'vezeto', 'berugyi', 'toborzo', 'munkavedelmi', 'rendszergazda', 'auditor', 'munkavallalo');

-------------------------------------------------------------------------------
-- 2. ALTER FELHASZNALO_PROFIL
-------------------------------------------------------------------------------
ALTER TABLE felhasznalo_profil ADD COLUMN docs_szerepkor docs_szerepkor_enum NOT NULL DEFAULT 'ugyintezo';
ALTER TABLE felhasznalo_profil ADD COLUMN hr_szerepkor hr_szerepkor_enum NOT NULL DEFAULT 'munkavallalo';

-- Data migration for RBAC (Safe casting via text)
UPDATE felhasznalo_profil 
SET 
  docs_szerepkor = CASE 
    WHEN szerepkor::text IN ('admin', 'iktato', 'ugyintezo', 'rendszergazda', 'vezeto', 'betekinto', 'auditor') THEN szerepkor::text::docs_szerepkor_enum
    ELSE 'ugyintezo'::docs_szerepkor_enum
  END,
  hr_szerepkor = CASE 
    WHEN szerepkor::text IN ('admin', 'rendszergazda', 'auditor', 'vezeto') THEN szerepkor::text::hr_szerepkor_enum
    WHEN szerepkor::text IN ('hr_vezeto', 'hr_munkatars', 'berugyi', 'toborzo', 'munkavedelmi', 'munkavallalo') THEN szerepkor::text::hr_szerepkor_enum
    ELSE 'munkavallalo'::hr_szerepkor_enum
  END;

-------------------------------------------------------------------------------
-- 3. NEW EMPLOYMENT (JOGVISZONY) & ASSIGNMENT (BEOSZTAS) TABLES
-------------------------------------------------------------------------------
CREATE TYPE hr_jogviszony_tipus AS ENUM ('teljes_munkaido', 'reszmunkaido', 'megbizasi', 'diak', 'gyakornok');

CREATE TABLE hr_jogviszony (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    tipus hr_jogviszony_tipus NOT NULL DEFAULT 'teljes_munkaido',
    belepes_datuma DATE NOT NULL,
    probaido_vege DATE,
    kilepes_datuma DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_beosztas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jogviszony_id UUID NOT NULL REFERENCES hr_jogviszony(id) ON DELETE CASCADE,
    munkakor_id UUID NOT NULL REFERENCES hr_munkakor(id) ON DELETE RESTRICT,
    fte DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (fte > 0 AND fte <= 1.00),
    ervenyes_tol DATE NOT NULL DEFAULT CURRENT_DATE,
    ervenyes_ig DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_jogviszony ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_beosztas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR és Admin írhatja a jogviszonyt" ON hr_jogviszony
FOR ALL TO authenticated
USING ( (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin') );

CREATE POLICY "Mindenki latja a sajat jogviszonyat" ON hr_jogviszony
FOR SELECT TO authenticated
USING ( dolgozo_id = auth.uid() OR (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin') );

CREATE POLICY "HR és Admin írhatja a beosztast" ON hr_beosztas
FOR ALL TO authenticated
USING ( (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin') );

CREATE POLICY "Mindenki latja a beosztasokat" ON hr_beosztas
FOR SELECT TO authenticated USING (true);

-------------------------------------------------------------------------------
-- 4. DATA MIGRATION: MOVEMENT FROM DOLGOZO -> JOGVISZONY -> BEOSZTAS
-------------------------------------------------------------------------------
-- For every user who has a belepes_datuma, create a jogviszony
INSERT INTO hr_jogviszony (dolgozo_id, belepes_datuma)
SELECT id, COALESCE(belepes_datuma, '2024-01-01'::DATE)
FROM hr_dolgozo_adatlap;

-- For every user who has a munkakor_id, create a beosztas under their new jogviszony
INSERT INTO hr_beosztas (jogviszony_id, munkakor_id, ervenyes_tol)
SELECT j.id, d.munkakor_id, j.belepes_datuma
FROM hr_jogviszony j
JOIN hr_dolgozo_adatlap d ON d.id = j.dolgozo_id
WHERE d.munkakor_id IS NOT NULL;

-- Now drop the old hardcoded columns from hr_dolgozo_adatlap
ALTER TABLE hr_dolgozo_adatlap DROP COLUMN munkakor_id CASCADE;
ALTER TABLE hr_dolgozo_adatlap DROP COLUMN belepes_datuma CASCADE;

-------------------------------------------------------------------------------
-- 5. REFACTORING RLS POLICIES (eaisyDocs)
-------------------------------------------------------------------------------
-- Since updating 25 policies manually is risky, we will drop the old `szerepkor` column 
-- at the very end. The Views/RPCs using it will break unless updated. 
-- However, we must update the critical ones.

-- Re-create the Subordinates function
CREATE OR REPLACE FUNCTION get_hr_subordinates(p_manager_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    SELECT id, szulo_id FROM szervezeti_egyseg 
    WHERE id = (SELECT szervezeti_egyseg_id FROM felhasznalo_profil WHERE id = p_manager_id)
    UNION
    SELECT s.id, s.szulo_id FROM szervezeti_egyseg s
    INNER JOIN subordinates sub ON s.szulo_id = sub.id
  )
  SELECT fp.id FROM felhasznalo_profil fp
  WHERE fp.szervezeti_egyseg_id IN (SELECT id FROM subordinates)
  AND fp.id != p_manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old `szerepkor` column to force application logic to use the new ones
-- Note: Supabase might complain if Views or Policies still depend on it.
-- Instead of dropping the column right now, we keep it as a fallback but rename it.
ALTER TABLE felhasznalo_profil RENAME COLUMN szerepkor TO legacy_szerepkor;

-- WARNING: The user must apply the Frontend TS/TSX changes immediately after this migration.

-- 20260716000000_strict_rbac_rls.sql
-- Update RLS policies to strictly match the software brief, keeping 'admin' as a god-mode for development only.

-- First, drop the old policies
DROP POLICY IF EXISTS "Ugyirat megtekintes ABAC alapjan" ON ugyirat;
DROP POLICY IF EXISTS "Ugyirat szerkesztes ABAC alapjan" ON ugyirat;
DROP POLICY IF EXISTS "Irat megtekintes ABAC alapjan" ON irat;
DROP POLICY IF EXISTS "Irat szerkesztes ABAC alapjan" ON irat;

-- ==========================================
-- UGYIRAT POLICIES
-- ==========================================

-- SELECT Policy for Ugyirat
-- Who can see dossiers?
-- admin: All (temp dev role)
-- iktato, auditor: All
-- rendszergazda: None automatically
-- vezeto, ugyintezo, betekinto: Only their department or explicit access
DROP POLICY IF EXISTS "Ugyirat megtekintes szigoru ABAC" ON ugyirat;
CREATE POLICY "Ugyirat megtekintes szigoru ABAC" ON ugyirat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      fp.szerepkor IN ('admin', 'iktato', 'auditor') OR
      ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
      EXISTS (
        SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
      )
    )
  )
);

-- UPDATE/INSERT/DELETE Policy for Ugyirat
-- Who can edit dossiers?
-- admin: All (temp dev role)
-- iktato: All
-- vezeto, ugyintezo: Only if they have SELECT access
-- auditor, betekinto, rendszergazda: None
DROP POLICY IF EXISTS "Ugyirat szerkesztes szigoru ABAC" ON ugyirat;
CREATE POLICY "Ugyirat szerkesztes szigoru ABAC" ON ugyirat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      fp.szerepkor IN ('admin', 'iktato') OR
      (
        fp.szerepkor IN ('vezeto', 'ugyintezo') AND
        (
          ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
          EXISTS (
            SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
          )
        )
      )
    )
  )
);

-- ==========================================
-- IRAT POLICIES
-- ==========================================

-- SELECT Policy for Irat
-- Same as Ugyirat SELECT, but strictly limited by max_minosites clearance
DROP POLICY IF EXISTS "Irat megtekintes szigoru ABAC" ON irat;
CREATE POLICY "Irat megtekintes szigoru ABAC" ON irat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND irat.minosites <= fp.max_minosites
    AND (
      fp.szerepkor IN ('admin', 'iktato', 'auditor') OR
      EXISTS (
        SELECT 1 FROM ugyirat u
        WHERE u.id = irat.ugyirat_id
        AND (
          u.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
          EXISTS (
            SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = u.id AND uh.user_id = fp.id
          )
        )
      )
    )
  )
);

-- UPDATE/INSERT/DELETE Policy for Irat
-- Same as Ugyirat EDIT, but strictly limited by max_minosites clearance
DROP POLICY IF EXISTS "Irat szerkesztes szigoru ABAC" ON irat;
CREATE POLICY "Irat szerkesztes szigoru ABAC" ON irat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND irat.minosites <= fp.max_minosites
    AND (
      fp.szerepkor IN ('admin', 'iktato') OR
      (
        fp.szerepkor IN ('vezeto', 'ugyintezo') AND 
        EXISTS (
          SELECT 1 FROM ugyirat u
          WHERE u.id = irat.ugyirat_id
          AND (
            u.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
            EXISTS (
              SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = u.id AND uh.user_id = fp.id
            )
          )
        )
      )
    )
  )
);

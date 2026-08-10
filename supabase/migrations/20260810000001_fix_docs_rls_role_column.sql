-- 20260810000001_fix_docs_rls_role_column.sql
-- 1. Ugyirat SELECT Policy
DROP POLICY IF EXISTS "Ugyirat megtekintes szigoru ABAC" ON ugyirat;
CREATE POLICY "Ugyirat megtekintes szigoru ABAC" ON ugyirat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      fp.docs_szerepkor::text IN ('admin', 'iktato', 'auditor') OR
      ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
      EXISTS (
        SELECT 1 FROM ugyirat_hozzaferes uh
        WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
      )
    )
  )
);

-- 2. Ugyirat WRITE Policy (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Ugyirat szerkesztes szigoru ABAC" ON ugyirat;
CREATE POLICY "Ugyirat szerkesztes szigoru ABAC" ON ugyirat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      fp.docs_szerepkor::text IN ('admin', 'iktato') OR
      (
        fp.docs_szerepkor::text IN ('vezeto', 'ugyintezo') AND
        (
          ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
          EXISTS (
            SELECT 1 FROM ugyirat_hozzaferes uh
            WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
          )
        )
      )
    )
  )
);

-- 3. Irat SELECT Policy (szerepkör + max_minosites szűrés)
DROP POLICY IF EXISTS "Irat megtekintes szigoru ABAC" ON irat;
CREATE POLICY "Irat megtekintes szigoru ABAC" ON irat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND irat.minosites <= fp.max_minosites
    AND (
      fp.docs_szerepkor::text IN ('admin', 'iktato', 'auditor') OR
      EXISTS (
        SELECT 1 FROM ugyirat u
        WHERE u.id = irat.ugyirat_id
        AND (
          u.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
          EXISTS (
            SELECT 1 FROM ugyirat_hozzaferes uh
            WHERE uh.ugyirat_id = u.id AND uh.user_id = fp.id
          )
        )
      )
    )
  )
);

-- 4. Irat WRITE Policy
DROP POLICY IF EXISTS "Irat szerkesztes szigoru ABAC" ON irat;
CREATE POLICY "Irat szerkesztes szigoru ABAC" ON irat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND irat.minosites <= fp.max_minosites
    AND (
      fp.docs_szerepkor::text IN ('admin', 'iktato') OR
      (
        fp.docs_szerepkor::text IN ('vezeto', 'ugyintezo') AND
        EXISTS (
          SELECT 1 FROM ugyirat u
          WHERE u.id = irat.ugyirat_id
          AND (
            u.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
            EXISTS (
              SELECT 1 FROM ugyirat_hozzaferes uh
              WHERE uh.ugyirat_id = u.id AND uh.user_id = fp.id
            )
          )
        )
      )
    )
  )
);

-- 5. RPC Updates to handle default elerheto_modulok setup if NULL
CREATE OR REPLACE FUNCTION admin_update_user_role(target_user_id UUID, new_role user_szerepkor, new_minosites irat_minosites)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin or rendszergazda
  IF NOT EXISTS (
    SELECT 1 FROM felhasznalo_profil
    WHERE id = auth.uid() AND (
      szerepkor::text IN ('rendszergazda', 'admin') OR
      docs_szerepkor::text IN ('rendszergazda', 'admin') OR
      hr_szerepkor::text IN ('rendszergazda', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Csak rendszergazda módosíthat jogosultságokat!';
  END IF;

  UPDATE felhasznalo_profil 
  SET 
    szerepkor = new_role,
    docs_szerepkor = new_role::text::docs_szerepkor_enum,
    max_minosites = new_minosites,
    elerheto_modulok = COALESCE(elerheto_modulok, ARRAY['docs'])
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_user_profile(target_user_id UUID, new_role user_szerepkor, new_minosites irat_minosites, new_department_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin or rendszergazda
  IF NOT EXISTS (
    SELECT 1 FROM felhasznalo_profil
    WHERE id = auth.uid() AND (
      szerepkor::text IN ('rendszergazda', 'admin') OR
      docs_szerepkor::text IN ('rendszergazda', 'admin') OR
      hr_szerepkor::text IN ('rendszergazda', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Csak rendszergazda módosíthat jogosultságokat!';
  END IF;

  UPDATE felhasznalo_profil 
  SET 
    szerepkor = new_role, 
    docs_szerepkor = new_role::text::docs_szerepkor_enum,
    max_minosites = new_minosites,
    szervezeti_egyseg_id = new_department_id,
    elerheto_modulok = COALESCE(elerheto_modulok, ARRAY['docs'])
  WHERE id = target_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

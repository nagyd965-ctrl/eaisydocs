-- 20260918000005_strict_confidential_rls.sql
-- Szigorú biztonsági minősítés (ABAC/RBAC) érvényesítése az irat, irat_fajl és ugyirat táblákon

-- 1. Régi, mindent átengedő (permissive) legacy szabályok eltávolítása
DROP POLICY IF EXISTS "Allow all operations for authenticated users on irat" ON irat;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on irat_fajl" ON irat_fajl;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on ugyirat" ON ugyirat;

-- 2. Helper functions a kölcsönös körkörös RLS rekurszió (infinite recursion) elkerülésére (SECURITY DEFINER = bypasses RLS on subquery)
CREATE OR REPLACE FUNCTION public.check_ugyirat_has_unauthorized_irat(p_ugyirat_id uuid, p_max_minosites irat_minosites)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM irat
    WHERE ugyirat_id = p_ugyirat_id
    AND minosites > p_max_minosites
  );
$$;

CREATE OR REPLACE FUNCTION public.check_ugyirat_user_access(p_ugyirat_id uuid, p_user_id uuid, p_user_dept uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ugyirat u
    WHERE u.id = p_ugyirat_id
    AND (
      (p_user_dept IS NOT NULL AND u.szervezeti_egyseg_id = p_user_dept) OR
      EXISTS (
        SELECT 1 FROM ugyirat_hozzaferes uh
        WHERE uh.ugyirat_id = u.id AND uh.user_id = p_user_id
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.check_irat_fajl_access(p_irat_id uuid, p_user_id uuid, p_user_role text, p_max_minosites irat_minosites, p_user_dept uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM irat i
    WHERE i.id = p_irat_id
    AND (p_user_role = 'admin' OR i.minosites <= p_max_minosites)
    AND (
      p_user_role IN ('admin', 'iktato', 'auditor') OR
      i.ugyirat_id IS NULL OR
      public.check_ugyirat_user_access(i.ugyirat_id, p_user_id, p_user_dept)
    )
  );
$$;

-- 3. Ugyirat megtekintés RLS
DROP POLICY IF EXISTS "Ugyirat megtekintes ABAC alapjan" ON ugyirat;
DROP POLICY IF EXISTS "Ugyirat megtekintes szigoru ABAC" ON ugyirat;

CREATE POLICY "Ugyirat megtekintes szigoru ABAC" ON ugyirat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      -- Admin vagy Iktató vagy Auditor mindent láthat
      fp.docs_szerepkor::text IN ('admin', 'iktato', 'auditor') OR
      -- Vagy ha explicit hozzáférése van
      EXISTS (
        SELECT 1 FROM ugyirat_hozzaferes uh
        WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
      ) OR
      -- Vagy a saját osztálya, DE CSAK AKKOR, ha az ügyirat nem tartalmaz olyan iratot, ami meghaladja a felhasználó minősítését!
      (
        ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id
        AND NOT public.check_ugyirat_has_unauthorized_irat(ugyirat.id, fp.max_minosites)
      )
    )
  )
);

-- 4. Irat megtekintés RLS
DROP POLICY IF EXISTS "Irat megtekintes szigoru ABAC" ON irat;
CREATE POLICY "Irat megtekintes szigoru ABAC" ON irat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    -- KÖTELEZŐ: az irat minősítése nem haladhatja meg a felhasználó minősítését (kivéve admin)
    AND (fp.docs_szerepkor::text = 'admin' OR irat.minosites <= fp.max_minosites)
    AND (
      -- Admin, iktató, auditor minden engedélyezett minősítésű iratot láthat
      fp.docs_szerepkor::text IN ('admin', 'iktato', 'auditor') OR
      -- Még nem iktatott bejövő iratok az inboxban
      irat.ugyirat_id IS NULL OR
      -- Iktatott iratok esetén osztály vagy explicit hozzáférés
      public.check_ugyirat_user_access(irat.ugyirat_id, fp.id, fp.szervezeti_egyseg_id)
    )
  )
);

-- 5. Irat szerkesztés RLS
DROP POLICY IF EXISTS "Irat szerkesztes szigoru ABAC" ON irat;
CREATE POLICY "Irat szerkesztes szigoru ABAC" ON irat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (fp.docs_szerepkor::text = 'admin' OR irat.minosites <= fp.max_minosites)
    AND (
      fp.docs_szerepkor::text IN ('admin', 'iktato') OR
      (
        fp.docs_szerepkor::text IN ('vezeto', 'ugyintezo') AND
        (
          irat.ugyirat_id IS NULL OR
          public.check_ugyirat_user_access(irat.ugyirat_id, fp.id, fp.szervezeti_egyseg_id)
        )
      )
    )
  )
);

-- 6. Irat_fajl megtekintés RLS
DROP POLICY IF EXISTS "Irat fajl megtekintes szigoru ABAC" ON irat_fajl;
CREATE POLICY "Irat fajl megtekintes szigoru ABAC" ON irat_fajl
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND public.check_irat_fajl_access(irat_fajl.irat_id, fp.id, fp.docs_szerepkor::text, fp.max_minosites, fp.szervezeti_egyseg_id)
  )
);

-- 7. Irat_fajl szerkesztés RLS
DROP POLICY IF EXISTS "Irat fajl szerkesztes szigoru ABAC" ON irat_fajl;
CREATE POLICY "Irat fajl szerkesztes szigoru ABAC" ON irat_fajl
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (fp.docs_szerepkor::text IN ('admin', 'iktato') OR fp.docs_szerepkor::text IN ('vezeto', 'ugyintezo'))
    AND public.check_irat_fajl_access(irat_fajl.irat_id, fp.id, fp.docs_szerepkor::text, fp.max_minosites, fp.szervezeti_egyseg_id)
  )
);

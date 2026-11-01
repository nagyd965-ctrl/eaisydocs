-- =============================================================================
-- Migration: 20261101000002_hr_remaining_tables_company_isolation_and_profile_rls.sql
-- Scope: [Közös] / [HR]
-- Description:
--   1. [P0] Harden public.admin_update_user_profile RPC with company-membership
--      and company-admin verification + multi-company global profile protection.
--   2. [P1] Narrow public.felhasznalo_profil SELECT RLS policy from USING (true)
--      to self + shared-company co-members + system/company admins via a
--      recursion-safe SECURITY DEFINER helper (public.can_view_user_profile).
--   3. [P1] Add company_id + backfill + index + RESTRICTIVE company isolation
--      (public.user_has_company_access(company_id)) BEFORE the dynamic policy
--      loop on:
--        - public.hr_onboarding_munkakor
--        - public.hr_munkakor_leiras_verzio
--        - public.hr_cafeteria_katalogus
--   4. [P1] Add RESTRICTIVE company isolation and company-scoped admin/audit
--      SELECT policy on public.ertesites_naplo.
--   5. [P1] Run dynamic 2-parameter has_hr_module_access(ARRAY[...], company_id)
--      policy rewrite loop so the newly company-scoped tables are upgraded.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. [P0] admin_update_user_profile RPC — Cég-tagság és cég-admin ellenőrzés
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id uuid,
  new_role user_szerepkor,
  new_minosites irat_minosites,
  new_department_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_global_sysadmin boolean := false;
  v_has_shared_admin_company boolean := false;
  v_target_company_count integer := 0;
  v_dept_company_id uuid := null;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Nincs bejelentkezve!';
  END IF;

  -- Prevent self-demotion if caller is demoting themselves from admin/rendszergazda
  IF target_user_id = v_caller_id AND new_role::text NOT IN ('rendszergazda', 'admin') THEN
    RAISE EXCEPTION 'Saját adminisztrátori jogosultságodat nem csökkentheted a rendszerből való kizáródás megelőzése érdekében!';
  END IF;

  -- Check if caller is a global rendszergazda
  SELECT EXISTS (
    SELECT 1
    FROM public.felhasznalo_profil fp
    WHERE fp.id = v_caller_id
      AND (
        fp.szerepkor::text = 'rendszergazda'
        OR fp.docs_szerepkor::text = 'rendszergazda'
      )
  ) INTO v_is_global_sysadmin;

  -- Check if caller and target_user_id share at least one company where caller is admin/owner
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm_caller
    JOIN public.company_members cm_target
      ON cm_target.company_id = cm_caller.company_id
    WHERE cm_caller.user_id = v_caller_id
      AND cm_target.user_id = target_user_id
      AND (
        cm_caller.role IN ('owner', 'admin')
        OR cm_caller.docs_szerepkor::text IN ('admin', 'rendszergazda')
        OR cm_caller.hr_szerepkor::text IN ('admin', 'rendszergazda')
        OR public.has_hr_module_access(ARRAY['admin'], cm_caller.company_id)
      )
  ) INTO v_has_shared_admin_company;

  IF NOT v_has_shared_admin_company AND NOT v_is_global_sysadmin THEN
    RAISE EXCEPTION 'Csak az adott vállalat rendszergazdája módosíthatja a vállalathoz tartozó felhasználó jogosultságait!';
  END IF;

  -- If new_department_id is specified, verify caller has access to that department's company
  IF new_department_id IS NOT NULL THEN
    SELECT se.company_id
    INTO v_dept_company_id
    FROM public.szervezeti_egyseg se
    WHERE se.id = new_department_id;

    IF v_dept_company_id IS NOT NULL AND NOT public.user_has_company_access(v_dept_company_id) AND NOT v_is_global_sysadmin THEN
      RAISE EXCEPTION 'A megadott szervezeti egység egy másik vállalathoz tartozik!';
    END IF;
  END IF;

  -- Update company_members.docs_szerepkor in companies where caller is admin
  UPDATE public.company_members cm_target
  SET docs_szerepkor = new_role::text
  WHERE cm_target.user_id = target_user_id
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm_caller
      WHERE cm_caller.company_id = cm_target.company_id
        AND cm_caller.user_id = v_caller_id
        AND (
          cm_caller.role IN ('owner', 'admin')
          OR cm_caller.docs_szerepkor::text IN ('admin', 'rendszergazda')
          OR cm_caller.hr_szerepkor::text IN ('admin', 'rendszergazda')
          OR v_is_global_sysadmin
        )
    );

  -- Count how many companies target_user_id belongs to
  SELECT COUNT(*)
  INTO v_target_company_count
  FROM public.company_members cm
  WHERE cm.user_id = target_user_id;

  -- Only overwrite global felhasznalo_profil role if user belongs to <= 1 company (or is global sysadmin)
  IF v_target_company_count <= 1 OR v_is_global_sysadmin THEN
    UPDATE public.felhasznalo_profil
    SET
      szerepkor = new_role,
      docs_szerepkor = new_role::text::docs_szerepkor_enum,
      max_minosites = new_minosites,
      szervezeti_egyseg_id = new_department_id
    WHERE id = target_user_id;
  ELSE
    UPDATE public.felhasznalo_profil
    SET
      max_minosites = new_minosites,
      szervezeti_egyseg_id = COALESCE(new_department_id, szervezeti_egyseg_id)
    WHERE id = target_user_id;
  END IF;
END;
$function$;


-- =============================================================================
-- 2. [P1] felhasznalo_profil SELECT RLS szűkítés (rekurziómentes SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_view_user_profile(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Saját profil mindig látható
  IF p_target_user_id = v_uid THEN
    RETURN true;
  END IF;

  -- 2. Közös vállalati tagság (company_members)
  IF EXISTS (
    SELECT 1
    FROM public.company_members cm_self
    JOIN public.company_members cm_target
      ON cm_target.company_id = cm_self.company_id
    WHERE cm_self.user_id = v_uid
      AND cm_target.user_id = p_target_user_id
  ) THEN
    RETURN true;
  END IF;

  -- 3. Közös vállalati HR adatlap hozzáférés (pl. még nem aktivált / adatlapos dolgozó)
  IF EXISTS (
    SELECT 1
    FROM public.hr_dolgozo_adatlap da
    WHERE da.id = p_target_user_id
      AND da.company_id IS NOT NULL
      AND public.user_has_company_access(da.company_id)
  ) THEN
    RETURN true;
  END IF;

  -- 4. Globális rendszergazda / admin
  IF EXISTS (
    SELECT 1
    FROM public.felhasznalo_profil fp
    WHERE fp.id = v_uid
      AND (
        fp.szerepkor::text IN ('admin', 'rendszergazda')
        OR fp.docs_szerepkor::text IN ('admin', 'rendszergazda')
        OR fp.hr_szerepkor::text IN ('admin', 'rendszergazda')
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

DROP POLICY IF EXISTS "Profilokat mindenki latja" ON public.felhasznalo_profil;
CREATE POLICY "Profilokat mindenki latja" ON public.felhasznalo_profil
  FOR SELECT
  TO authenticated
  USING (public.can_view_user_profile(id));


-- =============================================================================
-- 3. [P1] hr_onboarding_munkakor, hr_munkakor_leiras_verzio, hr_cafeteria_katalogus
--    oszlop + backfill + RESTRICTIVE RLS (a dinamikus policy-loop ELŐTT!)
-- =============================================================================

-- 3.1. hr_onboarding_munkakor
ALTER TABLE public.hr_onboarding_munkakor
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hr_onboarding_munkakor_company_id
  ON public.hr_onboarding_munkakor(company_id);

UPDATE public.hr_onboarding_munkakor om
SET company_id = o.company_id
FROM public.hr_onboarding o
WHERE om.onboarding_id = o.id
  AND om.company_id IS NULL
  AND o.company_id IS NOT NULL;

UPDATE public.hr_onboarding_munkakor om
SET company_id = da.company_id
FROM public.hr_dolgozo_adatlap da
WHERE om.dolgozo_id = da.id
  AND om.company_id IS NULL
  AND da.company_id IS NOT NULL;

UPDATE public.hr_onboarding_munkakor om
SET company_id = m.company_id
FROM public.hr_munkakor m
WHERE om.munkakor_id = m.id
  AND om.company_id IS NULL
  AND m.company_id IS NOT NULL;

UPDATE public.hr_onboarding_munkakor om
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = om.dolgozo_id
  ORDER BY cm.created_at ASC
  LIMIT 1
)
WHERE om.company_id IS NULL
  AND om.dolgozo_id IS NOT NULL;

DROP POLICY IF EXISTS hr_onboarding_munkakor_company_isolation ON public.hr_onboarding_munkakor;
CREATE POLICY hr_onboarding_munkakor_company_isolation ON public.hr_onboarding_munkakor
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));


-- 3.2. hr_munkakor_leiras_verzio
ALTER TABLE public.hr_munkakor_leiras_verzio
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hr_munkakor_leiras_verzio_company_id
  ON public.hr_munkakor_leiras_verzio(company_id);

UPDATE public.hr_munkakor_leiras_verzio v
SET company_id = m.company_id
FROM public.hr_munkakor m
WHERE v.munkakor_id = m.id
  AND v.company_id IS NULL
  AND m.company_id IS NOT NULL;

UPDATE public.hr_munkakor_leiras_verzio v
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = v.feltolto_id
  ORDER BY cm.created_at ASC
  LIMIT 1
)
WHERE v.company_id IS NULL
  AND v.feltolto_id IS NOT NULL;

DROP POLICY IF EXISTS hr_munkakor_leiras_verzio_company_isolation ON public.hr_munkakor_leiras_verzio;
CREATE POLICY hr_munkakor_leiras_verzio_company_isolation ON public.hr_munkakor_leiras_verzio
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "HR modulhoz tartozo felhasznalok latjak a munkakori leirasokat" ON public.hr_munkakor_leiras_verzio;
CREATE POLICY "HR modulhoz tartozo felhasznalok latjak a munkakori leirasokat" ON public.hr_munkakor_leiras_verzio
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));


-- 3.3. hr_cafeteria_katalogus
ALTER TABLE public.hr_cafeteria_katalogus
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hr_cafeteria_katalogus_company_id
  ON public.hr_cafeteria_katalogus(company_id);

-- Backfill a meglévő választásokból (hr_cafeteria_valasztas)
UPDATE public.hr_cafeteria_katalogus k
SET company_id = v.company_id
FROM public.hr_cafeteria_valasztas v
WHERE v.katalogus_elem_id = k.id
  AND k.company_id IS NULL
  AND v.company_id IS NOT NULL;

-- A még NULL company_id-jú seed sorokat hozzárendeljük az elsődleges céghez (ahol cafeteria választás vagy keret van, vagy a legrégebbi céghez)
UPDATE public.hr_cafeteria_katalogus k
SET company_id = COALESCE(
  (SELECT v.company_id FROM public.hr_cafeteria_valasztas v WHERE v.company_id IS NOT NULL LIMIT 1),
  (SELECT ke.company_id FROM public.hr_cafeteria_keret ke WHERE ke.company_id IS NOT NULL LIMIT 1),
  (SELECT c.id FROM public.companies c ORDER BY c.created_at ASC LIMIT 1)
)
WHERE k.company_id IS NULL;

-- Minden olyan vállalatnak, amelynek még nincs saját cafeteria katalógusa, lemásoljuk az alapértelmezett katalóguselemeket
INSERT INTO public.hr_cafeteria_katalogus (nev, leiras, szorzo, kategoria, aktiv, company_id)
SELECT
  src.nev,
  src.leiras,
  src.szorzo,
  src.kategoria,
  src.aktiv,
  c.id AS company_id
FROM public.companies c
CROSS JOIN (
  SELECT DISTINCT ON (nev) nev, leiras, szorzo, kategoria, aktiv
  FROM public.hr_cafeteria_katalogus
  ORDER BY nev, created_at ASC
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM public.hr_cafeteria_katalogus existing
  WHERE existing.company_id = c.id
    AND existing.nev = src.nev
);

DROP POLICY IF EXISTS hr_cafeteria_katalogus_company_isolation ON public.hr_cafeteria_katalogus;
CREATE POLICY hr_cafeteria_katalogus_company_isolation ON public.hr_cafeteria_katalogus
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "Mindenki olvashatja a cafeteria katalogust" ON public.hr_cafeteria_katalogus;
CREATE POLICY "Mindenki olvashatja a cafeteria katalogust" ON public.hr_cafeteria_katalogus
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));


-- =============================================================================
-- 4. [P1] ertesites_naplo — RESTRICTIVE cég-izoláció és cég-szűrt SELECT policy
-- =============================================================================

ALTER TABLE public.ertesites_naplo
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ertesites_naplo_company_id
  ON public.ertesites_naplo(company_id);

UPDATE public.ertesites_naplo en
SET company_id = u.company_id
FROM public.ugyirat u
WHERE en.ugyirat_id = u.id
  AND en.company_id IS NULL
  AND u.company_id IS NOT NULL;

UPDATE public.ertesites_naplo en
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = en.kivato_user_id
  ORDER BY cm.created_at ASC
  LIMIT 1
)
WHERE en.company_id IS NULL
  AND en.kivato_user_id IS NOT NULL;

DROP POLICY IF EXISTS ertesites_naplo_company_isolation ON public.ertesites_naplo;
CREATE POLICY ertesites_naplo_company_isolation ON public.ertesites_naplo
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "Csak Admin es Auditor lathatja a naplot" ON public.ertesites_naplo;
CREATE POLICY "Csak Admin es Auditor lathatja a naplot" ON public.ertesites_naplo
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.has_hr_module_access(ARRAY['admin', 'audit'], company_id)
      OR EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.user_id = auth.uid()
          AND cm.company_id = ertesites_naplo.company_id
          AND (
            cm.role IN ('owner', 'admin')
            OR cm.docs_szerepkor::text IN ('admin', 'rendszergazda', 'vezeto', 'auditor')
            OR cm.hr_szerepkor::text IN ('admin', 'rendszergazda', 'auditor')
          )
      )
    )
  );


-- =============================================================================
-- 5. DINAMIKUS 2-PARAMÉTERES has_hr_module_access(..., company_id) POLICY LOOP
--    (Átírja a hr_onboarding_munkakor, hr_munkakor_leiras_verzio,
--     hr_cafeteria_katalogus és minden egyéb company_id-s tábla 1-paraméteres
--     has_hr_module_access hívásait 2-paraméteresre)
-- =============================================================================

DO $$
DECLARE
  pol RECORD;
  new_qual text;
  new_check text;
  alter_sql text;
BEGIN
  FOR pol IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.qual,
      p.with_check
    FROM pg_policies p
    JOIN information_schema.columns c
      ON c.table_schema = p.schemaname
     AND c.table_name = p.tablename
     AND c.column_name = 'company_id'
    WHERE p.schemaname = 'public'
      AND (
        (p.qual IS NOT NULL AND p.qual LIKE '%has_hr_module_access(%' AND p.qual NOT LIKE '%company_id)%')
        OR
        (p.with_check IS NOT NULL AND p.with_check LIKE '%has_hr_module_access(%' AND p.with_check NOT LIKE '%company_id)%')
      )
  LOOP
    new_qual := pol.qual;
    new_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(
        new_qual,
        '(?:public\.)?has_hr_module_access\(\s*(ARRAY\[[^\]]+\])\s*\)',
        'public.has_hr_module_access(\1, company_id)',
        'g'
      );
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(
        new_check,
        '(?:public\.)?has_hr_module_access\(\s*(ARRAY\[[^\]]+\])\s*\)',
        'public.has_hr_module_access(\1, company_id)',
        'g'
      );
    END IF;

    IF new_qual IS DISTINCT FROM pol.qual OR new_check IS DISTINCT FROM pol.with_check THEN
      alter_sql := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

      IF new_qual IS NOT NULL THEN
        alter_sql := alter_sql || ' USING (' || new_qual || ')';
      END IF;

      IF new_check IS NOT NULL THEN
        alter_sql := alter_sql || ' WITH CHECK (' || new_check || ')';
      END IF;

      BEGIN
        EXECUTE alter_sql;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped policy % on %.%: %', pol.policyname, pol.schemaname, pol.tablename, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;

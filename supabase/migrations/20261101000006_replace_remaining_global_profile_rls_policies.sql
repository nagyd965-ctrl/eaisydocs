-- =============================================================================
-- Migration: 20261101000006_replace_remaining_global_profile_rls_policies.sql
-- Scope: [HR] Complete Multi-Company Isolation — Replace Remaining Global
--        felhasznalo_profil Policies on 13 HR Tables
-- Description:
--   Replaces remaining legacy PERMISSIVE policies that referenced global
--   `felhasznalo_profil.hr_szerepkor`, `felhasznalo_profil.szerepkor`, or
--   `felhasznalo_profil.elerheto_modulok` with company-scoped
--   `has_hr_module_access(..., company_id)` and `user_has_company_access(company_id)`.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. hr_beosztas (Option A: company-wide SELECT via user_has_company_access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mindenki latja a beosztasokat" ON public.hr_beosztas;
DROP POLICY IF EXISTS "company_isolation_restrictive" ON public.hr_beosztas;

CREATE POLICY "Mindenki latja a beosztasokat"
  ON public.hr_beosztas
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

-- -----------------------------------------------------------------------------
-- 2. hr_bevallas_archivum
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Hr munkatarsak feltolthetnek az archivumba" ON public.hr_bevallas_archivum;
DROP POLICY IF EXISTS "Hr munkatarsak olvashatjak az archivumot" ON public.hr_bevallas_archivum;

CREATE POLICY "Hr munkatarsak olvashatjak az archivumot"
  ON public.hr_bevallas_archivum
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'payroll', 'compliance', 'reports', 'auditor']::text[],
      company_id
    )
  );

CREATE POLICY "Hr munkatarsak feltolthetnek az archivumba"
  ON public.hr_bevallas_archivum
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'payroll', 'compliance']::text[],
      company_id
    )
  )
  WITH CHECK (
    public.has_hr_module_access(
      ARRAY['admin', 'payroll', 'compliance']::text[],
      company_id
    )
  );

-- -----------------------------------------------------------------------------
-- 3. hr_ceges_dokumentum
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR kezelheti a dokumentumokat" ON public.hr_ceges_dokumentum;

CREATE POLICY "HR kezelheti a dokumentumokat"
  ON public.hr_ceges_dokumentum
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'compliance', 'onboarding']::text[],
      company_id
    )
  )
  WITH CHECK (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'compliance', 'onboarding']::text[],
      company_id
    )
  );

-- -----------------------------------------------------------------------------
-- 4. hr_ceges_dokumentum_nyugtazas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR olvashatja az osszes nyugtazast" ON public.hr_ceges_dokumentum_nyugtazas;

CREATE POLICY "HR olvashatja az osszes nyugtazast"
  ON public.hr_ceges_dokumentum_nyugtazas
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'compliance', 'onboarding', 'reports', 'auditor']::text[],
      company_id
    )
  );

-- -----------------------------------------------------------------------------
-- 5. hr_fejlesztesi_cel
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR modul latja a celokat" ON public.hr_fejlesztesi_cel;
DROP POLICY IF EXISTS "Vezetok kezelik a beosztott celokat" ON public.hr_fejlesztesi_cel;

CREATE POLICY "HR modul latja a celokat"
  ON public.hr_fejlesztesi_cel
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'performance', 'employees']::text[],
      company_id
    )
  )
  WITH CHECK (
    public.has_hr_module_access(
      ARRAY['admin', 'performance', 'employees']::text[],
      company_id
    )
  );

CREATE POLICY "Vezetok kezelik a beosztott celokat"
  ON public.hr_fejlesztesi_cel
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_fejlesztesi_cel.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  )
  WITH CHECK (
    dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_fejlesztesi_cel.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 6. hr_fejlesztesi_terv
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR modul latja a terveket" ON public.hr_fejlesztesi_terv;
DROP POLICY IF EXISTS "Vezetok kezelik a beosztott terveket" ON public.hr_fejlesztesi_terv;

CREATE POLICY "HR modul latja a terveket"
  ON public.hr_fejlesztesi_terv
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'performance', 'employees']::text[],
      company_id
    )
  )
  WITH CHECK (
    public.has_hr_module_access(
      ARRAY['admin', 'performance', 'employees']::text[],
      company_id
    )
  );

CREATE POLICY "Vezetok kezelik a beosztott terveket"
  ON public.hr_fejlesztesi_terv
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_fejlesztesi_terv.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  )
  WITH CHECK (
    dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_fejlesztesi_terv.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 7. hr_idp_megjegyzes (scoped via parent hr_fejlesztesi_cel.company_id)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "IDP megjegyzes lathato" ON public.hr_idp_megjegyzes;
DROP POLICY IF EXISTS "IDP megjegyzes rogzitheto" ON public.hr_idp_megjegyzes;

CREATE POLICY "IDP megjegyzes lathato"
  ON public.hr_idp_megjegyzes
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hr_fejlesztesi_cel c
      WHERE c.id = hr_idp_megjegyzes.cel_id
        AND public.user_has_company_access(c.company_id)
        AND (
          c.dolgozo_id = auth.uid()
          OR public.has_hr_module_access(ARRAY['admin', 'performance', 'employees']::text[], c.company_id)
          OR c.dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
          OR EXISTS (
            SELECT 1
            FROM public.felhasznalo_profil fp
            WHERE fp.id = c.dolgozo_id
              AND fp.kozvetlen_vezeto_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "IDP megjegyzes rogzitheto"
  ON public.hr_idp_megjegyzes
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    iro_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.hr_fejlesztesi_cel c
      WHERE c.id = hr_idp_megjegyzes.cel_id
        AND public.user_has_company_access(c.company_id)
        AND (
          c.dolgozo_id = auth.uid()
          OR public.has_hr_module_access(ARRAY['admin', 'performance', 'employees']::text[], c.company_id)
          OR c.dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
          OR EXISTS (
            SELECT 1
            FROM public.felhasznalo_profil fp
            WHERE fp.id = c.dolgozo_id
              AND fp.kozvetlen_vezeto_id = auth.uid()
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 8. hr_munkakor
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR es Admin hozhat letre munkakort" ON public.hr_munkakor;
DROP POLICY IF EXISTS "Munkaköröket mindenki latja akinek van HR modulja" ON public.hr_munkakor;

CREATE POLICY "HR es Admin hozhat letre munkakort"
  ON public.hr_munkakor
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'organization']::text[], company_id)
  );

CREATE POLICY "Munkaköröket mindenki latja akinek van HR modulja"
  ON public.hr_munkakor
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

-- -----------------------------------------------------------------------------
-- 9. hr_munkaszerzodes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR és Vezetők kezelik a munkaszerződéseket" ON public.hr_munkaszerzodes;

CREATE POLICY "HR és Vezetők kezelik a munkaszerződéseket"
  ON public.hr_munkaszerzodes
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'payroll', 'onboarding', 'offboarding', 'compliance']::text[],
      company_id
    )
    OR dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_munkaszerzodes.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'payroll', 'onboarding', 'offboarding', 'compliance']::text[],
      company_id
    )
  );

-- -----------------------------------------------------------------------------
-- 10. hr_szervezeti_egyseg
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mindenki latja a HR szervezeti egyseget akinek van HR modulja" ON public.hr_szervezeti_egyseg;
DROP POLICY IF EXISTS "HR es Admin kezelheti a szervezeti egyseget" ON public.hr_szervezeti_egyseg;

CREATE POLICY "Mindenki latja a HR szervezeti egyseget akinek van HR modulja"
  ON public.hr_szervezeti_egyseg
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

CREATE POLICY "HR es Admin kezelheti a szervezeti egyseget"
  ON public.hr_szervezeti_egyseg
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'organization']::text[], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'organization']::text[], company_id)
  );

-- -----------------------------------------------------------------------------
-- 11. hr_t1041_bejelentes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR és Vezetők kezelik a T1041 bejelentéseket" ON public.hr_t1041_bejelentes;

CREATE POLICY "HR és Vezetők kezelik a T1041 bejelentéseket"
  ON public.hr_t1041_bejelentes
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'payroll', 'onboarding', 'offboarding', 'compliance']::text[],
      company_id
    )
  )
  WITH CHECK (
    public.has_hr_module_access(
      ARRAY['admin', 'employees', 'payroll', 'onboarding', 'offboarding', 'compliance']::text[],
      company_id
    )
  );

-- -----------------------------------------------------------------------------
-- 12. hr_tavollet (drop redundant legacy UPDATE policy using felhasznalo_profil.szerepkor)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Vezető jóváhagyhatja a beosztott szabadságát" ON public.hr_tavollet;

-- -----------------------------------------------------------------------------
-- 13. hr_teljesitmeny_ciklus
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "HR adminok es vezetok modolithatjak a ciklusokat" ON public.hr_teljesitmeny_ciklus;
DROP POLICY IF EXISTS "Mindenki latja a ciklusokat akinek van HR modulja" ON public.hr_teljesitmeny_ciklus;

CREATE POLICY "HR adminok es vezetok modolithatjak a ciklusokat"
  ON public.hr_teljesitmeny_ciklus
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'performance']::text[], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'performance']::text[], company_id)
  );

CREATE POLICY "Mindenki latja a ciklusokat akinek van HR modulja"
  ON public.hr_teljesitmeny_ciklus
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

-- -----------------------------------------------------------------------------
-- 14. hr_helyettesites & hr_muszak_sablon (replace literal USING (true) with company check)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mindenki láthatja a helyettesítéseket" ON public.hr_helyettesites;
CREATE POLICY "Mindenki láthatja a helyettesítéseket"
  ON public.hr_helyettesites
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "Műszaksablonok olvasása cégen belül" ON public.hr_muszak_sablon;
CREATE POLICY "Műszaksablonok olvasása cégen belül"
  ON public.hr_muszak_sablon
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

-- -----------------------------------------------------------------------------
-- 15. hr_munkavedelmi_oktatas (replace global p.hr_szerepkor fallback with 2-param has_hr_module_access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "hr_munkavedelmi_oktatas_modify_policy" ON public.hr_munkavedelmi_oktatas;
DROP POLICY IF EXISTS "hr_munkavedelmi_oktatas_select_policy" ON public.hr_munkavedelmi_oktatas;

CREATE POLICY "hr_munkavedelmi_oktatas_modify_policy"
  ON public.hr_munkavedelmi_oktatas
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding']::text[], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding']::text[], company_id)
  );

CREATE POLICY "hr_munkavedelmi_oktatas_select_policy"
  ON public.hr_munkavedelmi_oktatas
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'compliance', 'audit', 'auditor', 'onboarding']::text[], company_id)
    OR dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_munkavedelmi_oktatas.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 16. Automated Verification Block
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_legacy_count integer;
BEGIN
  SELECT count(*)
  INTO v_legacy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (tablename LIKE 'hr_%' OR tablename = 'ertesitesi_szabaly')
    AND (
      coalesce(qual, '') ILIKE '%felhasznalo_profil.hr_szerepkor%'
      OR coalesce(with_check, '') ILIKE '%felhasznalo_profil.hr_szerepkor%'
      OR coalesce(qual, '') ILIKE '%p.hr_szerepkor%'
      OR coalesce(with_check, '') ILIKE '%p.hr_szerepkor%'
      OR coalesce(qual, '') ILIKE '%felhasznalo_profil.szerepkor%'
      OR coalesce(with_check, '') ILIKE '%felhasznalo_profil.szerepkor%'
      OR coalesce(qual, '') ILIKE '%elerheto_modulok%'
      OR coalesce(with_check, '') ILIKE '%elerheto_modulok%'
      OR trim(coalesce(qual, '')) = 'true'
      OR trim(coalesce(with_check, '')) = 'true'
    );

  IF v_legacy_count > 0 THEN
    RAISE EXCEPTION 'Verification failed: % HR policies still reference global felhasznalo_profil role/module columns or literal true', v_legacy_count;
  END IF;
END $$;

COMMIT;

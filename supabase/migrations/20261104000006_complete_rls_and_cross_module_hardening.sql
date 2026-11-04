-- =============================================================================
-- Migration: 20261104000006_complete_rls_and_cross_module_hardening.sql
-- Scope: [Közös] / [Docs] / [HR]
-- Description (5.2 — Adatbázis Migráció és RLS Szabályok Teljes Szinkronizációja):
--   1. Fix `public.handle_new_user()` trigger enum cast (`'munkavallalo'::public.user_szerepkor`
--      for `szerepkor`, `'munkavallalo'::public.docs_szerepkor_enum` for `docs_szerepkor`).
--   2. Harden `public.get_effective_docs_role`, `public.has_docs_module_access`,
--      `public.has_docs_write_access`, `public.has_hr_module_access`, and
--      `public.has_hr_write_access`:
--      - Enforce `elerheto_modulok` (`'docs'` / `'hr'`) as the very first check
--        so a Docs-only company admin cannot access HR tables and an HR-only
--        company admin cannot access Docs tables.
--      - Remove `fp.docs_szerepkor` fallback from `has_hr_module_access`.
--      - Enforce per-module read+write intersection (`m = ANY(v_read) AND m = ANY(v_write)`)
--        and consistent fallback to `felhasznalo_profil` when `company_members` module arrays are empty.
--   3. Add missing `PERMISSIVE` RLS policies on `public.hr_toborzas` and `public.hr_teljesitmeny`.
--   4. Split all HR `FOR ALL` / write RLS policies so `SELECT` uses `has_hr_module_access`
--      and `INSERT`/`UPDATE`/`DELETE` use `has_hr_write_access` (preserving self-service and manager branches).
--   5. Harden Docs RLS policies on `partner`, `feladat`, `ugy`, `selejtezes_csomag`,
--      `ugyirat_megjegyzes_csatolmany`, and `attach_irat_to_dossier_atomic`.
--   6. Restore company-scoped `:<company_uuid>` key check on `public.rendszer_beallitas`.
--   7. Replace global profile checks on `storage.objects` (`hr_reports` bucket) with
--      company-scoped `has_hr_module_access` / `has_hr_write_access`.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Fix `public.handle_new_user()` trigger enum cast
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.felhasznalo_profil (
    id,
    nev,
    email,
    szerepkor,
    docs_szerepkor,
    docs_modulok,
    docs_iras_modulok,
    max_minosites
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'nev',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'munkavallalo'::public.user_szerepkor,
    'munkavallalo'::public.docs_szerepkor_enum,
    ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
    ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
    'nyilt'::public.irat_minosites
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. Harden `get_effective_docs_role`, `has_docs_module_access`, `has_docs_write_access`,
--    `has_hr_module_access`, and `has_hr_write_access`
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_effective_docs_role(
  p_company_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cm_role text;
  v_cm_docs_role text;
  v_global_docs_role text;
  v_global_sys_role text;
  v_has_docs_module boolean := false;
  v_raw_role text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    fp.docs_szerepkor::text,
    fp.szerepkor::text,
    ('docs' = ANY(COALESCE(fp.elerheto_modulok, ARRAY['docs']::text[])))
  INTO
    v_global_docs_role,
    v_global_sys_role,
    v_has_docs_module
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  IF NOT COALESCE(v_has_docs_module, false) THEN
    RETURN NULL;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT cm.role, cm.docs_szerepkor::text
    INTO v_cm_role, v_cm_docs_role
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    IF v_cm_docs_role IS NOT NULL AND btrim(v_cm_docs_role) <> '' THEN
      v_raw_role := lower(btrim(v_cm_docs_role));
    ELSIF v_cm_role IN ('owner', 'admin') THEN
      v_raw_role := 'admin';
    ELSIF v_global_docs_role IN ('admin', 'rendszergazda') THEN
      v_raw_role := 'munkavallalo';
    ELSE
      v_raw_role := COALESCE(lower(btrim(v_global_docs_role)), 'munkavallalo');
    END IF;

    IF v_raw_role IN ('admin', 'rendszergazda') THEN
      RETURN 'admin';
    ELSIF v_raw_role = 'vezeto' THEN
      RETURN 'vezeto';
    ELSE
      RETURN 'munkavallalo';
    END IF;
  END IF;

  IF v_global_sys_role IN ('admin', 'rendszergazda') OR v_global_docs_role IN ('admin', 'rendszergazda') THEN
    RETURN 'admin';
  ELSIF v_global_docs_role = 'vezeto' THEN
    RETURN 'vezeto';
  END IF;

  RETURN 'munkavallalo';
END;
$$;

CREATE OR REPLACE FUNCTION public.has_docs_module_access(
  p_modules text[],
  p_company_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eff_role text;
  v_cm_modules text[];
  v_fp_modules text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  v_eff_role := public.get_effective_docs_role(p_company_id, p_user_id);
  IF v_eff_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_eff_role IN ('admin', 'rendszergazda') THEN
    RETURN true;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT cm.docs_modulok
    INTO v_cm_modules
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF FOUND AND COALESCE(cardinality(v_cm_modules), 0) > 0 THEN
      RETURN v_cm_modules && p_modules;
    END IF;
  END IF;

  SELECT fp.docs_modulok
  INTO v_fp_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  RETURN COALESCE(v_fp_modules, ARRAY[]::text[]) && p_modules;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_docs_write_access(
  p_modules text[],
  p_company_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eff_role text;
  v_cm_read_modules text[];
  v_cm_write_modules text[];
  v_fp_read_modules text[];
  v_fp_write_modules text[];
  v_eff_read text[];
  v_eff_write text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  v_eff_role := public.get_effective_docs_role(p_company_id, p_user_id);
  IF v_eff_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_eff_role IN ('admin', 'rendszergazda') THEN
    RETURN true;
  END IF;

  SELECT
    COALESCE(fp.docs_modulok, ARRAY[]::text[]),
    COALESCE(fp.docs_iras_modulok, fp.docs_modulok, ARRAY[]::text[])
  INTO v_fp_read_modules, v_fp_write_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  IF p_company_id IS NOT NULL THEN
    SELECT cm.docs_modulok, cm.docs_iras_modulok
    INTO v_cm_read_modules, v_cm_write_modules
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    IF COALESCE(cardinality(v_cm_read_modules), 0) > 0 THEN
      v_eff_read := v_cm_read_modules;
      v_eff_write := COALESCE(v_cm_write_modules, v_cm_read_modules);
    ELSE
      v_eff_read := COALESCE(v_fp_read_modules, ARRAY[]::text[]);
      v_eff_write := COALESCE(v_fp_write_modules, v_eff_read);
    END IF;
  ELSE
    v_eff_read := COALESCE(v_fp_read_modules, ARRAY[]::text[]);
    v_eff_write := COALESCE(v_fp_write_modules, v_eff_read);
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM unnest(p_modules) AS m
    WHERE m = ANY(v_eff_read)
      AND m = ANY(v_eff_write)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_hr_module_access(
  p_modules text[],
  p_company_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_hr_app boolean := false;
  v_fp_hr_role text;
  v_fp_read_modules text[];
  v_cm_role text;
  v_cm_hr_role text;
  v_cm_read_modules text[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    ('hr' = ANY(COALESCE(fp.elerheto_modulok, ARRAY[]::text[]))),
    fp.hr_szerepkor::text,
    COALESCE(fp.hr_modulok, ARRAY[]::text[])
  INTO
    v_has_hr_app,
    v_fp_hr_role,
    v_fp_read_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = v_uid;

  IF NOT COALESCE(v_has_hr_app, false) THEN
    RETURN false;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT
      cm.role,
      cm.hr_szerepkor::text,
      cm.hr_modulok
    INTO
      v_cm_role,
      v_cm_hr_role,
      v_cm_read_modules
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = v_uid
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    IF v_cm_role IN ('owner', 'admin')
       OR v_cm_hr_role IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
       OR 'admin' = ANY(COALESCE(v_cm_read_modules, ARRAY[]::text[])) THEN
      RETURN true;
    END IF;

    IF COALESCE(cardinality(v_cm_read_modules), 0) > 0 THEN
      RETURN v_cm_read_modules && p_modules;
    END IF;

    IF v_cm_hr_role IS NULL THEN
      IF v_fp_hr_role IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
         OR 'admin' = ANY(COALESCE(v_fp_read_modules, ARRAY[]::text[])) THEN
        RETURN true;
      END IF;
      RETURN COALESCE(v_fp_read_modules, ARRAY[]::text[]) && p_modules;
    END IF;

    RETURN false;
  END IF;

  -- p_company_id IS NULL fallback
  IF EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.user_id = v_uid
      AND (
        cm.role IN ('owner', 'admin')
        OR cm.hr_szerepkor::text IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
        OR 'admin' = ANY(COALESCE(cm.hr_modulok, ARRAY[]::text[]))
        OR COALESCE(cm.hr_modulok, ARRAY[]::text[]) && p_modules
      )
  ) THEN
    RETURN true;
  END IF;

  IF v_fp_hr_role IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
     OR 'admin' = ANY(COALESCE(v_fp_read_modules, ARRAY[]::text[])) THEN
    RETURN true;
  END IF;

  RETURN COALESCE(v_fp_read_modules, ARRAY[]::text[]) && p_modules;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_hr_module_access(p_modules text[] DEFAULT ARRAY['admin'])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_hr_module_access(p_modules, NULL::uuid);
$$;

CREATE OR REPLACE FUNCTION public.has_hr_write_access(
  p_modules text[],
  p_company_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_hr_app boolean := false;
  v_cm_role text;
  v_cm_hr_role text;
  v_cm_read_modules text[];
  v_cm_write_modules text[];
  v_fp_hr_role text;
  v_fp_read_modules text[];
  v_fp_write_modules text[];
  v_eff_read text[];
  v_eff_write text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    ('hr' = ANY(COALESCE(fp.elerheto_modulok, ARRAY[]::text[]))),
    fp.hr_szerepkor::text,
    COALESCE(fp.hr_modulok, ARRAY[]::text[]),
    COALESCE(fp.hr_iras_modulok, fp.hr_modulok, ARRAY[]::text[])
  INTO
    v_has_hr_app,
    v_fp_hr_role,
    v_fp_read_modules,
    v_fp_write_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  IF NOT COALESCE(v_has_hr_app, false) THEN
    RETURN false;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT
      cm.role,
      cm.hr_szerepkor::text,
      cm.hr_modulok,
      cm.hr_iras_modulok
    INTO
      v_cm_role,
      v_cm_hr_role,
      v_cm_read_modules,
      v_cm_write_modules
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    IF v_cm_role IN ('owner', 'admin') OR v_cm_hr_role IN ('admin', 'hr_vezeto', 'rendszergazda') THEN
      RETURN true;
    END IF;

    IF COALESCE(cardinality(v_cm_read_modules), 0) > 0 THEN
      v_eff_read := v_cm_read_modules;
      v_eff_write := COALESCE(v_cm_write_modules, v_cm_read_modules);
    ELSIF v_cm_hr_role IS NULL THEN
      IF v_fp_hr_role IN ('admin', 'hr_vezeto', 'rendszergazda') THEN
        RETURN true;
      END IF;
      v_eff_read := COALESCE(v_fp_read_modules, ARRAY[]::text[]);
      v_eff_write := COALESCE(v_fp_write_modules, v_eff_read);
    ELSE
      v_eff_read := ARRAY[]::text[];
      v_eff_write := ARRAY[]::text[];
    END IF;

    IF 'admin' = ANY(v_eff_read) AND 'admin' = ANY(v_eff_write) THEN
      RETURN true;
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM unnest(p_modules) AS m
      WHERE m = ANY(v_eff_read)
        AND m = ANY(v_eff_write)
    );
  END IF;

  -- p_company_id IS NULL fallback
  IF v_fp_hr_role IN ('admin', 'hr_vezeto', 'rendszergazda')
     OR ('admin' = ANY(v_fp_read_modules) AND 'admin' = ANY(v_fp_write_modules)) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM unnest(p_modules) AS m
    WHERE m = ANY(v_fp_read_modules)
      AND m = ANY(v_fp_write_modules)
  );
END;
$$;

-- =============================================================================
-- 3. Add missing PERMISSIVE RLS policies on `hr_toborzas` and `hr_teljesitmeny`
-- =============================================================================
DROP POLICY IF EXISTS "hr_toborzas_select" ON public.hr_toborzas;
DROP POLICY IF EXISTS "hr_toborzas_write" ON public.hr_toborzas;

CREATE POLICY "hr_toborzas_select"
  ON public.hr_toborzas
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'recruitment', 'onboarding', 'reports', 'auditor']::text[], company_id)
  );

CREATE POLICY "hr_toborzas_write"
  ON public.hr_toborzas
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_write_access(ARRAY['admin', 'recruitment', 'onboarding']::text[], company_id)
  )
  WITH CHECK (
    public.has_hr_write_access(ARRAY['admin', 'recruitment', 'onboarding']::text[], company_id)
  );

DROP POLICY IF EXISTS "hr_teljesitmeny_select" ON public.hr_teljesitmeny;
DROP POLICY IF EXISTS "hr_teljesitmeny_write" ON public.hr_teljesitmeny;

CREATE POLICY "hr_teljesitmeny_select"
  ON public.hr_teljesitmeny
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR ertekeles_keszito_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'performance', 'employees', 'reports', 'auditor']::text[], company_id)
    OR dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_teljesitmeny.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  );

CREATE POLICY "hr_teljesitmeny_write"
  ON public.hr_teljesitmeny
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR ertekeles_keszito_id = auth.uid()
    OR public.has_hr_write_access(ARRAY['admin', 'performance', 'employees']::text[], company_id)
    OR dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_teljesitmeny.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  )
  WITH CHECK (
    dolgozo_id = auth.uid()
    OR ertekeles_keszito_id = auth.uid()
    OR public.has_hr_write_access(ARRAY['admin', 'performance', 'employees']::text[], company_id)
    OR dolgozo_id IN (SELECT public.get_hr_subordinates(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = hr_teljesitmeny.dolgozo_id
        AND fp.kozvetlen_vezeto_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. Split all HR `FOR ALL` / write RLS policies into `SELECT` (`has_hr_module_access`)
--    and write (`has_hr_write_access`)
-- =============================================================================
DO $$
DECLARE
  r RECORD;
  v_read_pol_name text;
  v_new_qual text;
  v_new_with_check text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename LIKE 'hr_%'
      AND p.permissive = 'PERMISSIVE'
      AND p.cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND (
        (p.qual IS NOT NULL AND p.qual LIKE '%has_hr_module_access(%')
        OR (p.with_check IS NOT NULL AND p.with_check LIKE '%has_hr_module_access(%')
      )
  LOOP
    -- 4.a: If the policy is FOR ALL, ensure a companion FOR SELECT policy exists
    --      with `has_hr_module_access` so read-only viewers retain SELECT access!
    IF r.cmd = 'ALL' AND r.qual IS NOT NULL THEN
      v_read_pol_name := left(r.policyname, 55) || '_read';
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_read_pol_name, r.schemaname, r.tablename);
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR SELECT TO authenticated USING (%s)',
        v_read_pol_name,
        r.schemaname,
        r.tablename,
        r.qual
      );
    END IF;

    -- 4.b: Replace `has_hr_module_access(` with `has_hr_write_access(` on the write/ALL policy
    v_new_qual := NULL;
    v_new_with_check := NULL;

    IF r.qual IS NOT NULL THEN
      v_new_qual := replace(r.qual, 'has_hr_module_access(', 'has_hr_write_access(');
    END IF;

    IF r.with_check IS NOT NULL THEN
      v_new_with_check := replace(r.with_check, 'has_hr_module_access(', 'has_hr_write_access(');
    ELSIF r.cmd IN ('UPDATE', 'ALL') AND v_new_qual IS NOT NULL THEN
      v_new_with_check := v_new_qual;
    END IF;

    v_sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF v_new_qual IS NOT NULL AND r.cmd <> 'INSERT' THEN
      v_sql := v_sql || format(' USING (%s)', v_new_qual);
    END IF;
    IF v_new_with_check IS NOT NULL AND r.cmd IN ('INSERT', 'UPDATE', 'ALL') THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_new_with_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END $$;

-- Update `hr_dolgozoi_ajanlas_update` to use `has_hr_write_access`
DROP POLICY IF EXISTS "hr_dolgozoi_ajanlas_update" ON public.hr_dolgozoi_ajanlas;
CREATE POLICY "hr_dolgozoi_ajanlas_update"
  ON public.hr_dolgozoi_ajanlas
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.has_hr_write_access(ARRAY['admin', 'recruitment']::text[], company_id)
  )
  WITH CHECK (
    public.has_hr_write_access(ARRAY['admin', 'recruitment']::text[], company_id)
  );

-- Update `update_decrypted_hr_data` RPC to require `has_hr_write_access` for HR staff
CREATE OR REPLACE FUNCTION public.update_decrypted_hr_data(
  p_dolgozo_id    UUID,
  p_taj_szam      TEXT  DEFAULT NULL,
  p_adoazonosito  TEXT  DEFAULT NULL,
  p_bankszamla    TEXT  DEFAULT NULL,
  p_brutto_ber    TEXT  DEFAULT NULL,
  p_netto_ber     TEXT  DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
  v_is_hr BOOLEAN;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.hr_dolgozo_adatlap
  WHERE id = p_dolgozo_id;

  v_is_hr := public.has_hr_write_access(ARRAY['admin', 'payroll', 'onboarding']::text[], v_company_id);

  IF NOT (p_dolgozo_id = auth.uid() OR v_is_hr) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF (p_brutto_ber IS NOT NULL OR p_netto_ber IS NOT NULL) AND NOT v_is_hr THEN
    RAISE EXCEPTION 'Béradat módosítása csak HR/Admin/Bérügyi írási jogosultsággal engedélyezett';
  END IF;

  INSERT INTO public.hr_dolgozo_titkos_adat (
    dolgozo_id,
    taj_szam_titkositott,
    adoazonosito_titkositott,
    bankszamla_titkositott,
    brutto_ber_titkositott,
    netto_ber_titkositott
  )
  VALUES (
    p_dolgozo_id,
    CASE WHEN p_taj_szam     IS NOT NULL THEN decode(p_taj_szam, 'escape')     ELSE NULL END,
    CASE WHEN p_adoazonosito IS NOT NULL THEN decode(p_adoazonosito, 'escape') ELSE NULL END,
    CASE WHEN p_bankszamla   IS NOT NULL THEN decode(p_bankszamla, 'escape')   ELSE NULL END,
    CASE WHEN p_brutto_ber   IS NOT NULL THEN decode(p_brutto_ber, 'escape')   ELSE NULL END,
    CASE WHEN p_netto_ber    IS NOT NULL THEN decode(p_netto_ber, 'escape')    ELSE NULL END
  )
  ON CONFLICT (dolgozo_id) DO UPDATE SET
    taj_szam_titkositott     = CASE WHEN p_taj_szam     IS NOT NULL THEN decode(p_taj_szam, 'escape')     ELSE hr_dolgozo_titkos_adat.taj_szam_titkositott END,
    adoazonosito_titkositott = CASE WHEN p_adoazonosito IS NOT NULL THEN decode(p_adoazonosito, 'escape') ELSE hr_dolgozo_titkos_adat.adoazonosito_titkositott END,
    bankszamla_titkositott   = CASE WHEN p_bankszamla   IS NOT NULL THEN decode(p_bankszamla, 'escape')   ELSE hr_dolgozo_titkos_adat.bankszamla_titkositott END,
    brutto_ber_titkositott   = CASE WHEN p_brutto_ber   IS NOT NULL THEN decode(p_brutto_ber, 'escape')   ELSE hr_dolgozo_titkos_adat.brutto_ber_titkositott END,
    netto_ber_titkositott    = CASE WHEN p_netto_ber    IS NOT NULL THEN decode(p_netto_ber, 'escape')    ELSE hr_dolgozo_titkos_adat.netto_ber_titkositott END,
    updated_at               = now();

  INSERT INTO public.hr_esemeny_naplo (
    esemeny_tipus,
    entitas_tipus,
    entitas_id,
    felhasznalo_id,
    erintett_dolgozo_id,
    company_id,
    indoklas
  )
  VALUES (
    'hr_modositva',
    'hr_dolgozo_titkos_adat',
    p_dolgozo_id::text,
    auth.uid(),
    p_dolgozo_id,
    v_company_id,
    'Különleges/Titkos HR adat módosítása RPC-n keresztül'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- 5. Harden Docs RLS policies on `partner`, `feladat`, `ugy`, `selejtezes_csomag`,
--    `ugyirat_megjegyzes_csatolmany`, and `attach_irat_to_dossier_atomic`
-- =============================================================================

-- 5.1 `public.partner`
DROP POLICY IF EXISTS "Allow all operations for authenticated users on partner" ON public.partner;
DROP POLICY IF EXISTS "partner_select_company" ON public.partner;
DROP POLICY IF EXISTS "partner_write_company" ON public.partner;

CREATE POLICY "partner_select_company"
  ON public.partner
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_module_access(ARRAY['partners', 'inbox', 'dossiers', 'archive', 'audit']::text[], company_id, auth.uid())
    )
  );

CREATE POLICY "partner_write_company"
  ON public.partner
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['partners', 'inbox', 'dossiers']::text[], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['partners', 'inbox', 'dossiers']::text[], company_id, auth.uid())
    )
  );

-- 5.2 `public.feladat`
DROP POLICY IF EXISTS "Allow all operations for authenticated users on feladat" ON public.feladat;
DROP POLICY IF EXISTS "feladat_select_company" ON public.feladat;
DROP POLICY IF EXISTS "feladat_write_company" ON public.feladat;

CREATE POLICY "feladat_select_company"
  ON public.feladat
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      felelos_user_id = auth.uid()
      OR public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive', 'audit']::text[], company_id, auth.uid())
    )
  );

CREATE POLICY "feladat_write_company"
  ON public.feladat
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      felelos_user_id = auth.uid()
      OR public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['inbox', 'dossiers']::text[], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      felelos_user_id = auth.uid()
      OR public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['inbox', 'dossiers']::text[], company_id, auth.uid())
    )
  );

-- 5.3 `public.ugy`
DROP POLICY IF EXISTS "ugy_select_company" ON public.ugy;
DROP POLICY IF EXISTS "ugy_write_company" ON public.ugy;

CREATE POLICY "ugy_select_company"
  ON public.ugy
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IS NOT NULL
  );

CREATE POLICY "ugy_write_company"
  ON public.ugy
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive']::text[], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive']::text[], company_id, auth.uid())
    )
  );

-- 5.4 `public.selejtezes_csomag`
DROP POLICY IF EXISTS "Mindenki lathatja a csomagokat" ON public.selejtezes_csomag;
DROP POLICY IF EXISTS "Felhasznalok letrehozhatnak csomagot" ON public.selejtezes_csomag;
DROP POLICY IF EXISTS "Negy szem elve a frissitesnel" ON public.selejtezes_csomag;

CREATE POLICY "Mindenki lathatja a csomagokat"
  ON public.selejtezes_csomag
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_module_access(ARRAY['archive', 'audit']::text[], company_id, auth.uid())
    )
  );

CREATE POLICY "Felhasznalok letrehozhatnak csomagot"
  ON public.selejtezes_csomag
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = javaslattevo_user_id
    AND public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['archive']::text[], company_id, auth.uid())
    )
  );

CREATE POLICY "Negy szem elve a frissitesnel"
  ON public.selejtezes_csomag
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    statusz = 'jovahagyasra_var'::public.csomag_statusz
    AND (NOT public.is_negy_szem_elve_kotelezo() OR auth.uid() <> javaslattevo_user_id)
    AND public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['archive']::text[], company_id, auth.uid())
    )
  )
  WITH CHECK (
    statusz = ANY (ARRAY['jovahagyva'::public.csomag_statusz, 'elutasitva'::public.csomag_statusz])
    AND jovahagyo_user_id = auth.uid()
    AND public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['archive']::text[], company_id, auth.uid())
    )
  );

-- 5.5 `public.ugyirat_megjegyzes_csatolmany`
DROP POLICY IF EXISTS "Select megjegyzes_csatolmany if dossier visible" ON public.ugyirat_megjegyzes_csatolmany;
DROP POLICY IF EXISTS "Insert own megjegyzes_csatolmany" ON public.ugyirat_megjegyzes_csatolmany;
DROP POLICY IF EXISTS "Delete own megjegyzes_csatolmany" ON public.ugyirat_megjegyzes_csatolmany;

CREATE POLICY "Select megjegyzes_csatolmany if dossier visible"
  ON public.ugyirat_megjegyzes_csatolmany
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes_csatolmany.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IS NOT NULL
    )
  );

CREATE POLICY "Insert own megjegyzes_csatolmany"
  ON public.ugyirat_megjegyzes_csatolmany
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    feltoltotte_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes_csatolmany.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers']::text[], u.company_id, auth.uid())
        )
    )
  );

CREATE POLICY "Delete own megjegyzes_csatolmany"
  ON public.ugyirat_megjegyzes_csatolmany
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (
    feltoltotte_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes_csatolmany.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers']::text[], u.company_id, auth.uid())
        )
    )
  );

-- 5.6 `public.attach_irat_to_dossier_atomic` write-access check
CREATE OR REPLACE FUNCTION public.attach_irat_to_dossier_atomic(
  p_irat_id uuid,
  p_ugyirat_id uuid,
  p_user_id uuid,
  p_indoklas text DEFAULT NULL::text,
  p_ip_cim text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := COALESCE(auth.uid(), p_user_id);
  v_ugyirat RECORD;
  v_irat RECORD;
  v_eff_role TEXT;
  v_next_alszam INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nincs bejelentkezett felhasználó.');
  END IF;

  SELECT id, iktatoszam, ugy_id, company_id, statusz
  INTO v_ugyirat
  FROM public.ugyirat
  WHERE id = p_ugyirat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'A kiválasztott ügyirat nem található.');
  END IF;

  SELECT id, ugyirat_id, targy, company_id
  INTO v_irat
  FROM public.irat
  WHERE id = p_irat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'A beérkező irat nem található.');
  END IF;

  IF v_ugyirat.company_id IS DISTINCT FROM v_irat.company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Az irat és az ügyirat nem ugyanahhoz a vállalathoz tartozik!');
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.user_has_company_access(v_ugyirat.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nincs hozzáférésed az ügyirat vállalatához.');
  END IF;

  v_eff_role := public.get_effective_docs_role(v_ugyirat.company_id, v_caller_id);
  IF v_eff_role IS NULL OR (
    v_eff_role <> 'admin'
    AND NOT public.has_docs_write_access(ARRAY['inbox', 'dossiers']::text[], v_ugyirat.company_id, v_caller_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nincs írási jogosultságod az irat-összerendeléshez.');
  END IF;

  IF v_ugyirat.statusz::text IN ('irattarban', 'lezart', 'selejtezheto', 'selejtezett') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lezárt vagy irattározott ügyiratba nem csatolható új irat.');
  END IF;

  IF v_irat.ugyirat_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ezt az iratot már egy másik felhasználó vagy folyamat iktatta!');
  END IF;

  SELECT COALESCE(MAX(alszam), 0) + 1
  INTO v_next_alszam
  FROM public.irat
  WHERE ugyirat_id = p_ugyirat_id;

  UPDATE public.irat
  SET ugyirat_id = p_ugyirat_id,
      alszam = v_next_alszam
  WHERE id = p_irat_id;

  INSERT INTO public.irat_kapcsolat (
    irat_id,
    ugyirat_id,
    entitas_tipus,
    entitas_id,
    entitas_forras,
    kapcsolat_tipusa
  ) VALUES (
    p_irat_id,
    p_ugyirat_id,
    'szerzodes',
    p_ugyirat_id::text,
    'belso',
    'elozmeny'
  );

  INSERT INTO public.esemeny_naplo (
    entitas_tipus,
    entitas_id,
    company_id,
    esemeny_tipus,
    user_id,
    indoklas,
    ip_cim,
    user_agent
  ) VALUES (
    'irat',
    p_irat_id,
    v_ugyirat.company_id,
    'iktatva',
    v_caller_id,
    COALESCE(p_indoklas, concat('Előzmény-összerendeléssel csatolva a(z) ', v_ugyirat.iktatoszam, ' ügyirathoz (', v_next_alszam, '. alszám).')),
    p_ip_cim,
    p_user_agent
  );

  INSERT INTO public.ai_feladat_sor (irat_id, feladat_tipus, statusz)
  VALUES (p_irat_id, 'embedding', 'fuggoben')
  ON CONFLICT (irat_id, feladat_tipus)
  DO UPDATE SET statusz = 'fuggoben', kovetkezo_futtatas = NOW(), updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'iktatoszam', v_ugyirat.iktatoszam,
    'alszam', v_next_alszam,
    'ugyirat_id', p_ugyirat_id
  );
END;
$$;

-- =============================================================================
-- 6. Restore company-scoped `:<company_uuid>` check on `public.rendszer_beallitas`
-- =============================================================================
DROP POLICY IF EXISTS "Csak admin szerkesztheti a rendszerbeallitasokat" ON public.rendszer_beallitas;
CREATE POLICY "Csak admin szerkesztheti a rendszerbeallitasokat"
  ON public.rendszer_beallitas
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN (kulcs ~ ':[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'::text) THEN (
        public.user_has_company_access((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid)
        AND (
          public.get_effective_docs_role((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['settings']::text[], (substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid())
        )
      )
      ELSE (
        public.get_effective_docs_role(NULL, auth.uid()) = 'admin'
        OR public.has_docs_write_access(ARRAY['settings']::text[], NULL, auth.uid())
      )
    END
  )
  WITH CHECK (
    CASE
      WHEN (kulcs ~ ':[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'::text) THEN (
        public.user_has_company_access((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid)
        AND (
          public.get_effective_docs_role((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['settings']::text[], (substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid())
        )
      )
      ELSE (
        public.get_effective_docs_role(NULL, auth.uid()) = 'admin'
        OR public.has_docs_write_access(ARRAY['settings']::text[], NULL, auth.uid())
      )
    END
  );

-- =============================================================================
-- 7. Company-scoped RLS on `storage.objects` (`hr_reports` bucket)
-- =============================================================================
DROP POLICY IF EXISTS "Hr munkatarsak olvashatjak a reportokat" ON storage.objects;
DROP POLICY IF EXISTS "Hr munkatarsak feltolthetnek reportokat" ON storage.objects;
DROP POLICY IF EXISTS "Hr munkatarsak modosithatjak a reportokat" ON storage.objects;

CREATE POLICY "Hr munkatarsak olvashatjak a reportokat"
  ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'hr_reports'::text
    AND public.has_hr_module_access(
      ARRAY['admin', 'reports', 'payroll', 'compliance', 'auditor']::text[],
      CASE
        WHEN split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN split_part(name, '/', 1)::uuid
        ELSE NULL::uuid
      END
    )
  );

CREATE POLICY "Hr munkatarsak feltolthetnek reportokat"
  ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hr_reports'::text
    AND public.has_hr_write_access(
      ARRAY['admin', 'reports', 'payroll', 'compliance']::text[],
      CASE
        WHEN split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN split_part(name, '/', 1)::uuid
        ELSE NULL::uuid
      END
    )
  );

CREATE POLICY "Hr munkatarsak modosithatjak a reportokat"
  ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hr_reports'::text
    AND public.has_hr_write_access(
      ARRAY['admin', 'reports', 'payroll', 'compliance']::text[],
      CASE
        WHEN split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN split_part(name, '/', 1)::uuid
        ELSE NULL::uuid
      END
    )
  )
  WITH CHECK (
    bucket_id = 'hr_reports'::text
    AND public.has_hr_write_access(
      ARRAY['admin', 'reports', 'payroll', 'compliance']::text[],
      CASE
        WHEN split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN split_part(name, '/', 1)::uuid
        ELSE NULL::uuid
      END
    )
  );

COMMIT;

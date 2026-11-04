-- =============================================================================
-- Migration: 20261104000007_hr_role_precedence_and_admin_isolation.sql
-- Purpose:
--   Ensure that in `has_hr_module_access` and `has_hr_write_access`, an explicit
--   per-company `company_members.hr_szerepkor` (e.g. 'munkavallalo' or 'vezeto')
--   takes precedence over `company_members.role IN ('owner', 'admin')` (which may
--   be 'admin' solely because the user is a Docs admin in a dual-module company).
-- =============================================================================

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

    IF v_cm_hr_role IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
       OR (v_cm_hr_role IS NULL AND v_cm_role IN ('owner', 'admin'))
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
        (cm.hr_szerepkor IS NULL AND cm.role IN ('owner', 'admin'))
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

    IF v_cm_hr_role IN ('admin', 'hr_vezeto', 'rendszergazda')
       OR (v_cm_hr_role IS NULL AND v_cm_role IN ('owner', 'admin')) THEN
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

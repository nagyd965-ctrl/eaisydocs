-- =============================================================================
-- Migration: 20261104000002_docs_role_defaults_and_triggers_fix.sql
-- Scope: [Közös] / [Docs]
-- Description:
--   Updates column defaults on `felhasznalo_profil` (`docs_szerepkor` and `szerepkor`
--   from `'ugyintezo'` to `'munkavallalo'`) and updates `handle_new_user()`,
--   `join_company_by_token(text)`, and `admin_update_user_profile(...)` so newly
--   registered or invited users automatically receive the canonical `'munkavallalo'`
--   role and default `docs_modulok` (`['inbox', 'dossiers', 'archive', 'partners']`).
--   Does NOT drop legacy enum values so backward compatibility remains intact.
-- =============================================================================

-- 1. Update column defaults on felhasznalo_profil
ALTER TABLE public.felhasznalo_profil
  ALTER COLUMN docs_szerepkor SET DEFAULT 'munkavallalo'::public.docs_szerepkor_enum;

ALTER TABLE public.felhasznalo_profil
  ALTER COLUMN szerepkor SET DEFAULT 'munkavallalo'::public.user_szerepkor;

-- 2. Update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.felhasznalo_profil (
    id,
    nev,
    szerepkor,
    docs_szerepkor,
    docs_modulok,
    max_minosites
  )
  VALUES (
    new.id,
    new.email,
    'munkavallalo'::public.user_szerepkor,
    'munkavallalo'::public.docs_szerepkor_enum,
    ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
    'nyilt'::public.irat_minosites
  );
  RETURN new;
END;
$function$;

-- 3. Update join_company_by_token(p_share_token text)
CREATE OR REPLACE FUNCTION public.join_company_by_token(p_share_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_token_created_at timestamptz;
  v_company_created_at timestamptz;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nincs aktív bejelentkezett munkamenet.');
  END IF;

  IF p_share_token IS NULL OR btrim(p_share_token) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Érvénytelen vagy nem létező meghívókód.');
  END IF;

  SELECT id, name, share_token_created_at, created_at
  INTO v_company_id, v_company_name, v_token_created_at, v_company_created_at
  FROM public.companies
  WHERE share_token = btrim(p_share_token);

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Érvénytelen vagy nem létező meghívókód.');
  END IF;

  IF COALESCE(v_token_created_at, v_company_created_at) <= (now() - interval '7 days') THEN
    RETURN json_build_object('success', false, 'error', 'A meghívókód lejárt (7 nap után új kódot kell generálni).');
  END IF;

  INSERT INTO public.company_members (
    company_id,
    user_id,
    role,
    docs_szerepkor,
    docs_modulok,
    hr_szerepkor,
    hr_modulok
  )
  VALUES (
    v_company_id,
    v_user_id,
    'member',
    'munkavallalo',
    ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
    'munkavallalo',
    ARRAY[]::text[]
  )
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'company_id', v_company_id,
    'company_name', v_company_name
  );
END;
$function$;

-- 4. Update admin_update_user_profile to normalize role & modules
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id uuid,
  new_role public.user_szerepkor,
  new_minosites public.irat_minosites,
  new_department_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_global_sysadmin boolean := false;
  v_has_shared_admin_company boolean := false;
  v_target_company_count integer := 0;
  v_dept_company_id uuid := null;
  v_canonical_role text;
  v_default_modules text[];
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Nincs bejelentkezve!';
  END IF;

  IF target_user_id = v_caller_id AND new_role::text NOT IN ('rendszergazda', 'admin') THEN
    RAISE EXCEPTION 'Saját adminisztrátori jogosultságodat nem csökkentheted a rendszerből való kizáródás megelőzése érdekében!';
  END IF;

  v_canonical_role := CASE
    WHEN new_role::text IN ('admin', 'rendszergazda') THEN 'admin'
    WHEN new_role::text = 'vezeto' THEN 'vezeto'
    ELSE 'munkavallalo'
  END;

  v_default_modules := CASE
    WHEN v_canonical_role = 'admin' THEN ARRAY['inbox', 'dossiers', 'tasks', 'archive', 'partners', 'audit', 'rules', 'settings']::text[]
    WHEN v_canonical_role = 'vezeto' THEN ARRAY['inbox', 'dossiers', 'archive', 'partners', 'audit']::text[]
    ELSE ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[]
  END;

  SELECT EXISTS (
    SELECT 1
    FROM public.felhasznalo_profil fp
    WHERE fp.id = v_caller_id
      AND (
        fp.szerepkor::text IN ('admin', 'rendszergazda')
        OR fp.docs_szerepkor::text IN ('admin', 'rendszergazda')
      )
  ) INTO v_is_global_sysadmin;

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

  IF new_department_id IS NOT NULL THEN
    SELECT se.company_id
    INTO v_dept_company_id
    FROM public.szervezeti_egyseg se
    WHERE se.id = new_department_id;

    IF v_dept_company_id IS NOT NULL AND NOT public.user_has_company_access(v_dept_company_id) AND NOT v_is_global_sysadmin THEN
      RAISE EXCEPTION 'A megadott szervezeti egység egy másik vállalathoz tartozik!';
    END IF;
  END IF;

  UPDATE public.company_members cm_target
  SET
    docs_szerepkor = v_canonical_role,
    docs_modulok = v_default_modules
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
          OR public.has_hr_module_access(ARRAY['admin'], cm_caller.company_id)
          OR v_is_global_sysadmin
        )
    );

  SELECT COUNT(*)
  INTO v_target_company_count
  FROM public.company_members cm
  WHERE cm.user_id = target_user_id;

  IF v_target_company_count <= 1 OR v_is_global_sysadmin THEN
    UPDATE public.felhasznalo_profil
    SET
      szerepkor = v_canonical_role::public.user_szerepkor,
      docs_szerepkor = v_canonical_role::public.docs_szerepkor_enum,
      docs_modulok = v_default_modules,
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

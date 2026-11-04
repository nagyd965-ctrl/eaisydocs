-- =============================================================================
-- Migration: 20261104000003_narrow_docs_szerepkor_enum_cleanup.sql
-- Scope: [Közös] / [Docs]
-- Description:
--   Atomically narrows `public.docs_szerepkor_enum` to the 3 canonical roles:
--     ('munkavallalo', 'vezeto', 'admin')
--   by temporarily dropping dependent RLS policies and column default, swapping
--   the enum type, recreating `handle_new_user` and `admin_update_user_profile`
--   against the new enum OID, dropping `docs_szerepkor_enum_old`, and restoring
--   all 5 dependent RLS policies (`app_error_logs`, `irat_fajl`,
--   `rendszer_beallitas`, `storage.objects`).
-- =============================================================================

BEGIN;

-- 1. Drop the 5 RLS policies that depend on column felhasznalo_profil.docs_szerepkor
DROP POLICY IF EXISTS "app_error_logs_select_superadmin" ON public.app_error_logs;
DROP POLICY IF EXISTS "app_error_logs_delete_superadmin" ON public.app_error_logs;
DROP POLICY IF EXISTS "Irat fajl megtekintes szigoru ABAC" ON public.irat_fajl;
DROP POLICY IF EXISTS "Csak admin szerkesztheti a rendszerbeallitasokat" ON public.rendszer_beallitas;
DROP POLICY IF EXISTS "irat_files_insert_write_roles" ON storage.objects;

-- 2. Drop column default on felhasznalo_profil.docs_szerepkor
ALTER TABLE public.felhasznalo_profil
  ALTER COLUMN docs_szerepkor DROP DEFAULT;

-- 3. Rename old enum and create the clean 3-value enum
ALTER TYPE public.docs_szerepkor_enum RENAME TO docs_szerepkor_enum_old;

CREATE TYPE public.docs_szerepkor_enum AS ENUM (
  'munkavallalo',
  'vezeto',
  'admin'
);

-- 4. Convert felhasznalo_profil.docs_szerepkor column to the new enum
ALTER TABLE public.felhasznalo_profil
  ALTER COLUMN docs_szerepkor TYPE public.docs_szerepkor_enum
  USING (
    CASE
      WHEN docs_szerepkor::text IN ('admin', 'rendszergazda') THEN 'admin'::public.docs_szerepkor_enum
      WHEN docs_szerepkor::text = 'vezeto' THEN 'vezeto'::public.docs_szerepkor_enum
      ELSE 'munkavallalo'::public.docs_szerepkor_enum
    END
  );

-- 5. Restore column default
ALTER TABLE public.felhasznalo_profil
  ALTER COLUMN docs_szerepkor SET DEFAULT 'munkavallalo'::public.docs_szerepkor_enum;

-- 6. Recreate handle_new_user() and admin_update_user_profile() to bind to the new enum OID
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
        OR fp.docs_szerepkor = 'admin'::public.docs_szerepkor_enum
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

-- 7. Drop the old enum type
DROP TYPE public.docs_szerepkor_enum_old;

-- 8. Recreate the 5 RLS policies using the new 3-value docs_szerepkor_enum
CREATE POLICY "app_error_logs_select_superadmin"
  ON public.app_error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = (SELECT auth.uid() AS uid)
        AND (
          fp.szerepkor = ANY (ARRAY['admin'::public.user_szerepkor, 'rendszergazda'::public.user_szerepkor])
          OR fp.docs_szerepkor = 'admin'::public.docs_szerepkor_enum
          OR fp.hr_szerepkor = ANY (ARRAY['admin'::public.hr_szerepkor_enum, 'rendszergazda'::public.hr_szerepkor_enum])
        )
    )
  );

CREATE POLICY "app_error_logs_delete_superadmin"
  ON public.app_error_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = (SELECT auth.uid() AS uid)
        AND (
          fp.szerepkor = ANY (ARRAY['admin'::public.user_szerepkor, 'rendszergazda'::public.user_szerepkor])
          OR fp.docs_szerepkor = 'admin'::public.docs_szerepkor_enum
          OR fp.hr_szerepkor = ANY (ARRAY['admin'::public.hr_szerepkor_enum, 'rendszergazda'::public.hr_szerepkor_enum])
        )
    )
  );

CREATE POLICY "Irat fajl megtekintes szigoru ABAC"
  ON public.irat_fajl
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND public.check_irat_fajl_access(
          irat_fajl.irat_id,
          fp.id,
          (fp.docs_szerepkor)::text,
          fp.max_minosites,
          fp.szervezeti_egyseg_id
        )
    )
  );

CREATE POLICY "Csak admin szerkesztheti a rendszerbeallitasokat"
  ON public.rendszer_beallitas
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN (kulcs ~ ':[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'::text) THEN (
        public.user_has_company_access((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid)
        AND (
          public.get_effective_docs_role((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid()) = 'admin'
          OR public.has_docs_module_access(ARRAY['settings'], (substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid())
        )
      )
      ELSE (
        EXISTS (
          SELECT 1
          FROM public.felhasznalo_profil fp
          WHERE fp.id = auth.uid()
            AND (
              (fp.szerepkor)::text IN ('admin', 'rendszergazda')
              OR fp.docs_szerepkor = 'admin'::public.docs_szerepkor_enum
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.user_id = auth.uid()
            AND public.get_effective_docs_role(cm.company_id, auth.uid()) = 'admin'
        )
      )
    END
  )
  WITH CHECK (
    CASE
      WHEN (kulcs ~ ':[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'::text) THEN (
        public.user_has_company_access((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid)
        AND (
          public.get_effective_docs_role((substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid()) = 'admin'
          OR public.has_docs_module_access(ARRAY['settings'], (substring(kulcs, ':([0-9a-fA-F-]{36})$'::text))::uuid, auth.uid())
        )
      )
      ELSE (
        EXISTS (
          SELECT 1
          FROM public.felhasznalo_profil fp
          WHERE fp.id = auth.uid()
            AND (
              (fp.szerepkor)::text IN ('admin', 'rendszergazda')
              OR fp.docs_szerepkor = 'admin'::public.docs_szerepkor_enum
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.user_id = auth.uid()
            AND public.get_effective_docs_role(cm.company_id, auth.uid()) = 'admin'
        )
      )
    END
  );

CREATE POLICY "irat_files_insert_write_roles"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'irat_files'::text
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.user_id = auth.uid()
          AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'vezeto', 'munkavallalo')
      )
      OR EXISTS (
        SELECT 1
        FROM public.felhasznalo_profil fp
        WHERE fp.id = auth.uid()
          AND fp.docs_szerepkor IN (
            'admin'::public.docs_szerepkor_enum,
            'vezeto'::public.docs_szerepkor_enum,
            'munkavallalo'::public.docs_szerepkor_enum
          )
      )
    )
  );

COMMIT;

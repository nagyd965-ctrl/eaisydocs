-- =============================================================================
-- Migration: 20261103000002_final_audit_closures.sql
-- Scope: [Közös] / [Docs] / [HR]
-- Purpose (7. CSOMAG — 31, 32, 34, 35. pont):
--   1. 31. pont (J-27b): Update `public.get_effective_docs_role` (and
--      `check_ugyirat_user_access` / `check_irat_fajl_access`) to enforce
--      `'docs' = ANY(COALESCE(fp.elerheto_modulok, ARRAY['docs']))`, returning
--      NULL when a user only has access to eaisyHR (`['hr']`).
--   2. 32. pont (J-9): Tighten `public.rendszer_beallitas` RLS policy so keys
--      suffixed with `:<company_uuid>` require `admin`/`rendszergazda` role
--      within that exact company.
--   3. 34. pont (J-13): Enforce 7-day TTL (`share_token_created_at > now() - interval '7 days'`)
--      in `public.join_company_by_token(p_share_token text)`.
--   4. 35. pont (J-37): Add `company_id` and `modul` ('docs' | 'hr') columns to
--      `public.alkalmazas_ertesites`, backfill existing rows, and index.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 31. pont (J-27b): `get_effective_docs_role` with `elerheto_modulok` check
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_docs_role(
  p_company_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cm_role text;
  v_cm_docs_role text;
  v_global_docs_role text;
  v_global_sys_role text;
  v_has_docs_module boolean := true;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    fp.docs_szerepkor::text,
    fp.szerepkor::text,
    ('docs' = ANY(COALESCE(fp.elerheto_modulok, ARRAY['docs'])))
  INTO
    v_global_docs_role,
    v_global_sys_role,
    v_has_docs_module
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  -- Ha a felhasználónak nincs 'docs' modulja (és nem globális rendszergazda), nincs Docs szerepköre
  IF COALESCE(v_has_docs_module, false) = false
     AND COALESCE(v_global_sys_role, '') <> 'rendszergazda' THEN
    RETURN NULL;
  END IF;

  IF v_global_sys_role = 'rendszergazda' OR v_global_docs_role = 'rendszergazda' THEN
    IF p_company_id IS NOT NULL THEN
      SELECT cm.role, cm.docs_szerepkor::text
      INTO v_cm_role, v_cm_docs_role
      FROM public.company_members cm
      WHERE cm.company_id = p_company_id
        AND cm.user_id = p_user_id
      LIMIT 1;

      IF FOUND THEN
        IF v_cm_docs_role IS NOT NULL AND btrim(v_cm_docs_role) <> '' THEN
          RETURN v_cm_docs_role;
        END IF;
        IF v_cm_role IN ('owner', 'admin') THEN
          RETURN 'admin';
        END IF;
        RETURN 'ugyintezo';
      END IF;
    END IF;
    RETURN 'rendszergazda';
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT cm.role, cm.docs_szerepkor::text
    INTO v_cm_role, v_cm_docs_role
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF FOUND THEN
      IF v_cm_docs_role IS NOT NULL AND btrim(v_cm_docs_role) <> '' THEN
        RETURN v_cm_docs_role;
      END IF;
      IF v_cm_role IN ('owner', 'admin') THEN
        RETURN 'admin';
      END IF;
      IF v_global_docs_role IN ('admin', 'rendszergazda') THEN
        RETURN 'ugyintezo';
      END IF;
      RETURN COALESCE(v_global_docs_role, 'ugyintezo');
    END IF;
  END IF;

  RETURN COALESCE(v_global_docs_role, 'betekinto');
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_ugyirat_user_access(
  p_ugyirat_id uuid,
  p_user_id uuid,
  p_user_dept uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.ugyirat u
    LEFT JOIN public.ugy ug ON ug.id = u.ugy_id
    WHERE u.id = p_ugyirat_id
      AND public.user_has_company_access(u.company_id)
      AND public.get_effective_docs_role(u.company_id, p_user_id) IS NOT NULL
      AND (
        ug.felelos_user_id = p_user_id
        OR (p_user_dept IS NOT NULL AND u.szervezeti_egyseg_id = p_user_dept)
        OR EXISTS (
          SELECT 1 FROM public.ugyirat_hozzaferes uh
          WHERE uh.ugyirat_id = u.id AND uh.user_id = p_user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.helyettesites h
          LEFT JOIN public.felhasznalo_profil fp_kilepo ON fp_kilepo.id = h.kilepo_user_id
          WHERE h.helyettesito_user_id = p_user_id
            AND h.aktiv = true
            AND (h.company_id IS NULL OR h.company_id = u.company_id)
            AND now() BETWEEN h.mettol AND h.meddig
            AND (
              ug.felelos_user_id = h.kilepo_user_id
              OR (fp_kilepo.szervezeti_egyseg_id IS NOT NULL AND u.szervezeti_egyseg_id = fp_kilepo.szervezeti_egyseg_id)
            )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.check_irat_fajl_access(
  p_irat_id uuid,
  p_user_id uuid,
  p_user_role text,
  p_max_minosites public.irat_minosites,
  p_user_dept uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.irat i
    WHERE i.id = p_irat_id
      AND public.user_has_company_access(i.company_id)
      AND public.get_effective_docs_role(i.company_id, p_user_id) IS NOT NULL
      AND (
        public.get_effective_docs_role(i.company_id, p_user_id) IN ('admin', 'rendszergazda')
        OR i.minosites <= p_max_minosites
      )
      AND (
        public.get_effective_docs_role(i.company_id, p_user_id) IN ('admin', 'rendszergazda', 'iktato', 'auditor')
        OR i.ugyirat_id IS NULL
        OR public.check_ugyirat_user_access(i.ugyirat_id, p_user_id, p_user_dept)
      )
  );
$function$;

-- -----------------------------------------------------------------------------
-- 2. 32. pont (J-9): Tighten `public.rendszer_beallitas` RLS policy for `:<company_id>` keys
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Csak admin szerkesztheti a rendszerbeallitasokat" ON public.rendszer_beallitas;
CREATE POLICY "Csak admin szerkesztheti a rendszerbeallitasokat"
  ON public.rendszer_beallitas
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN kulcs ~ ':[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        public.user_has_company_access((substring(kulcs from ':([0-9a-fA-F-]{36})$'))::uuid)
        AND public.get_effective_docs_role((substring(kulcs from ':([0-9a-fA-F-]{36})$'))::uuid, auth.uid()) IN ('admin', 'rendszergazda')
      ELSE
        EXISTS (
          SELECT 1
          FROM public.felhasznalo_profil fp
          WHERE fp.id = auth.uid()
            AND (fp.szerepkor::text = 'rendszergazda' OR fp.docs_szerepkor::text = 'rendszergazda')
        )
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.user_id = auth.uid()
            AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'rendszergazda')
        )
    END
  )
  WITH CHECK (
    CASE
      WHEN kulcs ~ ':[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        public.user_has_company_access((substring(kulcs from ':([0-9a-fA-F-]{36})$'))::uuid)
        AND public.get_effective_docs_role((substring(kulcs from ':([0-9a-fA-F-]{36})$'))::uuid, auth.uid()) IN ('admin', 'rendszergazda')
      ELSE
        EXISTS (
          SELECT 1
          FROM public.felhasznalo_profil fp
          WHERE fp.id = auth.uid()
            AND (fp.szerepkor::text = 'rendszergazda' OR fp.docs_szerepkor::text = 'rendszergazda')
        )
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.user_id = auth.uid()
            AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'rendszergazda')
        )
    END
  );

-- -----------------------------------------------------------------------------
-- 3. 34. pont (J-13): `join_company_by_token` with 7-day TTL check
-- -----------------------------------------------------------------------------
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

  INSERT INTO public.company_members (company_id, user_id, role, docs_szerepkor, hr_szerepkor)
  VALUES (v_company_id, v_user_id, 'member', 'ugyintezo', 'munkavallalo')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'company_id', v_company_id,
    'company_name', v_company_name
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. 35. pont (J-37): `alkalmazas_ertesites` company_id & modul separation
-- -----------------------------------------------------------------------------
ALTER TABLE public.alkalmazas_ertesites
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.alkalmazas_ertesites
  ADD COLUMN IF NOT EXISTS modul text NOT NULL DEFAULT 'docs';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alkalmazas_ertesites_modul_check'
      AND conrelid = 'public.alkalmazas_ertesites'::regclass
  ) THEN
    ALTER TABLE public.alkalmazas_ertesites
      ADD CONSTRAINT alkalmazas_ertesites_modul_check CHECK (modul IN ('docs', 'hr'));
  END IF;
END;
$$;

-- Backfill `modul = 'hr'` for historical HR notifications
UPDATE public.alkalmazas_ertesites
SET modul = 'hr'
WHERE modul = 'docs'
  AND (
    lower(COALESCE(link_url, '')) LIKE '/hr%'
    OR lower(COALESCE(cim, '')) LIKE '%orvosi%'
    OR lower(COALESCE(cim, '')) LIKE '%próbaidő%'
    OR lower(COALESCE(cim, '')) LIKE '%probaido%'
    OR lower(COALESCE(cim, '')) LIKE '%születésnap%'
    OR lower(COALESCE(cim, '')) LIKE '%szabadság%'
    OR lower(COALESCE(cim, '')) LIKE '%távollét%'
    OR lower(COALESCE(cim, '')) LIKE '%t1041%'
    OR lower(COALESCE(cim, '')) LIKE '%munkaszerződés%'
    OR lower(COALESCE(cim, '')) LIKE '%tanulmányi szerződés%'
    OR lower(COALESCE(szoveg, '')) LIKE '%eaisyhr%'
  );

-- Backfill `company_id` from linked dossier, user profile, or default company
UPDATE public.alkalmazas_ertesites ae
SET company_id = u.company_id
FROM public.ugyirat u
WHERE ae.company_id IS NULL
  AND ae.link_url ~ '^/dossiers/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
  AND u.id = (substring(ae.link_url from '^/dossiers/([0-9a-fA-F-]{36})'))::uuid;

UPDATE public.alkalmazas_ertesites ae
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = ae.user_id
  ORDER BY cm.created_at ASC
  LIMIT 1
)
WHERE ae.company_id IS NULL;

UPDATE public.alkalmazas_ertesites
SET company_id = public.get_default_company_id()
WHERE company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_alkalmazas_ertesites_user_company_modul
  ON public.alkalmazas_ertesites (user_id, company_id, modul, olvasott, created_at DESC);

DROP POLICY IF EXISTS "Sajat ertesitesek lekerdezese" ON public.alkalmazas_ertesites;
CREATE POLICY "Sajat ertesitesek lekerdezese"
  ON public.alkalmazas_ertesites
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (company_id IS NULL OR public.user_has_company_access(company_id))
  );

-- -----------------------------------------------------------------------------
-- 5. Self-verifying DO block
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_docs_role_has_modul_check boolean;
  v_join_token_has_ttl boolean;
  v_notif_cols_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'get_effective_docs_role'
      AND prosrc ILIKE '%elerheto_modulok%'
  ) INTO v_docs_role_has_modul_check;

  IF NOT v_docs_role_has_modul_check THEN
    RAISE EXCEPTION 'Self-check failed: get_effective_docs_role does not check elerheto_modulok!';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'join_company_by_token'
      AND prosrc ILIKE '%7 days%'
  ) INTO v_join_token_has_ttl;

  IF NOT v_join_token_has_ttl THEN
    RAISE EXCEPTION 'Self-check failed: join_company_by_token does not enforce 7 days TTL!';
  END IF;

  SELECT count(*) INTO v_notif_cols_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'alkalmazas_ertesites'
    AND column_name IN ('company_id', 'modul');

  IF v_notif_cols_count < 2 THEN
    RAISE EXCEPTION 'Self-check failed: alkalmazas_ertesites missing company_id or modul column!';
  END IF;
END;
$$;

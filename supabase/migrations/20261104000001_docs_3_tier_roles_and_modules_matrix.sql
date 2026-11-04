-- =============================================================================
-- Migration: 20261104000001_docs_3_tier_roles_and_modules_matrix.sql
-- Scope: [Közös] / [Docs]
-- Purpose:
--   1. Align eaisyDocs role management with eaisyHR's 3-tier core role model:
--      - 'admin'        (Admin)
--      - 'vezeto'       (Vezető)
--      - 'munkavallalo' (Munkavállaló)
--   2. Add `docs_modulok text[]` column to `public.company_members` and
--      `public.felhasznalo_profil` to store per-company and global toggleable
--      eaisyDocs module permissions:
--      - 'inbox'    (Bejövő sor & Iktatás)
--      - 'dossiers' (Iktatókönyv)
--      - 'archive'  (Irattár & Selejtezés)
--      - 'partners' (Partnerek & Szerződések)
--      - 'rules'    (Szabályok & Automatizmusok)
--      - 'settings' (Szervezeti Egységek & Cégbeállítások)
--      - 'audit'    (Eseménynapló)
--   3. Migrate legacy 7-role values ('rendszergazda', 'iktato', 'ugyintezo',
--      'betekinto', 'auditor') to the 3 core roles while preserving exact
--      capabilities in `docs_modulok`.
--   4. Create `public.has_docs_module_access(p_modules text[], p_company_id uuid, p_user_id uuid)`
--      and update `public.get_effective_docs_role`, `check_ugyirat_user_access`,
--      `check_irat_fajl_access`, and Docs RLS policies to support `'munkavallalo'`
--      and module-based permissions.
-- =============================================================================

-- 1. Ensure enum `public.felhasznalo_szerepkor` and `public.docs_szerepkor_enum` include 'munkavallalo' and 'admin'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'felhasznalo_szerepkor') THEN
    BEGIN
      ALTER TYPE public.felhasznalo_szerepkor ADD VALUE IF NOT EXISTS 'munkavallalo';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.felhasznalo_szerepkor ADD VALUE IF NOT EXISTS 'admin';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'docs_szerepkor_enum') THEN
    BEGIN
      ALTER TYPE public.docs_szerepkor_enum ADD VALUE IF NOT EXISTS 'munkavallalo';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.docs_szerepkor_enum ADD VALUE IF NOT EXISTS 'admin';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. Add `docs_modulok text[]` to `public.company_members` and `public.felhasznalo_profil`
ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS docs_modulok text[] NOT NULL DEFAULT ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[];

ALTER TABLE public.felhasznalo_profil
  ADD COLUMN IF NOT EXISTS docs_modulok text[] NOT NULL DEFAULT ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[];

-- 3. Backfill `docs_modulok` and normalize `docs_szerepkor` in `public.company_members`
UPDATE public.company_members
SET
  docs_modulok = CASE
    WHEN role IN ('owner', 'admin') OR docs_szerepkor::text IN ('admin', 'rendszergazda') THEN
      ARRAY['inbox', 'dossiers', 'archive', 'partners', 'rules', 'settings', 'audit']::text[]
    WHEN docs_szerepkor::text = 'vezeto' THEN
      ARRAY['inbox', 'dossiers', 'archive', 'partners', 'audit']::text[]
    WHEN docs_szerepkor::text = 'iktato' THEN
      ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[]
    WHEN docs_szerepkor::text = 'auditor' THEN
      ARRAY['inbox', 'dossiers', 'archive', 'audit']::text[]
    WHEN docs_szerepkor::text = 'betekinto' THEN
      ARRAY['dossiers', 'archive']::text[]
    ELSE
      ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[]
  END,
  docs_szerepkor = CASE
    WHEN role IN ('owner', 'admin') OR docs_szerepkor::text IN ('admin', 'rendszergazda') THEN 'admin'
    WHEN docs_szerepkor::text = 'vezeto' THEN 'vezeto'
    ELSE 'munkavallalo'
  END;

-- 4. Backfill `docs_modulok` and normalize `docs_szerepkor` in `public.felhasznalo_profil`
UPDATE public.felhasznalo_profil
SET
  docs_modulok = CASE
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) IN ('admin', 'rendszergazda') THEN
      ARRAY['inbox', 'dossiers', 'archive', 'partners', 'rules', 'settings', 'audit']::text[]
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) = 'vezeto' THEN
      ARRAY['inbox', 'dossiers', 'archive', 'partners', 'audit']::text[]
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) = 'iktato' THEN
      ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[]
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) = 'auditor' THEN
      ARRAY['inbox', 'dossiers', 'archive', 'audit']::text[]
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) = 'betekinto' THEN
      ARRAY['dossiers', 'archive']::text[]
    ELSE
      ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[]
  END,
  docs_szerepkor = (CASE
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) IN ('admin', 'rendszergazda') THEN 'admin'
    WHEN COALESCE(docs_szerepkor::text, szerepkor::text) = 'vezeto' THEN 'vezeto'
    ELSE 'munkavallalo'
  END)::public.docs_szerepkor_enum;

-- 5. Update `public.get_effective_docs_role(p_company_id, p_user_id)`
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
  v_raw_role text;
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

  IF COALESCE(v_has_docs_module, false) = false
     AND COALESCE(v_global_sys_role, '') <> 'rendszergazda' THEN
    RETURN NULL;
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
  END IF;

  IF v_global_sys_role = 'rendszergazda' OR v_global_docs_role IN ('admin', 'rendszergazda') THEN
    RETURN 'admin';
  ELSIF v_global_docs_role = 'vezeto' THEN
    RETURN 'vezeto';
  END IF;

  RETURN 'munkavallalo';
END;
$function$;

-- 6. Create `public.has_docs_module_access(p_modules, p_company_id, p_user_id)`
CREATE OR REPLACE FUNCTION public.has_docs_module_access(
  p_modules text[],
  p_company_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    IF FOUND AND v_cm_modules IS NOT NULL THEN
      RETURN v_cm_modules && p_modules;
    END IF;
  END IF;

  SELECT fp.docs_modulok
  INTO v_fp_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  RETURN COALESCE(v_fp_modules, ARRAY[]::text[]) && p_modules;
END;
$function$;

-- 7. Update `check_irat_fajl_access` and `attach_irat_to_dossier_atomic` to support 3-tier roles + modules
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
        OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive', 'audit'], i.company_id, p_user_id)
        OR i.ugyirat_id IS NULL
        OR public.check_ugyirat_user_access(i.ugyirat_id, p_user_id, p_user_dept)
      )
  );
$function$;

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
SET search_path TO 'public'
AS $function$
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
    v_eff_role NOT IN ('admin', 'rendszergazda', 'vezeto', 'iktato', 'ugyintezo', 'munkavallalo')
    AND NOT public.has_docs_module_access(ARRAY['inbox', 'dossiers'], v_ugyirat.company_id, v_caller_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nincs jogosultságod az irat-összerendeléshez.');
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
$function$;

-- 8. Update Docs RLS policies to recognize 'munkavallalo' + `has_docs_module_access`
DROP POLICY IF EXISTS "Ugyirat megtekintes szigoru ABAC" ON public.ugyirat;
CREATE POLICY "Ugyirat megtekintes szigoru ABAC"
  ON public.ugyirat
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (
          public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('admin', 'rendszergazda')
          OR NOT public.check_ugyirat_has_unauthorized_irat(ugyirat.id, fp.max_minosites)
        )
        AND (
          public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato', 'auditor')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive', 'audit'], ugyirat.company_id, fp.id)
          OR public.check_ugyirat_user_access(ugyirat.id, fp.id, fp.szervezeti_egyseg_id)
        )
    )
  );

DROP POLICY IF EXISTS "Ugyirat szerkesztes szigoru ABAC" ON public.ugyirat;
CREATE POLICY "Ugyirat szerkesztes szigoru ABAC"
  ON public.ugyirat
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (
          public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('admin', 'rendszergazda')
          OR NOT public.check_ugyirat_has_unauthorized_irat(ugyirat.id, fp.max_minosites)
        )
        AND (
          public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive'], ugyirat.company_id, fp.id)
          OR (
            public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('vezeto', 'ugyintezo', 'munkavallalo')
            AND public.check_ugyirat_user_access(ugyirat.id, fp.id, fp.szervezeti_egyseg_id)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (
          public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive'], ugyirat.company_id, fp.id)
          OR (
            public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('vezeto', 'ugyintezo', 'munkavallalo')
            AND (
              ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id
              OR public.check_ugyirat_user_access(ugyirat.id, fp.id, fp.szervezeti_egyseg_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Irat megtekintes szigoru ABAC" ON public.irat;
CREATE POLICY "Irat megtekintes szigoru ABAC"
  ON public.irat
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (
          public.get_effective_docs_role(irat.company_id, fp.id) IN ('admin', 'rendszergazda')
          OR irat.minosites <= fp.max_minosites
        )
        AND (
          public.get_effective_docs_role(irat.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato', 'auditor')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive', 'audit'], irat.company_id, fp.id)
          OR irat.ugyirat_id IS NULL
          OR public.check_ugyirat_user_access(irat.ugyirat_id, fp.id, fp.szervezeti_egyseg_id)
        )
    )
  );

DROP POLICY IF EXISTS "Irat szerkesztes szigoru ABAC" ON public.irat;
CREATE POLICY "Irat szerkesztes szigoru ABAC"
  ON public.irat
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (
          public.get_effective_docs_role(irat.company_id, fp.id) IN ('admin', 'rendszergazda')
          OR irat.minosites <= fp.max_minosites
        )
        AND (
          public.get_effective_docs_role(irat.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive'], irat.company_id, fp.id)
          OR (
            public.get_effective_docs_role(irat.company_id, fp.id) IN ('vezeto', 'ugyintezo', 'munkavallalo')
            AND (
              irat.ugyirat_id IS NULL
              OR public.check_ugyirat_user_access(irat.ugyirat_id, fp.id, fp.szervezeti_egyseg_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Irat fajl szerkesztes szigoru ABAC" ON public.irat_fajl;
CREATE POLICY "Irat fajl szerkesztes szigoru ABAC"
  ON public.irat_fajl
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      JOIN public.irat i ON i.id = irat_fajl.irat_id
      WHERE fp.id = auth.uid()
        AND public.get_effective_docs_role(i.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
        AND public.check_irat_fajl_access(irat_fajl.irat_id, fp.id, public.get_effective_docs_role(i.company_id, fp.id), fp.max_minosites, fp.szervezeti_egyseg_id)
    )
  );

DROP POLICY IF EXISTS "partner_kapcsolattarto_write_company" ON public.partner_kapcsolattarto;
CREATE POLICY "partner_kapcsolattarto_write_company"
  ON public.partner_kapcsolattarto
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner p
      WHERE p.id = partner_kapcsolattarto.partner_id
        AND public.user_has_company_access(p.company_id)
        AND (
          public.get_effective_docs_role(p.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
          OR public.has_docs_module_access(ARRAY['partners'], p.company_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner p
      WHERE p.id = partner_kapcsolattarto.partner_id
        AND public.user_has_company_access(p.company_id)
        AND (
          public.get_effective_docs_role(p.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
          OR public.has_docs_module_access(ARRAY['partners'], p.company_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "ugyirat_megjegyzes_insert_company" ON public.ugyirat_megjegyzes;
CREATE POLICY "ugyirat_megjegyzes_insert_company"
  ON public.ugyirat_megjegyzes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    )
  );

DROP POLICY IF EXISTS "irat_kapcsolat_write_company" ON public.irat_kapcsolat;
CREATE POLICY "irat_kapcsolat_write_company"
  ON public.irat_kapcsolat
  FOR ALL
  TO authenticated
  USING (
    (irat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.irat i
      WHERE i.id = irat_kapcsolat.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u
      WHERE u.id = irat_kapcsolat.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    ))
  )
  WITH CHECK (
    (irat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.irat i
      WHERE i.id = irat_kapcsolat.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u
      WHERE u.id = irat_kapcsolat.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    ))
  );

DROP POLICY IF EXISTS "ugyirat_hozzaferes_write_company" ON public.ugyirat_hozzaferes;
CREATE POLICY "ugyirat_hozzaferes_write_company"
  ON public.ugyirat_hozzaferes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_hozzaferes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers'], u.company_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_hozzaferes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
          OR public.has_docs_module_access(ARRAY['inbox', 'dossiers'], u.company_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "irat_kolcsonzes_write_company" ON public.irat_kolcsonzes_naplo;
CREATE POLICY "irat_kolcsonzes_write_company"
  ON public.irat_kolcsonzes_naplo
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = irat_kolcsonzes_naplo.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = irat_kolcsonzes_naplo.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    )
  );

DROP POLICY IF EXISTS "Fizikai hely szerkesztese" ON public.irat_fizikai_hely;
CREATE POLICY "Fizikai hely szerkesztese"
  ON public.irat_fizikai_hely
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('iktato', 'admin', 'rendszergazda', 'vezeto', 'ugyintezo', 'munkavallalo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('iktato', 'admin', 'rendszergazda', 'vezeto', 'ugyintezo', 'munkavallalo')
  );

DROP POLICY IF EXISTS "iktatoszam_allokacio_company_access" ON public.iktatoszam_allokacio;
CREATE POLICY "iktatoszam_allokacio_company_access"
  ON public.iktatoszam_allokacio
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  );

DROP POLICY IF EXISTS "ugyszam_allokacio_company_access" ON public.ugyszam_allokacio;
CREATE POLICY "ugyszam_allokacio_company_access"
  ON public.ugyszam_allokacio
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  );

DROP POLICY IF EXISTS "erkeztetoszam_allokacio_company_access" ON public.erkeztetoszam_allokacio;
CREATE POLICY "erkeztetoszam_allokacio_company_access"
  ON public.erkeztetoszam_allokacio
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  );

DROP POLICY IF EXISTS "selejtezes_tetel_write_company" ON public.selejtezes_tetel;
CREATE POLICY "selejtezes_tetel_write_company"
  ON public.selejtezes_tetel
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.selejtezes_csomag sc
      WHERE sc.id = selejtezes_tetel.csomag_id
        AND public.user_has_company_access(sc.company_id)
        AND (
          public.get_effective_docs_role(sc.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
          OR public.has_docs_module_access(ARRAY['archive'], sc.company_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.selejtezes_csomag sc
      WHERE sc.id = selejtezes_tetel.csomag_id
        AND public.user_has_company_access(sc.company_id)
        AND (
          public.get_effective_docs_role(sc.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
          OR public.has_docs_module_access(ARRAY['archive'], sc.company_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "ai_feladat_sor_write_company" ON public.ai_feladat_sor;
CREATE POLICY "ai_feladat_sor_write_company"
  ON public.ai_feladat_sor
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = ai_feladat_sor.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = ai_feladat_sor.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
    )
  );

DROP POLICY IF EXISTS "company_filing_rules_write" ON public.company_filing_rules;
CREATE POLICY "company_filing_rules_write"
  ON public.company_filing_rules
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
      OR public.has_docs_module_access(ARRAY['rules'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
      OR public.has_docs_module_access(ARRAY['rules'], company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "ugy_write_company" ON public.ugy;
CREATE POLICY "ugy_write_company"
  ON public.ugy
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
  );

DROP POLICY IF EXISTS "irattari_terv_write_company" ON public.irattari_terv;
CREATE POLICY "irattari_terv_write_company"
  ON public.irattari_terv
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
      OR public.has_docs_module_access(ARRAY['settings', 'archive'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
      OR public.has_docs_module_access(ARRAY['settings', 'archive'], company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Szervezeti egysegek kezelese" ON public.szervezeti_egyseg;
CREATE POLICY "Szervezeti egysegek kezelese"
  ON public.szervezeti_egyseg
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
      OR public.has_docs_module_access(ARRAY['settings'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
      OR public.has_docs_module_access(ARRAY['settings'], company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "irat_files_insert_write_roles" ON storage.objects;
CREATE POLICY "irat_files_insert_write_roles"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'irat_files'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.user_id = auth.uid()
          AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
      )
      OR EXISTS (
        SELECT 1
        FROM public.felhasznalo_profil fp
        WHERE fp.id = auth.uid()
          AND fp.docs_szerepkor::text IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo', 'munkavallalo')
      )
    )
  );

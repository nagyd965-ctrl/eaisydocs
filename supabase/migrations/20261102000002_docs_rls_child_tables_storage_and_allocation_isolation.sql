-- =============================================================================
-- Migration: 20261102000002_docs_rls_child_tables_storage_and_allocation_isolation.sql
-- Purpose:
--   eaisyDocs Package 4 — Database RLS, Storage, Allocation & RPC Hardening:
--   1. Drop legacy 3-arg `public.admin_update_user_role` SECURITY DEFINER RPC.
--   2. Change `esemeny_naplo_company_id_fkey` to `ON DELETE SET NULL` so company
--      deletion preserves the audit trail.
--   3. Tighten `can_view_user_profile` branch 4 to true system administrators.
--   4. Create `public.get_effective_docs_role(p_company_id, p_user_id)` helper
--      that resolves company-scoped Docs roles from `company_members` and prevents
--      global admin privilege bleed.
--   5. Make `iktatoszam_allokacio`, `ugyszam_allokacio`, and `erkeztetoszam_allokacio`
--      company-scoped (`PRIMARY KEY (company_id, ev, ...)`), and update
--      `generate_iktatoszam`, `generate_ugyszam`, `generate_erkeztetoszam`.
--   6. Harden `attach_irat_to_dossier_atomic`, `check_irat_fajl_access`, and
--      `check_ugyirat_user_access` (including `helyettesites` delegation).
--   7. Replace open `USING(true)` and `anon` RLS policies across all eaisyDocs
--      tables and `storage.objects` (`irat_files` bucket).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop legacy 3-arg `admin_update_user_role` RPC (P0 privilege escalation)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, public.user_szerepkor, public.irat_minosites);
DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, text, text);

-- -----------------------------------------------------------------------------
-- 2. Change `esemeny_naplo_company_id_fkey` to ON DELETE SET NULL
-- -----------------------------------------------------------------------------
ALTER TABLE public.esemeny_naplo
  ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.esemeny_naplo
  DROP CONSTRAINT IF EXISTS esemeny_naplo_company_id_fkey;

ALTER TABLE public.esemeny_naplo
  ADD CONSTRAINT esemeny_naplo_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3. Tighten `can_view_user_profile` (remove 1-company admin global read)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_user_profile(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

  -- 3. Közös vállalati HR adatlap hozzáférés
  IF EXISTS (
    SELECT 1
    FROM public.hr_dolgozo_adatlap da
    WHERE da.id = p_target_user_id
      AND da.company_id IS NOT NULL
      AND public.user_has_company_access(da.company_id)
  ) THEN
    RETURN true;
  END IF;

  -- 4. Kizárólag globális rendszergazda
  IF EXISTS (
    SELECT 1
    FROM public.felhasznalo_profil fp
    WHERE fp.id = v_uid
      AND (
        fp.szerepkor::text = 'rendszergazda'
        OR fp.docs_szerepkor::text = 'rendszergazda'
        OR fp.hr_szerepkor::text = 'rendszergazda'
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Company-scoped Docs role resolver (`get_effective_docs_role`)
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
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'betekinto';
  END IF;

  SELECT fp.docs_szerepkor::text, fp.szerepkor::text
  INTO v_global_docs_role, v_global_sys_role
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  IF v_global_sys_role = 'rendszergazda' OR v_global_docs_role = 'rendszergazda' THEN
    -- Ha van explicit tagsága a cégben és ott más szerepköre van (és nem owner/admin), akkor a céges szerepkör érvényesül
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
      -- Nem cég-admin tagnál a globális 'admin' nem szivároghat át más cégből
      IF v_global_docs_role IN ('admin', 'rendszergazda') THEN
        RETURN 'ugyintezo';
      END IF;
      RETURN COALESCE(v_global_docs_role, 'ugyintezo');
    END IF;
  END IF;

  RETURN COALESCE(v_global_docs_role, 'betekinto');
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Company-scoped `iktatoszam_allokacio`, `ugyszam_allokacio`, `erkeztetoszam_allokacio`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_default_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id FROM public.companies ORDER BY created_at ASC LIMIT 1;
$function$;

UPDATE public.iktatoszam_allokacio
SET company_id = public.get_default_company_id()
WHERE company_id IS NULL;

ALTER TABLE public.iktatoszam_allokacio
  ALTER COLUMN company_id SET DEFAULT public.get_default_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.iktatoszam_allokacio
  DROP CONSTRAINT IF EXISTS iktatoszam_allokacio_pkey;

ALTER TABLE public.iktatoszam_allokacio
  ADD CONSTRAINT iktatoszam_allokacio_pkey PRIMARY KEY (company_id, ev, prefix);

UPDATE public.ugyszam_allokacio
SET company_id = public.get_default_company_id()
WHERE company_id IS NULL;

ALTER TABLE public.ugyszam_allokacio
  ALTER COLUMN company_id SET DEFAULT public.get_default_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.ugyszam_allokacio
  DROP CONSTRAINT IF EXISTS ugyszam_allokacio_pkey;

ALTER TABLE public.ugyszam_allokacio
  ADD CONSTRAINT ugyszam_allokacio_pkey PRIMARY KEY (company_id, ev, prefix);

CREATE TABLE IF NOT EXISTS public.erkeztetoszam_allokacio (
  company_id uuid NOT NULL DEFAULT public.get_default_company_id() REFERENCES public.companies(id) ON DELETE CASCADE,
  ev integer NOT NULL,
  utolso_sorszam integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, ev)
);

ALTER TABLE public.erkeztetoszam_allokacio ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.generate_iktatoszam(integer, text);
CREATE OR REPLACE FUNCTION public.generate_iktatoszam(
  p_ev integer,
  p_prefix text,
  p_company_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sorszam INTEGER;
  v_clean_prefix TEXT;
  v_company_id UUID;
  v_iktatoszam TEXT;
BEGIN
  IF p_company_id IS NOT NULL AND auth.uid() IS NOT NULL AND NOT public.user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'Nincs hozzáférés a megadott cég iktatószám-tartományához';
  END IF;

  v_clean_prefix := UPPER(COALESCE(NULLIF(TRIM(p_prefix), ''), 'NYILV'));
  v_company_id := COALESCE(
    p_company_id,
    (SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() ORDER BY cm.created_at ASC LIMIT 1),
    public.get_default_company_id()
  );

  INSERT INTO public.iktatoszam_allokacio (company_id, ev, prefix, utolso_sorszam)
  VALUES (v_company_id, p_ev, v_clean_prefix, 1)
  ON CONFLICT (company_id, ev, prefix) DO UPDATE
  SET utolso_sorszam = public.iktatoszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;

  v_iktatoszam := v_clean_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_iktatoszam;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_iktatoszam(integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_iktatoszam(integer, text, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.generate_ugyszam(integer, text);
CREATE OR REPLACE FUNCTION public.generate_ugyszam(
  p_ev integer,
  p_prefix text,
  p_company_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sorszam INTEGER;
  v_clean_prefix TEXT;
  v_company_id UUID;
  v_ugyszam TEXT;
BEGIN
  IF p_company_id IS NOT NULL AND auth.uid() IS NOT NULL AND NOT public.user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'Nincs hozzáférés a megadott cég ügyszám-tartományához';
  END IF;

  v_clean_prefix := UPPER(COALESCE(NULLIF(TRIM(p_prefix), ''), 'NYILV'));
  v_company_id := COALESCE(
    p_company_id,
    (SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() ORDER BY cm.created_at ASC LIMIT 1),
    public.get_default_company_id()
  );

  INSERT INTO public.ugyszam_allokacio (company_id, ev, prefix, utolso_sorszam)
  VALUES (v_company_id, p_ev, v_clean_prefix, 1)
  ON CONFLICT (company_id, ev, prefix) DO UPDATE
  SET utolso_sorszam = public.ugyszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;

  v_ugyszam := v_clean_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_ugyszam;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_ugyszam(integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_ugyszam(integer, text, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.generate_erkeztetoszam(integer);
CREATE OR REPLACE FUNCTION public.generate_erkeztetoszam(
  p_ev integer,
  p_company_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sorszam INTEGER;
  v_company_id UUID;
BEGIN
  IF p_company_id IS NOT NULL AND auth.uid() IS NOT NULL AND NOT public.user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'Nincs hozzáférés a megadott cég érkeztetőszám-tartományához';
  END IF;

  v_company_id := COALESCE(
    p_company_id,
    (SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() ORDER BY cm.created_at ASC LIMIT 1),
    public.get_default_company_id()
  );

  INSERT INTO public.erkeztetoszam_allokacio (company_id, ev, utolso_sorszam)
  VALUES (v_company_id, p_ev, 1)
  ON CONFLICT (company_id, ev) DO UPDATE
  SET utolso_sorszam = public.erkeztetoszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;

  RETURN 'E/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_erkeztetoszam(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_erkeztetoszam(integer, uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. Harden `attach_irat_to_dossier_atomic`, `check_ugyirat_user_access`, `check_irat_fajl_access`
-- -----------------------------------------------------------------------------
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

  -- 1. Lock ugyirat to serialize concurrent alszam assignments
  SELECT id, iktatoszam, ugy_id, company_id, statusz
  INTO v_ugyirat
  FROM public.ugyirat
  WHERE id = p_ugyirat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'A kiválasztott ügyirat nem található.');
  END IF;

  -- 2. Lock irat and ensure it is not already filed
  SELECT id, ugyirat_id, targy, company_id
  INTO v_irat
  FROM public.irat
  WHERE id = p_irat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'A beérkező irat nem található.');
  END IF;

  -- 3. Company & Role Verification
  IF v_ugyirat.company_id IS DISTINCT FROM v_irat.company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Az irat és az ügyirat nem ugyanahhoz a vállalathoz tartozik!');
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.user_has_company_access(v_ugyirat.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nincs hozzáférésed az ügyirat vállalatához.');
  END IF;

  v_eff_role := public.get_effective_docs_role(v_ugyirat.company_id, v_caller_id);
  IF v_eff_role IN ('betekinto', 'auditor') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Olvasási jogosultsággal nem végezhető irat-összerendelés.');
  END IF;

  IF v_ugyirat.statusz::text IN ('irattarban', 'lezart', 'selejtezheto', 'selejtezett') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lezárt vagy irattározott ügyiratba nem csatolható új irat.');
  END IF;

  IF v_irat.ugyirat_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ezt az iratot már egy másik felhasználó vagy folyamat iktatta!');
  END IF;

  -- 4. Calculate next alszam atomically under the ugyirat lock
  SELECT COALESCE(MAX(alszam), 0) + 1
  INTO v_next_alszam
  FROM public.irat
  WHERE ugyirat_id = p_ugyirat_id;

  -- 5. Update irat with the new dossier and sub-number
  UPDATE public.irat
  SET ugyirat_id = p_ugyirat_id,
      alszam = v_next_alszam
  WHERE id = p_irat_id;

  -- 6. Create polymorphic irat_kapcsolat (elozmeny)
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

  -- 7. Insert audit log entry
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

  -- 8. Queue AI embedding update in ai_feladat_sor
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

REVOKE EXECUTE ON FUNCTION public.claim_ai_tasks(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_ai_tasks(integer) TO service_role;

-- -----------------------------------------------------------------------------
-- 7. Update `ugyirat`, `irat`, `irat_fajl` ABAC policies (company-scoped role + confidentiality + delegation)
-- -----------------------------------------------------------------------------
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
          OR (
            public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('vezeto', 'ugyintezo')
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
          OR (
            public.get_effective_docs_role(ugyirat.company_id, fp.id) IN ('vezeto', 'ugyintezo')
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
          OR (
            public.get_effective_docs_role(irat.company_id, fp.id) IN ('vezeto', 'ugyintezo')
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
        AND public.get_effective_docs_role(i.company_id, fp.id) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
        AND public.check_irat_fajl_access(irat_fajl.irat_id, fp.id, public.get_effective_docs_role(i.company_id, fp.id), fp.max_minosites, fp.szervezeti_egyseg_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 8. Replace open/anon policies on all Docs child and catalog tables
-- -----------------------------------------------------------------------------

-- 8.1 partner_kapcsolattarto (remove anon read!)
DROP POLICY IF EXISTS "partner_kapcsolattarto_anon_read" ON public.partner_kapcsolattarto;
DROP POLICY IF EXISTS "partner_kapcsolattarto_authenticated_all" ON public.partner_kapcsolattarto;
DROP POLICY IF EXISTS "partner_kapcsolattarto_select_company" ON public.partner_kapcsolattarto;
DROP POLICY IF EXISTS "partner_kapcsolattarto_write_company" ON public.partner_kapcsolattarto;

CREATE POLICY "partner_kapcsolattarto_select_company"
  ON public.partner_kapcsolattarto
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner p
      WHERE p.id = partner_kapcsolattarto.partner_id
        AND public.user_has_company_access(p.company_id)
    )
  );

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
        AND public.get_effective_docs_role(p.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner p
      WHERE p.id = partner_kapcsolattarto.partner_id
        AND public.user_has_company_access(p.company_id)
        AND public.get_effective_docs_role(p.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  );

-- 8.2 ugyirat_megjegyzes
DROP POLICY IF EXISTS "Allow select for authenticated users on ugyirat_megjegyzes" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "Allow insert for authenticated users on ugyirat_megjegyzes" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "Allow update own on ugyirat_megjegyzes" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "Allow delete own on ugyirat_megjegyzes" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "ugyirat_megjegyzes_select_company" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "ugyirat_megjegyzes_insert_company" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "ugyirat_megjegyzes_update_own" ON public.ugyirat_megjegyzes;
DROP POLICY IF EXISTS "ugyirat_megjegyzes_delete_own" ON public.ugyirat_megjegyzes;

CREATE POLICY "ugyirat_megjegyzes_select_company"
  ON public.ugyirat_megjegyzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
    )
  );

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
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  );

CREATE POLICY "ugyirat_megjegyzes_update_own"
  ON public.ugyirat_megjegyzes
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
    )
  );

CREATE POLICY "ugyirat_megjegyzes_delete_own"
  ON public.ugyirat_megjegyzes
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_megjegyzes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
    )
  );

-- 8.3 irat_kapcsolat
DROP POLICY IF EXISTS "Allow all operations for authenticated users on irat_kapcsolat" ON public.irat_kapcsolat;
DROP POLICY IF EXISTS "irat_kapcsolat_select_company" ON public.irat_kapcsolat;
DROP POLICY IF EXISTS "irat_kapcsolat_write_company" ON public.irat_kapcsolat;

CREATE POLICY "irat_kapcsolat_select_company"
  ON public.irat_kapcsolat
  FOR SELECT
  TO authenticated
  USING (
    (irat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.irat i WHERE i.id = irat_kapcsolat.irat_id AND public.user_has_company_access(i.company_id)
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u WHERE u.id = irat_kapcsolat.ugyirat_id AND public.user_has_company_access(u.company_id)
    ))
  );

CREATE POLICY "irat_kapcsolat_write_company"
  ON public.irat_kapcsolat
  FOR ALL
  TO authenticated
  USING (
    (irat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.irat i
      WHERE i.id = irat_kapcsolat.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u
      WHERE u.id = irat_kapcsolat.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    ))
  )
  WITH CHECK (
    (irat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.irat i
      WHERE i.id = irat_kapcsolat.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u
      WHERE u.id = irat_kapcsolat.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    ))
  );

-- 8.4 ugyirat_hozzaferes
DROP POLICY IF EXISTS "Hozzafereseket mindenki latja" ON public.ugyirat_hozzaferes;
DROP POLICY IF EXISTS "ugyirat_hozzaferes_select_company" ON public.ugyirat_hozzaferes;
DROP POLICY IF EXISTS "ugyirat_hozzaferes_write_company" ON public.ugyirat_hozzaferes;

CREATE POLICY "ugyirat_hozzaferes_select_company"
  ON public.ugyirat_hozzaferes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_hozzaferes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
    )
  );

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
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ugyirat u
      WHERE u.id = ugyirat_hozzaferes.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND public.get_effective_docs_role(u.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
    )
  );

-- 8.5 irat_kolcsonzes_naplo
DROP POLICY IF EXISTS "Kolcsonzes lathato mindenkinel" ON public.irat_kolcsonzes_naplo;
DROP POLICY IF EXISTS "Kolcsonzesek megtekintese" ON public.irat_kolcsonzes_naplo;
DROP POLICY IF EXISTS "Kolcsonzesek szerkesztese" ON public.irat_kolcsonzes_naplo;
DROP POLICY IF EXISTS "irat_kolcsonzes_select_company" ON public.irat_kolcsonzes_naplo;
DROP POLICY IF EXISTS "irat_kolcsonzes_write_company" ON public.irat_kolcsonzes_naplo;

CREATE POLICY "irat_kolcsonzes_select_company"
  ON public.irat_kolcsonzes_naplo
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = irat_kolcsonzes_naplo.irat_id
        AND public.user_has_company_access(i.company_id)
    )
  );

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
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = irat_kolcsonzes_naplo.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  );

-- 8.6 irat_fizikai_hely
DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.irat_fizikai_hely;
CREATE POLICY "tenant_isolation_restrictive"
  ON public.irat_fizikai_hely
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "Fizikai hely szerkesztese" ON public.irat_fizikai_hely;
CREATE POLICY "Fizikai hely szerkesztese"
  ON public.irat_fizikai_hely
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('iktato', 'admin', 'rendszergazda', 'vezeto', 'ugyintezo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('iktato', 'admin', 'rendszergazda', 'vezeto', 'ugyintezo')
  );

-- 8.7 iktatoszam_allokacio, ugyszam_allokacio, erkeztetoszam_allokacio
DROP POLICY IF EXISTS "Allow all operations for authenticated users on iktatoszam_allo" ON public.iktatoszam_allokacio;
DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.iktatoszam_allokacio;
DROP POLICY IF EXISTS "iktatoszam_allokacio_company_access" ON public.iktatoszam_allokacio;

CREATE POLICY "tenant_isolation_restrictive"
  ON public.iktatoszam_allokacio
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "iktatoszam_allokacio_company_access"
  ON public.iktatoszam_allokacio
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  );

DROP POLICY IF EXISTS "Allow all operations for authenticated users on ugyszam_allokac" ON public.ugyszam_allokacio;
DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.ugyszam_allokacio;
DROP POLICY IF EXISTS "ugyszam_allokacio_company_access" ON public.ugyszam_allokacio;

CREATE POLICY "tenant_isolation_restrictive"
  ON public.ugyszam_allokacio
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "ugyszam_allokacio_company_access"
  ON public.ugyszam_allokacio
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  );

DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.erkeztetoszam_allokacio;
DROP POLICY IF EXISTS "erkeztetoszam_allokacio_company_access" ON public.erkeztetoszam_allokacio;

CREATE POLICY "tenant_isolation_restrictive"
  ON public.erkeztetoszam_allokacio
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "erkeztetoszam_allokacio_company_access"
  ON public.erkeztetoszam_allokacio
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  );

-- 8.8 selejtezes_tetel
DROP POLICY IF EXISTS "Mindenki lathatja a teteleket" ON public.selejtezes_tetel;
DROP POLICY IF EXISTS "Tetelek letrehozasa" ON public.selejtezes_tetel;
DROP POLICY IF EXISTS "selejtezes_tetel_select_company" ON public.selejtezes_tetel;
DROP POLICY IF EXISTS "selejtezes_tetel_write_company" ON public.selejtezes_tetel;

CREATE POLICY "selejtezes_tetel_select_company"
  ON public.selejtezes_tetel
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.selejtezes_csomag sc
      WHERE sc.id = selejtezes_tetel.csomag_id
        AND public.user_has_company_access(sc.company_id)
    )
  );

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
        AND public.get_effective_docs_role(sc.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.selejtezes_csomag sc
      WHERE sc.id = selejtezes_tetel.csomag_id
        AND public.user_has_company_access(sc.company_id)
        AND public.get_effective_docs_role(sc.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
    )
  );

-- 8.9 alkalmazas_ertesites (remove public/anon INSERT)
DROP POLICY IF EXISTS "Ertesites beszurasa engedelyezett" ON public.alkalmazas_ertesites;
DROP POLICY IF EXISTS "alkalmazas_ertesites_insert_authenticated" ON public.alkalmazas_ertesites;

CREATE POLICY "alkalmazas_ertesites_insert_authenticated"
  ON public.alkalmazas_ertesites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id = auth.uid() OR public.can_view_user_profile(user_id))
  );

-- 8.10 ai_feladat_sor (scope to parent `irat` company)
DROP POLICY IF EXISTS "ai_feladat_sor_all_auth" ON public.ai_feladat_sor;
DROP POLICY IF EXISTS "ai_feladat_sor_select_auth" ON public.ai_feladat_sor;
DROP POLICY IF EXISTS "ai_feladat_sor_select_company" ON public.ai_feladat_sor;
DROP POLICY IF EXISTS "ai_feladat_sor_write_company" ON public.ai_feladat_sor;

CREATE POLICY "ai_feladat_sor_select_company"
  ON public.ai_feladat_sor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = ai_feladat_sor.irat_id
        AND public.user_has_company_access(i.company_id)
    )
  );

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
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = ai_feladat_sor.irat_id
        AND public.user_has_company_access(i.company_id)
        AND public.get_effective_docs_role(i.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
    )
  );

-- 8.11 company_filing_rules (prevent cross-company write on `scope = 'all'`)
DROP POLICY IF EXISTS "tenant_filing_rules_access_permissive" ON public.company_filing_rules;
DROP POLICY IF EXISTS "tenant_isolation_filing_rules_restrictive" ON public.company_filing_rules;
DROP POLICY IF EXISTS "company_filing_rules_select" ON public.company_filing_rules;
DROP POLICY IF EXISTS "company_filing_rules_write" ON public.company_filing_rules;

CREATE POLICY "tenant_isolation_filing_rules_restrictive"
  ON public.company_filing_rules
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id) OR scope = 'all')
  WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "company_filing_rules_select"
  ON public.company_filing_rules
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id) OR scope = 'all');

CREATE POLICY "company_filing_rules_write"
  ON public.company_filing_rules
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
  );

-- 8.12 ugy, irattari_terv, szervezeti_egyseg, rendszer_beallitas
DROP POLICY IF EXISTS "Allow all operations for authenticated users on ugy" ON public.ugy;
DROP POLICY IF EXISTS "ugy_select_company" ON public.ugy;
DROP POLICY IF EXISTS "ugy_write_company" ON public.ugy;

CREATE POLICY "ugy_select_company"
  ON public.ugy
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

CREATE POLICY "ugy_write_company"
  ON public.ugy
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
  );

DROP POLICY IF EXISTS "Allow all operations for authenticated users on irattari_terv" ON public.irattari_terv;
DROP POLICY IF EXISTS "irattari_terv_select_company" ON public.irattari_terv;
DROP POLICY IF EXISTS "irattari_terv_write_company" ON public.irattari_terv;

CREATE POLICY "irattari_terv_select_company"
  ON public.irattari_terv
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

CREATE POLICY "irattari_terv_write_company"
  ON public.irattari_terv
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto')
  );

DROP POLICY IF EXISTS "Szervezeti egysegek kezelese" ON public.szervezeti_egyseg;
CREATE POLICY "Szervezeti egysegek kezelese"
  ON public.szervezeti_egyseg
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND public.get_effective_docs_role(company_id, auth.uid()) IN ('admin', 'rendszergazda')
  );

DROP POLICY IF EXISTS "Csak admin szerkesztheti a rendszerbeallitasokat" ON public.rendszer_beallitas;
CREATE POLICY "Csak admin szerkesztheti a rendszerbeallitasokat"
  ON public.rendszer_beallitas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'rendszergazda')
    )
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (fp.szerepkor::text IN ('admin', 'rendszergazda') OR fp.docs_szerepkor::text IN ('admin', 'rendszergazda'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'rendszergazda')
    )
    OR EXISTS (
      SELECT 1
      FROM public.felhasznalo_profil fp
      WHERE fp.id = auth.uid()
        AND (fp.szerepkor::text IN ('admin', 'rendszergazda') OR fp.docs_szerepkor::text IN ('admin', 'rendszergazda'))
    )
  );

-- -----------------------------------------------------------------------------
-- 9. Tighten `storage.objects` (`irat_files` bucket)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert files" ON storage.objects;
DROP POLICY IF EXISTS "irat_files_select_company_scoped" ON storage.objects;
DROP POLICY IF EXISTS "irat_files_insert_write_roles" ON storage.objects;

CREATE POLICY "irat_files_select_company_scoped"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'irat_files'
    AND (
      EXISTS (
        SELECT 1
        FROM public.irat_fajl f
        JOIN public.irat i ON i.id = f.irat_id
        LEFT JOIN public.felhasznalo_profil fp ON fp.id = auth.uid()
        WHERE (f.storage_path = objects.name OR f.pdfa_path = objects.name)
          AND public.check_irat_fajl_access(
            i.id,
            auth.uid(),
            public.get_effective_docs_role(i.company_id, auth.uid()),
            COALESCE(fp.max_minosites, 'nyilt'::public.irat_minosites),
            fp.szervezeti_egyseg_id
          )
      )
      OR (
        objects.name LIKE 'selejtezes/%'
        AND EXISTS (
          SELECT 1
          FROM public.selejtezes_csomag sc
          WHERE sc.jegyzokonyv_path = objects.name
            AND public.user_has_company_access(sc.company_id)
        )
      )
    )
  );

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
          AND public.get_effective_docs_role(cm.company_id, auth.uid()) IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
      )
      OR EXISTS (
        SELECT 1
        FROM public.felhasznalo_profil fp
        WHERE fp.id = auth.uid()
          AND fp.docs_szerepkor::text IN ('admin', 'rendszergazda', 'iktato', 'vezeto', 'ugyintezo')
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Automated Self-Verification DO Block
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_legacy_rpc_count INT;
  v_anon_pol_count INT;
  v_unguarded_gen_count INT;
BEGIN
  SELECT COUNT(*) INTO v_legacy_rpc_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'admin_update_user_role';

  IF v_legacy_rpc_count > 0 THEN
    RAISE EXCEPTION 'Self-check failed: legacy admin_update_user_role RPC still exists!';
  END IF;

  SELECT COUNT(*) INTO v_anon_pol_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'partner_kapcsolattarto'
    AND policyname = 'partner_kapcsolattarto_anon_read';

  IF v_anon_pol_count > 0 THEN
    RAISE EXCEPTION 'Self-check failed: partner_kapcsolattarto_anon_read still exists!';
  END IF;

  SELECT COUNT(*) INTO v_unguarded_gen_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('generate_iktatoszam', 'generate_ugyszam', 'generate_erkeztetoszam')
    AND prosrc NOT ILIKE '%user_has_company_access%';

  IF v_unguarded_gen_count > 0 THEN
    RAISE EXCEPTION 'Self-check failed: generate_* RPC missing user_has_company_access check!';
  END IF;
END $$;

-- ============================================================================
-- Migration: 20261104000005_docs_and_hr_read_write_permissions_matrix.sql
-- Scope: [Közös] eaisyDocs & eaisyHR Olvasás (Read) és Írás (Write) jogosultsági mátrix
-- Cél:
--   1. `docs_iras_modulok text[]` és `hr_iras_modulok text[]` oszlopok felvétele
--      a `public.company_members` és `public.felhasznalo_profil` táblákra.
--   2. Meglévő sorok feltöltése (`docs_iras_modulok = docs_modulok`,
--      `hr_iras_modulok = hr_modulok`), hogy a jelenlegi jogosultságok
--      változatlanul írási jogot is biztosítsanak.
--   3. `public.has_docs_write_access(p_modules, p_company_id, p_user_id)` és
--      `public.has_hr_write_access(p_modules, p_company_id, p_user_id)` SQL
--      segédfüggvények létrehozása.
--   4. Az eaisyDocs módosító RLS szabályainak és az `attach_irat_to_dossier_atomic`
--      RPC-nek az átkötése a `public.has_docs_write_access(...)` függvényre,
--      miközben a SELECT szabályok továbbra is a `public.has_docs_module_access(...)`
--      (Olvasás) függvényt használják.
-- ============================================================================

BEGIN;

-- 1. Új oszlopok felvétele a company_members és felhasznalo_profil táblákra
ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS docs_iras_modulok text[] NOT NULL DEFAULT ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
  ADD COLUMN IF NOT EXISTS hr_iras_modulok text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.felhasznalo_profil
  ADD COLUMN IF NOT EXISTS docs_iras_modulok text[] NOT NULL DEFAULT ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
  ADD COLUMN IF NOT EXISTS hr_iras_modulok text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Meglévő adatok szinkronizálása (aki jelenleg eléri a modult, alapértelmezetten írási joggal is rendelkezik rá)
UPDATE public.company_members
SET
  docs_iras_modulok = COALESCE(docs_modulok, '{}'::text[]),
  hr_iras_modulok = COALESCE(hr_modulok, '{}'::text[]);

UPDATE public.felhasznalo_profil
SET
  docs_iras_modulok = COALESCE(docs_modulok, '{}'::text[]),
  hr_iras_modulok = COALESCE(hr_modulok, '{}'::text[]);

-- 3. Segédfüggvény: public.has_docs_write_access(p_modules text[], p_company_id uuid, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.has_docs_write_access(
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
  v_cm_read_modules text[];
  v_cm_write_modules text[];
  v_fp_read_modules text[];
  v_fp_write_modules text[];
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
    SELECT cm.docs_modulok, cm.docs_iras_modulok
    INTO v_cm_read_modules, v_cm_write_modules
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF FOUND AND v_cm_read_modules IS NOT NULL THEN
      RETURN (v_cm_read_modules && p_modules)
         AND (COALESCE(v_cm_write_modules, v_cm_read_modules) && p_modules);
    END IF;
  END IF;

  SELECT fp.docs_modulok, fp.docs_iras_modulok
  INTO v_fp_read_modules, v_fp_write_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  RETURN (COALESCE(v_fp_read_modules, ARRAY[]::text[]) && p_modules)
     AND (COALESCE(v_fp_write_modules, v_fp_read_modules, ARRAY[]::text[]) && p_modules);
END;
$function$;

-- 4. Segédfüggvény: public.has_hr_write_access(p_modules text[], p_company_id uuid, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.has_hr_write_access(
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
  v_has_hr_app boolean := false;
  v_cm_role text;
  v_cm_hr_role text;
  v_cm_read_modules text[];
  v_cm_write_modules text[];
  v_fp_hr_role text;
  v_fp_read_modules text[];
  v_fp_write_modules text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    ('hr' = ANY(COALESCE(fp.elerheto_modulok, ARRAY[]::text[]))),
    COALESCE(fp.hr_szerepkor::text, 'munkavallalo'),
    COALESCE(fp.hr_modulok, ARRAY[]::text[]),
    COALESCE(fp.hr_iras_modulok, fp.hr_modulok, ARRAY[]::text[])
  INTO v_has_hr_app, v_fp_hr_role, v_fp_read_modules, v_fp_write_modules
  FROM public.felhasznalo_profil fp
  WHERE fp.id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT cm.role, cm.hr_szerepkor::text, cm.hr_modulok, cm.hr_iras_modulok
    INTO v_cm_role, v_cm_hr_role, v_cm_read_modules, v_cm_write_modules
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = p_user_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    IF v_cm_role IN ('owner', 'admin') OR v_cm_hr_role IN ('admin', 'rendszergazda') THEN
      RETURN true;
    END IF;

    IF NOT v_has_hr_app THEN
      RETURN false;
    END IF;

    RETURN (COALESCE(v_cm_read_modules, v_fp_read_modules) && p_modules)
       AND (COALESCE(v_cm_write_modules, v_cm_read_modules, v_fp_write_modules) && p_modules);
  END IF;

  IF v_fp_hr_role IN ('admin', 'rendszergazda') THEN
    RETURN true;
  END IF;

  IF NOT v_has_hr_app THEN
    RETURN false;
  END IF;

  RETURN (v_fp_read_modules && p_modules) AND (v_fp_write_modules && p_modules);
END;
$function$;

-- 5. attach_irat_to_dossier_atomic frissítése has_docs_write_access ellenőrzéssel
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
    v_eff_role <> 'admin'
    AND NOT public.has_docs_write_access(ARRAY['inbox', 'dossiers'], v_ugyirat.company_id, v_caller_id)
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
$function$;

-- 6. Az eaisyDocs módosító RLS szabályok átkötése a has_docs_write_access függvényre
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
          public.get_effective_docs_role(ugyirat.company_id, fp.id) = 'admin'
          OR NOT public.check_ugyirat_has_unauthorized_irat(ugyirat.id, fp.max_minosites)
        )
        AND (
          public.get_effective_docs_role(ugyirat.company_id, fp.id) = 'admin'
          OR (
            public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], ugyirat.company_id, fp.id)
            AND (
              public.has_docs_module_access(ARRAY['inbox', 'dossiers', 'archive'], ugyirat.company_id, fp.id)
              OR public.check_ugyirat_user_access(ugyirat.id, fp.id, fp.szervezeti_egyseg_id)
            )
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
          public.get_effective_docs_role(ugyirat.company_id, fp.id) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], ugyirat.company_id, fp.id)
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
          public.get_effective_docs_role(irat.company_id, fp.id) = 'admin'
          OR irat.minosites <= fp.max_minosites
        )
        AND (
          public.get_effective_docs_role(irat.company_id, fp.id) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], irat.company_id, fp.id)
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
        AND (
          public.get_effective_docs_role(i.company_id, fp.id) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], i.company_id, fp.id)
        )
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
          public.get_effective_docs_role(p.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['partners'], p.company_id, auth.uid())
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
          public.get_effective_docs_role(p.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['partners'], p.company_id, auth.uid())
        )
    )
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
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers'], u.company_id, auth.uid())
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
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers'], u.company_id, auth.uid())
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
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers'], u.company_id, auth.uid())
        )
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
        AND (
          public.get_effective_docs_role(i.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], i.company_id, auth.uid())
        )
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u
      WHERE u.id = irat_kapcsolat.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], u.company_id, auth.uid())
        )
    ))
  )
  WITH CHECK (
    (irat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.irat i
      WHERE i.id = irat_kapcsolat.irat_id
        AND public.user_has_company_access(i.company_id)
        AND (
          public.get_effective_docs_role(i.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], i.company_id, auth.uid())
        )
    ))
    OR
    (ugyirat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.ugyirat u
      WHERE u.id = irat_kapcsolat.ugyirat_id
        AND public.user_has_company_access(u.company_id)
        AND (
          public.get_effective_docs_role(u.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], u.company_id, auth.uid())
        )
    ))
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
        AND (
          public.get_effective_docs_role(i.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['archive', 'dossiers'], i.company_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.irat i
      WHERE i.id = irat_kolcsonzes_naplo.irat_id
        AND public.user_has_company_access(i.company_id)
        AND (
          public.get_effective_docs_role(i.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['archive', 'dossiers'], i.company_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Fizikai hely szerkesztese" ON public.irat_fizikai_hely;
CREATE POLICY "Fizikai hely szerkesztese"
  ON public.irat_fizikai_hely
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['archive', 'settings'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['archive', 'settings'], company_id, auth.uid())
    )
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
          public.get_effective_docs_role(sc.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['archive'], sc.company_id, auth.uid())
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
          public.get_effective_docs_role(sc.company_id, auth.uid()) = 'admin'
          OR public.has_docs_write_access(ARRAY['archive'], sc.company_id, auth.uid())
        )
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
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['rules'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['rules'], company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "irattari_terv_write_company" ON public.irattari_terv;
CREATE POLICY "irattari_terv_write_company"
  ON public.irattari_terv
  FOR ALL
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['settings', 'archive'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['settings', 'archive'], company_id, auth.uid())
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
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['settings'], company_id, auth.uid())
    )
  )
  WITH CHECK (
    public.user_has_company_access(company_id)
    AND (
      public.get_effective_docs_role(company_id, auth.uid()) = 'admin'
      OR public.has_docs_write_access(ARRAY['settings'], company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Csak admin szerkesztheti a rendszerbeallitasokat" ON public.rendszer_beallitas;
CREATE POLICY "Csak admin szerkesztheti a rendszerbeallitasokat"
  ON public.rendszer_beallitas
  FOR ALL
  TO authenticated
  USING (
    public.get_effective_docs_role(NULL, auth.uid()) = 'admin'
    OR public.has_docs_write_access(ARRAY['settings'], NULL, auth.uid())
  )
  WITH CHECK (
    public.get_effective_docs_role(NULL, auth.uid()) = 'admin'
    OR public.has_docs_write_access(ARRAY['settings'], NULL, auth.uid())
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
          AND (
            public.get_effective_docs_role(cm.company_id, auth.uid()) = 'admin'
            OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], cm.company_id, auth.uid())
          )
      )
      OR public.has_docs_write_access(ARRAY['inbox', 'dossiers', 'archive'], NULL, auth.uid())
    )
  );

-- 7. handle_new_user() frissítése docs_iras_modulok kitöltésével
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
    'munkavallalo'::public.docs_szerepkor_enum,
    'munkavallalo'::public.docs_szerepkor_enum,
    ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
    ARRAY['inbox', 'dossiers', 'archive', 'partners']::text[],
    'nyilt'::public.irat_minosites
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;

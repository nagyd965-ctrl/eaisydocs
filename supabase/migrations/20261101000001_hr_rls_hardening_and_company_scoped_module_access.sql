-- 20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql
-- [HR] Cég-szintű moduljogosultság-ellenőrzés (has_hr_module_access) és nyitott HR táblák (hr_kituntetes, hr_berpapir, hr_elozo_munkahely) RLS szigorítása

BEGIN;

-- ============================================================================
-- 1. Cég-scoped has_hr_module_access(p_modules text[], p_company_id uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_hr_module_access(
  p_modules text[],
  p_company_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_company_id IS NOT NULL THEN
      EXISTS (
        SELECT 1
        FROM public.company_members cm
        LEFT JOIN public.felhasznalo_profil fp ON fp.id = cm.user_id
        WHERE cm.user_id = auth.uid()
          AND cm.company_id = p_company_id
          AND (
            cm.role IN ('admin', 'owner')
            OR cm.hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
            OR COALESCE(cm.hr_modulok, '{}'::text[]) && p_modules
            OR (
              cm.hr_szerepkor IS NULL
              AND COALESCE(array_length(cm.hr_modulok, 1), 0) = 0
              AND (
                fp.hr_szerepkor::text IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
                OR COALESCE(fp.hr_modulok, '{}'::text[]) && p_modules
              )
            )
          )
      )
    ELSE
      EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.user_id = auth.uid()
          AND (
            cm.role IN ('admin', 'owner')
            OR cm.hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
            OR COALESCE(cm.hr_modulok, '{}'::text[]) && p_modules
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.felhasznalo_profil fp
        WHERE fp.id = auth.uid()
          AND (
            fp.hr_szerepkor::text IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
            OR fp.szerepkor::text IN ('admin', 'hr_vezeto', 'rendszergazda', 'auditor')
            OR fp.docs_szerepkor::text IN ('admin', 'hr_vezeto', 'rendszergazda', 'auditor')
            OR COALESCE(fp.hr_modulok, '{}'::text[]) && p_modules
          )
      )
  END;
$$;

-- Az 1 paraméteres túlterhelés megtartása a meglévő RLS szabályok kompatibilitásáért
CREATE OR REPLACE FUNCTION public.has_hr_module_access(p_modules text[] DEFAULT ARRAY['admin'])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_hr_module_access(p_modules, NULL::uuid);
$$;

-- ============================================================================
-- 2. hr_kituntetes: company_id + RESTRICTIVE cégizoláció + jogosultsági RLS
-- ============================================================================
DO $$
DECLARE
  v_default_company_id uuid;
BEGIN
  SELECT id INTO v_default_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hr_kituntetes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.hr_kituntetes ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

  UPDATE public.hr_kituntetes k
  SET company_id = a.company_id
  FROM public.hr_dolgozo_adatlap a
  WHERE k.company_id IS NULL
    AND k.dolgozo_id = a.id
    AND a.company_id IS NOT NULL;

  IF v_default_company_id IS NOT NULL THEN
    UPDATE public.hr_kituntetes SET company_id = v_default_company_id WHERE company_id IS NULL;
    EXECUTE format('ALTER TABLE public.hr_kituntetes ALTER COLUMN company_id SET DEFAULT %L;', v_default_company_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hr_kituntetes_company_id ON public.hr_kituntetes(company_id);

ALTER TABLE public.hr_kituntetes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mindenki lathatja es kezelheti a kitunteteseket" ON public.hr_kituntetes;
DROP POLICY IF EXISTS "company_isolation_restrictive" ON public.hr_kituntetes;
DROP POLICY IF EXISTS "hr_kituntetes_select" ON public.hr_kituntetes;
DROP POLICY IF EXISTS "hr_kituntetes_modify" ON public.hr_kituntetes;

CREATE POLICY "company_isolation_restrictive" ON public.hr_kituntetes
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (company_id IS NULL OR public.user_has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.user_has_company_access(company_id));

CREATE POLICY "hr_kituntetes_select" ON public.hr_kituntetes
  FOR SELECT
  TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'performance', 'compliance', 'auditor'], company_id)
  );

CREATE POLICY "hr_kituntetes_modify" ON public.hr_kituntetes
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'employees', 'performance'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'employees', 'performance'], company_id)
  );

-- ============================================================================
-- 3. hr_berpapir: RESTRICTIVE cégizoláció pótlása
-- ============================================================================
ALTER TABLE public.hr_berpapir ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_isolation_restrictive" ON public.hr_berpapir;
CREATE POLICY "company_isolation_restrictive" ON public.hr_berpapir
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (company_id IS NULL OR public.user_has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.user_has_company_access(company_id));

-- ============================================================================
-- 4. hr_elozo_munkahely: company_id + RESTRICTIVE cégizoláció + cég-scoped RLS
-- ============================================================================
DO $$
DECLARE
  v_default_company_id uuid;
BEGIN
  SELECT id INTO v_default_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hr_elozo_munkahely' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.hr_elozo_munkahely ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

  UPDATE public.hr_elozo_munkahely m
  SET company_id = a.company_id
  FROM public.hr_dolgozo_adatlap a
  WHERE m.company_id IS NULL
    AND m.dolgozo_id = a.id
    AND a.company_id IS NOT NULL;

  IF v_default_company_id IS NOT NULL THEN
    UPDATE public.hr_elozo_munkahely SET company_id = v_default_company_id WHERE company_id IS NULL;
    EXECUTE format('ALTER TABLE public.hr_elozo_munkahely ALTER COLUMN company_id SET DEFAULT %L;', v_default_company_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hr_elozo_munkahely_company_id ON public.hr_elozo_munkahely(company_id);

ALTER TABLE public.hr_elozo_munkahely ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_isolation_restrictive" ON public.hr_elozo_munkahely;
CREATE POLICY "company_isolation_restrictive" ON public.hr_elozo_munkahely
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (company_id IS NULL OR public.user_has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.user_has_company_access(company_id));

-- =============================================================================
-- 5. PRE-COMPANY TÁBLÁK COMPANY_ID BŐVÍTÉSE ÉS HR_JELENLET DELETE POLICY
--    (Kategória 3 — a dinamikus 2-paraméteres ALTER POLICY ciklus ELŐTT fut,
--     hogy a hr_tulora_felhasznalás, hr_munkakor_nyugtazas és hr_beosztas
--     táblák meglévő policy-jeit is automatikusan átírja a 6. szekció ciklusa!)
-- =============================================================================

-- 5.1 hr_tulora_felhasznalás: company_id oszlop + backfill + RESTRICTIVE RLS + 2-paraméteres moduljog
ALTER TABLE public."hr_tulora_felhasznalás"
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public."hr_tulora_felhasznalás" tf
SET company_id = COALESCE(
  (SELECT t.company_id FROM public.hr_tavollet t WHERE t.id = tf.tavollet_id),
  (SELECT a.company_id FROM public.hr_dolgozo_adatlap a WHERE a.id = tf.dolgozo_id)
)
WHERE tf.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_hr_tulora_felhasznalas_company
  ON public."hr_tulora_felhasznalás"(company_id);

DROP POLICY IF EXISTS "hr_tulora_felhasznalas_company_isolation" ON public."hr_tulora_felhasznalás";
DROP POLICY IF EXISTS "company_isolation_restrictive" ON public."hr_tulora_felhasznalás";
CREATE POLICY "company_isolation_restrictive" ON public."hr_tulora_felhasznalás"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id IS NULL OR public.user_has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "HR és vezető látja és kezelheti" ON public."hr_tulora_felhasznalás";
CREATE POLICY "HR és vezető látja és kezelheti" ON public."hr_tulora_felhasznalás"
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'], company_id)
    OR EXISTS (
      SELECT 1 FROM public.felhasznalo_profil beosztott
      WHERE beosztott.id = "hr_tulora_felhasznalás".dolgozo_id
        AND beosztott.kozvetlen_vezeto_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'], company_id)
    OR EXISTS (
      SELECT 1 FROM public.felhasznalo_profil beosztott
      WHERE beosztott.id = "hr_tulora_felhasznalás".dolgozo_id
        AND beosztott.kozvetlen_vezeto_id = auth.uid()
    )
  );

-- 5.2 hr_munkakor_nyugtazas: company_id oszlop + backfill + RESTRICTIVE RLS
ALTER TABLE public.hr_munkakor_nyugtazas
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.hr_munkakor_nyugtazas mn
SET company_id = (SELECT m.company_id FROM public.hr_munkakor m WHERE m.id = mn.munkakor_id)
WHERE mn.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_hr_munkakor_nyugtazas_company
  ON public.hr_munkakor_nyugtazas(company_id);

DROP POLICY IF EXISTS "hr_munkakor_nyugtazas_company_isolation" ON public.hr_munkakor_nyugtazas;
DROP POLICY IF EXISTS "company_isolation_restrictive" ON public.hr_munkakor_nyugtazas;
CREATE POLICY "company_isolation_restrictive" ON public.hr_munkakor_nyugtazas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id IS NULL OR public.user_has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.user_has_company_access(company_id));

-- 5.3 hr_beosztas: company_id oszlop + backfill + RESTRICTIVE RLS
ALTER TABLE public.hr_beosztas
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.hr_beosztas b
SET company_id = (SELECT j.company_id FROM public.hr_jogviszony j WHERE j.id = b.jogviszony_id)
WHERE b.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_hr_beosztas_company
  ON public.hr_beosztas(company_id);

DROP POLICY IF EXISTS "hr_beosztas_company_isolation" ON public.hr_beosztas;
DROP POLICY IF EXISTS "company_isolation_restrictive" ON public.hr_beosztas;
CREATE POLICY "company_isolation_restrictive" ON public.hr_beosztas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id IS NULL OR public.user_has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.user_has_company_access(company_id));

-- 5.4 hr_jelenlet: DELETE policy HR time/admin számára
DROP POLICY IF EXISTS "hr_jelenlet_hr_delete" ON public.hr_jelenlet;
CREATE POLICY "hr_jelenlet_hr_delete" ON public.hr_jelenlet
  FOR DELETE TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'time'], company_id)
  );

-- ============================================================================
-- 6. Összes company_id-val rendelkező HR tábla RLS policy-jának átkötése
--    a 2-paraméteres has_hr_module_access(ARRAY[...], company_id) függvényre
--    (beleértve a fenti 5.1–5.3-ban company_id-t kapott táblákat is!)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
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
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = p.schemaname
          AND c.table_name = p.tablename
          AND c.column_name = 'company_id'
      )
      AND (
        (p.qual IS NOT NULL AND p.qual LIKE '%has_hr_module_access(%' AND p.qual NOT LIKE '%company_id)%')
        OR (p.with_check IS NOT NULL AND p.with_check LIKE '%has_hr_module_access(%' AND p.with_check NOT LIKE '%company_id)%')
      )
  LOOP
    v_new_qual := NULL;
    v_new_with_check := NULL;

    IF r.qual IS NOT NULL THEN
      v_new_qual := regexp_replace(
        r.qual,
        'has_hr_module_access\((ARRAY\[[^\]]+\]|''[^'']+''::text\[\])\)',
        'has_hr_module_access(\1, company_id)',
        'g'
      );
    END IF;

    IF r.with_check IS NOT NULL THEN
      v_new_with_check := regexp_replace(
        r.with_check,
        'has_hr_module_access\((ARRAY\[[^\]]+\]|''[^'']+''::text\[\])\)',
        'has_hr_module_access(\1, company_id)',
        'g'
      );
    END IF;

    IF v_new_qual IS DISTINCT FROM r.qual OR v_new_with_check IS DISTINCT FROM r.with_check THEN
      v_sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
      IF v_new_qual IS NOT NULL AND r.cmd <> 'INSERT' THEN
        v_sql := v_sql || format(' USING (%s)', v_new_qual);
      END IF;
      IF v_new_with_check IS NOT NULL AND r.cmd IN ('INSERT', 'UPDATE', 'ALL') THEN
        v_sql := v_sql || format(' WITH CHECK (%s)', v_new_with_check);
      END IF;

      BEGIN
        EXECUTE v_sql;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Policy átírás sikertelen (%.% -> %): %', r.schemaname, r.tablename, r.policyname, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- Ellenőrző lekérdezés (migráció futtatása utáni kontrollhoz):
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual LIKE '%has_hr_module_access(%' OR with_check LIKE '%has_hr_module_access(%')
--   AND coalesce(qual, '') NOT LIKE '%company_id)%'
--   AND coalesce(with_check, '') NOT LIKE '%company_id)%';

-- ============================================================================
-- 7. get_decrypted_hr_data és update_decrypted_hr_data RPC-k cég-scoped bekötése
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_decrypted_hr_data(p_dolgozo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_secret_row RECORD;
  v_company_id UUID;
  v_result JSONB;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.hr_dolgozo_adatlap
  WHERE id = p_dolgozo_id;

  IF NOT (
    p_dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'payroll', 'onboarding', 'offboarding', 'reports'], v_company_id)
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT * INTO v_secret_row FROM public.hr_dolgozo_titkos_adat WHERE dolgozo_id = p_dolgozo_id;

  INSERT INTO public.esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas, company_id)
  VALUES (
    'hr_dolgozo_titkos_adat',
    p_dolgozo_id,
    'hr_megtekintve',
    auth.uid(),
    'Különleges/Titkos HR adat megtekintése RPC-n keresztül',
    v_company_id
  );

  v_result := jsonb_build_object(
    'taj_szam',     CASE WHEN v_secret_row.taj_szam_titkositott IS NOT NULL THEN encode(v_secret_row.taj_szam_titkositott, 'escape') ELSE '' END,
    'adoazonosito', CASE WHEN v_secret_row.adoazonosito_titkositott IS NOT NULL THEN encode(v_secret_row.adoazonosito_titkositott, 'escape') ELSE '' END,
    'bankszamla',   CASE WHEN v_secret_row.bankszamla_titkositott IS NOT NULL THEN encode(v_secret_row.bankszamla_titkositott, 'escape') ELSE '' END,
    'brutto_ber',   CASE WHEN v_secret_row.brutto_ber_titkositott IS NOT NULL THEN encode(v_secret_row.brutto_ber_titkositott, 'escape') ELSE '' END,
    'netto_ber',    CASE WHEN v_secret_row.netto_ber_titkositott IS NOT NULL THEN encode(v_secret_row.netto_ber_titkositott, 'escape') ELSE '' END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

  v_is_hr := public.has_hr_module_access(ARRAY['admin', 'payroll', 'onboarding'], v_company_id);

  IF NOT (p_dolgozo_id = auth.uid() OR v_is_hr) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF (p_brutto_ber IS NOT NULL OR p_netto_ber IS NOT NULL) AND NOT v_is_hr THEN
    RAISE EXCEPTION 'Béradat módosítása csak HR/Admin/Bérügyi számára engedélyezett';
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

  INSERT INTO public.esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas, company_id)
  VALUES (
    'hr_dolgozo_titkos_adat',
    p_dolgozo_id,
    'hr_modositva',
    auth.uid(),
    'Különleges/Titkos HR adat módosítása RPC-n keresztül',
    v_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;


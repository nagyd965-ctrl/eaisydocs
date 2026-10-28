-- 20261028000005_sync_hr_rls_and_rpcs_with_module_permissions.sql
-- Szinkronizálja a PostgreSQL RLS szabályokat és titkosított HR RPC függvényeket
-- a 3 alapszerepkörös (munkavallalo, vezeto, admin) + hr_modulok (Jogosultságkezelő Mátrix) modellel.

-- ============================================================================
-- 1. Központi SQL segédfüggvény: has_hr_module_access(required_modules text[])
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_hr_module_access(p_modules text[] DEFAULT ARRAY['admin'])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
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
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND (
        cm.role IN ('admin', 'owner')
        OR cm.hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi', 'toborzo')
        OR COALESCE(cm.hr_modulok, '{}'::text[]) && p_modules
      )
  );
$$;

-- ============================================================================
-- 2. get_decrypted_hr_data RPC frissítése (admin / payroll modul hozzáféréssel)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_decrypted_hr_data(p_dolgozo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_secret_row RECORD;
  v_result JSONB;
BEGIN
  IF NOT (
    p_dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'payroll', 'onboarding', 'offboarding', 'reports'])
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT * INTO v_secret_row FROM public.hr_dolgozo_titkos_adat WHERE dolgozo_id = p_dolgozo_id;

  INSERT INTO public.esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
  VALUES (
    'hr_dolgozo_titkos_adat',
    p_dolgozo_id,
    'hr_megtekintve',
    auth.uid(),
    'Különleges/Titkos HR adat megtekintése RPC-n keresztül'
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

-- ============================================================================
-- 3. update_decrypted_hr_data RPC frissítése (admin / payroll modul hozzáféréssel)
-- ============================================================================
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
  v_is_hr BOOLEAN;
BEGIN
  v_is_hr := public.has_hr_module_access(ARRAY['admin', 'payroll', 'onboarding']);

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

  INSERT INTO public.esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
  VALUES (
    'hr_dolgozo_titkos_adat',
    p_dolgozo_id,
    'hr_modositva',
    auth.uid(),
    'Különleges/Titkos HR adat módosítása RPC-n keresztül'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. hr_dolgozo_adatlap & hr_dolgozo_titkos_adat RLS szabályok frissítése
-- ============================================================================
DROP POLICY IF EXISTS "Sajat vagy beosztott vagy HR latja adatlapot" ON public.hr_dolgozo_adatlap;
CREATE POLICY "Sajat vagy beosztott vagy HR latja adatlapot" ON public.hr_dolgozo_adatlap
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR id IN (SELECT get_hr_subordinates(auth.uid()))
  OR id IN (SELECT fp.id FROM public.felhasznalo_profil fp WHERE fp.kozvetlen_vezeto_id = auth.uid())
  OR public.has_hr_module_access(ARRAY['admin', 'organization', 'time', 'payroll', 'compliance', 'reports', 'recruitment', 'onboarding', 'offboarding', 'audit'])
);

DROP POLICY IF EXISTS "Csak HR vagy Sajat Titkos adat" ON public.hr_dolgozo_titkos_adat;
CREATE POLICY "Csak HR vagy Sajat Titkos adat" ON public.hr_dolgozo_titkos_adat
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'payroll', 'onboarding', 'offboarding', 'reports'])
);

-- ============================================================================
-- 5. Távollét, Jelenlét, Orvosi, Fegyelmi és Bérpapír RLS szabályok bővítése
-- ============================================================================
DROP POLICY IF EXISTS "Láthatóság: Saját vagy beosztott szabadsága" ON public.hr_tavollet;
CREATE POLICY "Láthatóság: Saját vagy beosztott szabadsága" ON public.hr_tavollet
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR aktualis_jovahagyo_id = auth.uid()
  OR dolgozo_id IN (SELECT get_hr_subordinates(auth.uid()))
  OR dolgozo_id IN (SELECT fp.id FROM public.felhasznalo_profil fp WHERE fp.kozvetlen_vezeto_id = auth.uid())
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'compliance', 'reports'])
);

DROP POLICY IF EXISTS "Vezető, helyettes vagy HR jóváhagyhatja a szabadságot" ON public.hr_tavollet;
CREATE POLICY "Vezető, helyettes vagy HR jóváhagyhatja a szabadságot" ON public.hr_tavollet
FOR UPDATE TO authenticated
USING (
  aktualis_jovahagyo_id = auth.uid()
  OR dolgozo_id IN (SELECT get_hr_subordinates(auth.uid()))
  OR dolgozo_id IN (SELECT fp.id FROM public.felhasznalo_profil fp WHERE fp.kozvetlen_vezeto_id = auth.uid())
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'compliance'])
);

DROP POLICY IF EXISTS "Dolgozó látja saját jelenlétét" ON public.hr_jelenlet;
CREATE POLICY "Dolgozó látja saját jelenlétét" ON public.hr_jelenlet
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR dolgozo_id IN (SELECT get_hr_subordinates(auth.uid()))
  OR dolgozo_id IN (SELECT fp.id FROM public.felhasznalo_profil fp WHERE fp.kozvetlen_vezeto_id = auth.uid())
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'compliance', 'reports'])
);

DROP POLICY IF EXISTS "Dolgozo vagy HR lathatja az orvosi adatokat" ON public.hr_orvosi_vizsgalat;
CREATE POLICY "Dolgozo vagy HR lathatja az orvosi adatokat" ON public.hr_orvosi_vizsgalat
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'compliance', 'time', 'onboarding'])
);

DROP POLICY IF EXISTS "Csak HR vagy munkavedelmi irhat orvosi adatokat" ON public.hr_orvosi_vizsgalat;
CREATE POLICY "Csak HR vagy munkavedelmi irhat orvosi adatokat" ON public.hr_orvosi_vizsgalat
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding'])
);

DROP POLICY IF EXISTS "Dolgozo vagy HR lathatja a fegyelmi ugyeket" ON public.hr_fegyelmi;
CREATE POLICY "Dolgozo vagy HR lathatja a fegyelmi ugyeket" ON public.hr_fegyelmi
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'compliance', 'audit'])
);

DROP POLICY IF EXISTS "Csak HR vagy Admin kezelheti a fegyelmi ugyeket" ON public.hr_fegyelmi;
CREATE POLICY "Csak HR vagy Admin kezelheti a fegyelmi ugyeket" ON public.hr_fegyelmi
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'compliance'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'compliance'])
);

-- ============================================================================
-- 6. hr_jogviszony, hr_beosztas, hr_munkakor és hr_dolgozo_adatlap UPDATE RLS
-- ============================================================================
DROP POLICY IF EXISTS "Sajat maga vagy HR szerkesztheti az adatlapjat" ON public.hr_dolgozo_adatlap;
CREATE POLICY "Sajat maga vagy HR szerkesztheti az adatlapjat" ON public.hr_dolgozo_adatlap
FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'organization', 'onboarding', 'offboarding', 'compliance'])
);

DROP POLICY IF EXISTS "Mindenki latja a sajat jogviszonyat" ON public.hr_jogviszony;
CREATE POLICY "Mindenki latja a sajat jogviszonyat" ON public.hr_jogviszony
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR dolgozo_id IN (SELECT get_hr_subordinates(auth.uid()))
  OR dolgozo_id IN (SELECT fp.id FROM public.felhasznalo_profil fp WHERE fp.kozvetlen_vezeto_id = auth.uid())
  OR public.has_hr_module_access(ARRAY['admin', 'organization', 'time', 'payroll', 'compliance', 'reports', 'recruitment', 'onboarding', 'offboarding', 'audit'])
);

DROP POLICY IF EXISTS "HR és Admin írhatja a jogviszonyt" ON public.hr_jogviszony;
CREATE POLICY "HR és Admin írhatja a jogviszonyt" ON public.hr_jogviszony
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'organization', 'onboarding', 'offboarding'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'organization', 'onboarding', 'offboarding'])
);

DROP POLICY IF EXISTS "HR és Admin írhatja a beosztast" ON public.hr_beosztas;
CREATE POLICY "HR és Admin írhatja a beosztast" ON public.hr_beosztas
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'organization', 'onboarding', 'offboarding'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'organization', 'onboarding', 'offboarding'])
);

DROP POLICY IF EXISTS "HR es Admin modocsithat munkakort" ON public.hr_munkakor;
CREATE POLICY "HR es Admin modocsithat munkakort" ON public.hr_munkakor
FOR UPDATE TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'organization'])
);

DROP POLICY IF EXISTS "HR es Admin torolhet munkakort" ON public.hr_munkakor;
CREATE POLICY "HR es Admin torolhet munkakort" ON public.hr_munkakor
FOR DELETE TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'organization'])
);

-- ============================================================================
-- 10. További HR táblák RLS szabályainak szinkronizálása (hr_dokumentum, bér, cafeteria, munkaidő, megfelelőség)
-- ============================================================================
DROP POLICY IF EXISTS "Dolgozó látja saját dokumentumait" ON public.hr_dokumentum;
CREATE POLICY "Dolgozó látja saját dokumentumait" ON public.hr_dokumentum
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding', 'offboarding', 'payroll', 'audit'])
);

DROP POLICY IF EXISTS "HR szerkeszti a dokumentumokat" ON public.hr_dokumentum;
CREATE POLICY "HR szerkeszti a dokumentumokat" ON public.hr_dokumentum
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding', 'offboarding', 'payroll'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'compliance', 'onboarding', 'offboarding', 'payroll'])
);

DROP POLICY IF EXISTS "HR es Vezetok kezelik a berpapirokat" ON public.hr_berpapir;
CREATE POLICY "HR es Vezetok kezelik a berpapirokat" ON public.hr_berpapir
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'payroll', 'audit'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
);

DROP POLICY IF EXISTS "HR szerkesztheti a cafeteria katalogust" ON public.hr_cafeteria_katalogus;
CREATE POLICY "HR szerkesztheti a cafeteria katalogust" ON public.hr_cafeteria_katalogus
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
);

DROP POLICY IF EXISTS "HR kezeli a cafeteria kereteket" ON public.hr_cafeteria_keret;
CREATE POLICY "HR kezeli a cafeteria kereteket" ON public.hr_cafeteria_keret
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
);

DROP POLICY IF EXISTS "HR kezeli a cafeteria választásokat" ON public.hr_cafeteria_valasztas;
CREATE POLICY "HR kezeli a cafeteria választásokat" ON public.hr_cafeteria_valasztas
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'payroll'])
);

DROP POLICY IF EXISTS "Eseménynapló olvasás HR és Admin számára" ON public.hr_esemeny_naplo;
CREATE POLICY "Eseménynapló olvasás HR és Admin számára" ON public.hr_esemeny_naplo
FOR SELECT TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'audit', 'compliance'])
);

DROP POLICY IF EXISTS "hr_munkavedelmi_oktatas_select_policy" ON public.hr_munkavedelmi_oktatas;
CREATE POLICY "hr_munkavedelmi_oktatas_select_policy" ON public.hr_munkavedelmi_oktatas
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'compliance', 'audit', 'onboarding'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil p
    WHERE p.id = auth.uid() AND p.hr_szerepkor::text IN ('vezeto', 'munkavedelmi', 'auditor')
  )
);

DROP POLICY IF EXISTS "hr_munkavedelmi_oktatas_modify_policy" ON public.hr_munkavedelmi_oktatas;
CREATE POLICY "hr_munkavedelmi_oktatas_modify_policy" ON public.hr_munkavedelmi_oktatas
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'compliance'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil p
    WHERE p.id = auth.uid() AND p.hr_szerepkor::text = 'munkavedelmi'
  )
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'compliance'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil p
    WHERE p.id = auth.uid() AND p.hr_szerepkor::text = 'munkavedelmi'
  )
);

DROP POLICY IF EXISTS "Műszakbeosztások olvasása" ON public.hr_muszak_beosztas;
CREATE POLICY "Műszakbeosztások olvasása" ON public.hr_muszak_beosztas
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'reports', 'audit'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_muszak_beosztas.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és Vezető kezeli a műszakbeosztásokat" ON public.hr_muszak_beosztas;
CREATE POLICY "HR és Vezető kezeli a műszakbeosztásokat" ON public.hr_muszak_beosztas
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'time'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_muszak_beosztas.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'time'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_muszak_beosztas.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és Vezető módosíthatja a sablonokat" ON public.hr_muszak_sablon;
CREATE POLICY "HR és Vezető módosíthatja a sablonokat" ON public.hr_muszak_sablon
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'time'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'time'])
);

DROP POLICY IF EXISTS "HR kezeli a munkaszüneti napokat" ON public.hr_munkaszuneti_nap;
CREATE POLICY "HR kezeli a munkaszüneti napokat" ON public.hr_munkaszuneti_nap
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'time'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'time'])
);

DROP POLICY IF EXISTS "Dolgozó látja saját egyenlegét" ON public.hr_tulora_egyenleg;
CREATE POLICY "Dolgozó látja saját egyenlegét" ON public.hr_tulora_egyenleg
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'reports'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_tulora_egyenleg.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és rendszer módosíthatja" ON public.hr_tulora_egyenleg;
CREATE POLICY "HR és rendszer módosíthatja" ON public.hr_tulora_egyenleg
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'])
);

DROP POLICY IF EXISTS "HR és vezető látja és kezelheti" ON public."hr_tulora_felhasznalás";
CREATE POLICY "HR és vezető látja és kezelheti" ON public."hr_tulora_felhasznalás"
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = "hr_tulora_felhasznalás".dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = "hr_tulora_felhasznalás".dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Dolgozó látja a saját zárását" ON public.hr_havi_jelenlet_zaras;
CREATE POLICY "Dolgozó látja a saját zárását" ON public.hr_havi_jelenlet_zaras
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'reports', 'audit'])
);

DROP POLICY IF EXISTS "HR és Admin kezelheti a zárásokat" ON public.hr_havi_jelenlet_zaras;
CREATE POLICY "HR és Admin kezelheti a zárásokat" ON public.hr_havi_jelenlet_zaras
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'time', 'payroll'])
);

DROP POLICY IF EXISTS "Dolgozo latja sajat jelenlet korrekcioit" ON public.hr_jelenlet_korrekcio;
CREATE POLICY "Dolgozo latja sajat jelenlet korrekcioit" ON public.hr_jelenlet_korrekcio
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR jovahagyo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'audit'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet_korrekcio.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Vezeto vagy HR modolithatja jelenlet korrekciot" ON public.hr_jelenlet_korrekcio;
CREATE POLICY "Vezeto vagy HR modolithatja jelenlet korrekciot" ON public.hr_jelenlet_korrekcio
FOR UPDATE TO authenticated
USING (
  jovahagyo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet_korrekcio.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és Vezető frissítheti a jelenlétet" ON public.hr_jelenlet;
CREATE POLICY "HR és Vezető frissítheti a jelenlétet" ON public.hr_jelenlet
FOR UPDATE TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és Vezető rögzíthet jelenlétet" ON public.hr_jelenlet;
CREATE POLICY "HR és Vezető rögzíthet jelenlétet" ON public.hr_jelenlet
FOR INSERT TO authenticated
WITH CHECK (
  dolgozo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time'])
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Vezetők, helyettesek és HR láthatják a beosztottjaik távol" ON public.hr_tavollet;
CREATE POLICY "Vezetők, helyettesek és HR láthatják a beosztottjaik távol" ON public.hr_tavollet
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR aktualis_jovahagyo_id = auth.uid()
  OR jovahagyo_id = auth.uid()
  OR public.has_hr_module_access(ARRAY['admin', 'time', 'payroll', 'reports', 'audit'])
);

DROP POLICY IF EXISTS "HR latja és szerkesztheti az allashirdeteseket" ON public.hr_allashirdetes;
CREATE POLICY "HR latja és szerkesztheti az allashirdeteseket" ON public.hr_allashirdetes
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'recruitment'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'recruitment'])
);

DROP POLICY IF EXISTS "HR es Admin kezelheti a munkakori leirasokat" ON public.hr_munkakor_leiras_verzio;
CREATE POLICY "HR es Admin kezelheti a munkakori leirasokat" ON public.hr_munkakor_leiras_verzio
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'organization'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'organization'])
);

DROP POLICY IF EXISTS "HR láthatja mindenki nyugtázását" ON public.hr_munkakor_nyugtazas;
CREATE POLICY "HR láthatja mindenki nyugtázását" ON public.hr_munkakor_nyugtazas
FOR SELECT TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'organization', 'compliance', 'audit'])
);

DROP POLICY IF EXISTS "HR és Admin teljes hozzáférés onboarding munkakörhöz" ON public.hr_onboarding_munkakor;
CREATE POLICY "HR és Admin teljes hozzáférés onboarding munkakörhöz" ON public.hr_onboarding_munkakor
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'onboarding', 'organization'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'onboarding', 'organization'])
);

DROP POLICY IF EXISTS "HR irhat kilepes_interju" ON public.hr_kilepes_interju;
CREATE POLICY "HR irhat kilepes_interju" ON public.hr_kilepes_interju
FOR ALL TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'offboarding'])
)
WITH CHECK (
  public.has_hr_module_access(ARRAY['admin', 'offboarding'])
);

DROP POLICY IF EXISTS "HR olvashat kilepes_interju" ON public.hr_kilepes_interju;
CREATE POLICY "HR olvashat kilepes_interju" ON public.hr_kilepes_interju
FOR SELECT TO authenticated
USING (
  public.has_hr_module_access(ARRAY['admin', 'offboarding', 'audit'])
);

DROP POLICY IF EXISTS "A vezető és a HR kezelheti a saját helyettesítéseit" ON public.hr_helyettesites;
CREATE POLICY "A vezető és a HR kezelheti a saját helyettesítéseit" ON public.hr_helyettesites
FOR ALL TO authenticated
USING (
  auth.uid() = vezeto_id
  OR public.has_hr_module_access(ARRAY['admin', 'organization', 'time'])
)
WITH CHECK (
  auth.uid() = vezeto_id
  OR public.has_hr_module_access(ARRAY['admin', 'organization', 'time'])
);


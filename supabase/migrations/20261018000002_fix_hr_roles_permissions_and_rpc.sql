-- 20261018000002_fix_hr_roles_permissions_and_rpc.sql
-- Átfogó szerepkör és jogosultságkezelési javítás (eaisyHR / eaisyDocs)
--
-- 1. Bérügyi (berugyi) hozzáférés biztosítása a titkosított bér, adó és bankszámla adatokhoz (RPC + RLS)
-- 2. Munkavédelmi és bérügyi szerepkörök felvétele a hr_dolgozo_adatlap SELECT szabályba
-- 3. Közvetlen vezetői kapcsolat (kozvetlen_vezeto_id) és company_members cég-specifikus (scoped) szerepkörök támogatása

-- ============================================================================
-- 1. get_decrypted_hr_data RPC javítása
-- ============================================================================
CREATE OR REPLACE FUNCTION get_decrypted_hr_data(p_dolgozo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_secret_row RECORD;
  v_result JSONB;
BEGIN
  -- Jogosultság ellenőrzés:
  -- 1. Saját maga
  -- 2. felhasznalo_profil szerepkör: hr_munkatars, hr_vezeto, admin, berugyi, rendszergazda
  -- 3. company_members tagság: hr_munkatars, hr_vezeto, admin, berugyi, rendszergazda VAGY owner/admin role
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
        AND (
          hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR 
          szerepkor::text    IN ('hr_vezeto', 'admin', 'rendszergazda') OR
          docs_szerepkor::text IN ('hr_vezeto', 'admin', 'rendszergazda')
        )
    ) OR
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND (
          cm.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR
          cm.role IN ('admin', 'owner')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT * INTO v_secret_row FROM hr_dolgozo_titkos_adat WHERE dolgozo_id = p_dolgozo_id;

  -- Kötelező audit napló bejegyzés minden megtekintéskor
  INSERT INTO esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
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
-- 2. update_decrypted_hr_data RPC javítása
-- ============================================================================
CREATE OR REPLACE FUNCTION update_decrypted_hr_data(
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
  -- Alap jogosultság: saját maga VAGY HR/Admin/Bérügyi/Rendszergazda
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
        AND (
          hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR 
          szerepkor::text    IN ('hr_vezeto', 'admin', 'rendszergazda') OR
          docs_szerepkor::text IN ('hr_vezeto', 'admin', 'rendszergazda')
        )
    ) OR
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND (
          cm.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR
          cm.role IN ('admin', 'owner')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Bérmező írás: csak HR/Admin/Bérügyi/Rendszergazda
  v_is_hr := EXISTS (
    SELECT 1 FROM felhasznalo_profil 
    WHERE id = auth.uid() 
      AND (
        hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR 
        szerepkor::text    IN ('hr_vezeto', 'admin', 'rendszergazda') OR
        docs_szerepkor::text IN ('hr_vezeto', 'admin', 'rendszergazda')
      )
  ) OR EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
      AND (
        cm.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR
        cm.role IN ('admin', 'owner')
      )
  );

  IF (p_brutto_ber IS NOT NULL OR p_netto_ber IS NOT NULL) AND NOT v_is_hr THEN
    RAISE EXCEPTION 'Béradat módosítása csak HR/Admin/Bérügyi számára engedélyezett';
  END IF;

  -- Upsert: csak a megadott (nem-NULL) paramétereket frissítjük
  INSERT INTO hr_dolgozo_titkos_adat (
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

  INSERT INTO esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
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
-- 3. hr_dolgozo_adatlap SELECT RLS Policy bővítése
-- ============================================================================
DROP POLICY IF EXISTS "Sajat vagy beosztott vagy HR latja adatlapot" ON hr_dolgozo_adatlap;
CREATE POLICY "Sajat vagy beosztott vagy HR latja adatlapot" ON hr_dolgozo_adatlap 
FOR SELECT TO authenticated 
USING (
  id = auth.uid() OR 
  id IN (SELECT get_hr_subordinates(auth.uid())) OR
  id IN (SELECT fp.id FROM felhasznalo_profil fp WHERE fp.kozvetlen_vezeto_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil 
    WHERE id = auth.uid() 
      AND (
        hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi') OR 
        szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor') OR
        docs_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor')
      )
  ) OR
  EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
      AND (
        cm.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor', 'berugyi', 'munkavedelmi') OR
        cm.role IN ('admin', 'owner')
      )
  )
);


-- ============================================================================
-- 4. hr_dolgozo_titkos_adat SELECT RLS Policy bővítése
-- ============================================================================
DROP POLICY IF EXISTS "Csak HR vagy Sajat Titkos adat" ON hr_dolgozo_titkos_adat;
CREATE POLICY "Csak HR vagy Sajat Titkos adat" ON hr_dolgozo_titkos_adat
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM felhasznalo_profil 
    WHERE id = auth.uid() 
      AND (
        hr_szerepkor::text IN ('hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR 
        szerepkor::text IN ('hr_vezeto', 'admin', 'rendszergazda') OR
        docs_szerepkor::text IN ('hr_vezeto', 'admin', 'rendszergazda')
      )
  ) OR
  EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
      AND (
        cm.hr_szerepkor IN ('hr_vezeto', 'admin', 'berugyi', 'rendszergazda') OR
        cm.role IN ('admin', 'owner')
      )
  )
);

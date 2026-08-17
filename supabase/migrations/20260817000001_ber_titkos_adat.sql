-- 20260817000001_ber_titkos_adat.sql
-- Béradatok hozzáadása a meglévő hr_dolgozo_titkos_adat táblához
-- A bruttó és nettó bér ugyanolyan BYTEA titkosítással tárolódik, mint a TAJ/adóazonosító.
-- Írási jog: csak HR szerepkör (az RPC-ben ellenőrizve)
-- Olvasási jog: saját maga (read-only a dolgozói portálon) + HR/Admin

-- 1. Új oszlopok hozzáadása a meglévő táblához
ALTER TABLE hr_dolgozo_titkos_adat
  ADD COLUMN IF NOT EXISTS brutto_ber_titkositott BYTEA,
  ADD COLUMN IF NOT EXISTS netto_ber_titkositott  BYTEA;

-- 2. get_decrypted_hr_data RPC frissítése – visszaadja az új bérmezőket is
CREATE OR REPLACE FUNCTION get_decrypted_hr_data(p_dolgozo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_secret_row RECORD;
  v_result JSONB;
BEGIN
  -- Jogosultság ellenőrzés: saját maga VAGY HR/Admin
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
        AND (
          hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin') OR 
          szerepkor::text    IN ('hr_vezeto', 'admin') OR
          docs_szerepkor::text IN ('hr_vezeto', 'admin')
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
    'taj_szam',    encode(v_secret_row.taj_szam_titkositott,    'escape'),
    'adoazonosito', encode(v_secret_row.adoazonosito_titkositott, 'escape'),
    'bankszamla',  encode(v_secret_row.bankszamla_titkositott,  'escape'),
    'brutto_ber',  encode(v_secret_row.brutto_ber_titkositott,  'escape'),
    'netto_ber',   encode(v_secret_row.netto_ber_titkositott,   'escape')
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. update_decrypted_hr_data RPC frissítése
--    - A TAJ/adóazonosító/bankszámla mezőket a dolgozó maga is frissítheti (korábbi viselkedés).
--    - A bruttó/nettó bérmezőket CSAK HR/Admin írhatja.
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
  -- Alap jogosultság: saját maga VAGY HR/Admin
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
        AND (
          hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin') OR 
          szerepkor::text    IN ('hr_vezeto', 'admin') OR
          docs_szerepkor::text IN ('hr_vezeto', 'admin')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Bérmező írás: csak HR/Admin
  v_is_hr := EXISTS (
    SELECT 1 FROM felhasznalo_profil 
    WHERE id = auth.uid() 
      AND (
        hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin') OR 
        szerepkor::text    IN ('hr_vezeto', 'admin') OR
        docs_szerepkor::text IN ('hr_vezeto', 'admin')
      )
  );

  IF (p_brutto_ber IS NOT NULL OR p_netto_ber IS NOT NULL) AND NOT v_is_hr THEN
    RAISE EXCEPTION 'Béradat módosítása csak HR/Admin számára engedélyezett';
  END IF;

  -- Upsert: csak a nem-NULL paramétereket frissítjük
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
    taj_szam_titkositott     = CASE WHEN p_taj_szam     IS NOT NULL THEN decode(p_taj_szam, 'escape')     ELSE hr_dolgozo_titkos_adat.taj_szam_titkositott     END,
    adoazonosito_titkositott = CASE WHEN p_adoazonosito IS NOT NULL THEN decode(p_adoazonosito, 'escape') ELSE hr_dolgozo_titkos_adat.adoazonosito_titkositott END,
    bankszamla_titkositott   = CASE WHEN p_bankszamla   IS NOT NULL THEN decode(p_bankszamla, 'escape')   ELSE hr_dolgozo_titkos_adat.bankszamla_titkositott   END,
    brutto_ber_titkositott   = CASE WHEN p_brutto_ber   IS NOT NULL THEN decode(p_brutto_ber, 'escape')   ELSE hr_dolgozo_titkos_adat.brutto_ber_titkositott   END,
    netto_ber_titkositott    = CASE WHEN p_netto_ber    IS NOT NULL THEN decode(p_netto_ber, 'escape')    ELSE hr_dolgozo_titkos_adat.netto_ber_titkositott    END;

  -- Audit napló minden módosításkor
  INSERT INTO esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
  VALUES (
    'hr_dolgozo_titkos_adat',
    p_dolgozo_id,
    'hr_modositva',
    auth.uid(),
    CASE 
      WHEN v_is_hr AND (p_brutto_ber IS NOT NULL OR p_netto_ber IS NOT NULL)
        THEN 'HR/Admin módosította a dolgozó béradatait'
      ELSE 'Különleges/Titkos HR adat módosítása RPC-n keresztül'
    END
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

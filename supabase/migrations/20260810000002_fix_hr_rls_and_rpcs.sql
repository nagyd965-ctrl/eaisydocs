-- 20260810000002_fix_hr_rls_and_rpcs.sql

-- 1. Decrypt function update with hr_szerepkor check + legacy check
CREATE OR REPLACE FUNCTION get_decrypted_hr_data(p_dolgozo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_secret_row RECORD;
  v_result JSONB;
BEGIN
  -- Verify permission (must be HR Leader, Admin or self)
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
        AND (
          hr_szerepkor::text IN ('hr_vezeto', 'admin') OR 
          szerepkor::text IN ('hr_vezeto', 'admin') OR
          docs_szerepkor::text IN ('hr_vezeto', 'admin')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT * INTO v_secret_row FROM hr_dolgozo_titkos_adat WHERE dolgozo_id = p_dolgozo_id;

  -- Create forced audit log!
  INSERT INTO esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
  VALUES ('hr_dolgozo_titkos_adat', p_dolgozo_id, 'hr_megtekintve', auth.uid(), 'Különleges/Titkos HR adat megtekintése RPC-n keresztül');

  v_result := jsonb_build_object(
    'taj_szam', encode(v_secret_row.taj_szam_titkositott, 'escape'),
    'adoazonosito', encode(v_secret_row.adoazonosito_titkositott, 'escape'),
    'bankszamla', encode(v_secret_row.bankszamla_titkositott, 'escape')
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Encrypt function update with hr_szerepkor check + legacy check
CREATE OR REPLACE FUNCTION update_decrypted_hr_data(
  p_dolgozo_id UUID,
  p_taj_szam TEXT,
  p_adoazonosito TEXT,
  p_bankszamla TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Verify permission (must be HR Leader, Admin or self)
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
        AND (
          hr_szerepkor::text IN ('hr_vezeto', 'admin') OR 
          szerepkor::text IN ('hr_vezeto', 'admin') OR
          docs_szerepkor::text IN ('hr_vezeto', 'admin')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Upsert (Beszúrás vagy Frissítés) a titkos táblába
  INSERT INTO hr_dolgozo_titkos_adat (dolgozo_id, taj_szam_titkositott, adoazonosito_titkositott, bankszamla_titkositott)
  VALUES (
    p_dolgozo_id, 
    decode(p_taj_szam, 'escape'),
    decode(p_adoazonosito, 'escape'),
    decode(p_bankszamla, 'escape')
  )
  ON CONFLICT (dolgozo_id) DO UPDATE 
  SET 
    taj_szam_titkositott = EXCLUDED.taj_szam_titkositott,
    adoazonosito_titkositott = EXCLUDED.adoazonosito_titkositott,
    bankszamla_titkositott = EXCLUDED.bankszamla_titkositott;

  -- Audit log!
  INSERT INTO esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
  VALUES ('hr_dolgozo_titkos_adat', p_dolgozo_id, 'hr_modositva', auth.uid(), 'Különleges/Titkos HR adat módosítása RPC-n keresztül');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Policy update for hr_dolgozo_titkos_adat
DROP POLICY IF EXISTS "Csak HR vagy Sajat Titkos adat" ON hr_dolgozo_titkos_adat;
CREATE POLICY "Csak HR vagy Sajat Titkos adat" ON hr_dolgozo_titkos_adat
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM felhasznalo_profil 
    WHERE id = auth.uid() 
      AND (
        hr_szerepkor::text IN ('hr_vezeto', 'admin') OR 
        szerepkor::text IN ('hr_vezeto', 'admin') OR
        docs_szerepkor::text IN ('hr_vezeto', 'admin')
      )
  )
);

-- 4. Policy update for hr_dolgozo_adatlap
DROP POLICY IF EXISTS "Sajat vagy beosztott vagy HR latja adatlapot" ON hr_dolgozo_adatlap;
CREATE POLICY "Sajat vagy beosztott vagy HR latja adatlapot" ON hr_dolgozo_adatlap 
FOR SELECT TO authenticated 
USING (
  id = auth.uid() OR 
  id IN (SELECT get_hr_subordinates(auth.uid())) OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil 
    WHERE id = auth.uid() 
      AND (
        hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor') OR 
        szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor') OR
        docs_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda', 'auditor')
      )
  )
);

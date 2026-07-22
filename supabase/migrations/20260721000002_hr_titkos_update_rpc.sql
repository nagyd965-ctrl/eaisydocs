-- 20260721000002_hr_titkos_update_rpc.sql
-- Add the missing enum value for the audit log
ALTER TYPE esemeny_tipus ADD VALUE IF NOT EXISTS 'hr_modositva';

-- RPC a dolgozó titkos adatainak biztonságos frissítésére
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
    (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Upsert (Beszúrás vagy Frissítés) a titkos táblába
  INSERT INTO hr_dolgozo_titkos_adat (dolgozo_id, taj_szam_titkositott, adoazonosito_titkositott, bankszamla_titkositott)
  VALUES (
    p_dolgozo_id, 
    decode(p_taj_szam, 'escape'), -- Placeholder for pgcrypto
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

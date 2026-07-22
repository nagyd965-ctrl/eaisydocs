-- 20260721000001_eaisyhr_backend_core.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alter enums safely (PostgreSQL 12+ supports this outside transaction blocks)
ALTER TYPE esemeny_tipus ADD VALUE IF NOT EXISTS 'hr_jovahagyva';
ALTER TYPE esemeny_tipus ADD VALUE IF NOT EXISTS 'hr_elutasitva';
ALTER TYPE esemeny_tipus ADD VALUE IF NOT EXISTS 'hr_megtekintve';

ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'hr_munkatars';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'hr_vezeto';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'vezeto';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'berugyi';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'toborzo';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'munkavedelmi';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'rendszergazda';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'auditor';
ALTER TYPE user_szerepkor ADD VALUE IF NOT EXISTS 'munkavallalo';

-- Enums
CREATE TYPE hr_toborzas_statusz AS ENUM ('uj', 'eloszurt', 'interju', 'ajanlat', 'elfogadva', 'elutasitva');
CREATE TYPE hr_tavollet_tipus AS ENUM ('szabadsag', 'beteg', 'fizetetlen', 'apasan', 'tanulmanyi');
CREATE TYPE hr_tavollet_statusz AS ENUM ('tervezet', 'jovahagyasra_var', 'jovahagyva', 'elutasitva');
CREATE TYPE hr_kpi_statusz AS ENUM ('kivalo', 'megfelelo', 'fejlesztendo', 'nem_megfelelo');

-- Add modules array to felhasznalo_profil
ALTER TABLE felhasznalo_profil ADD COLUMN IF NOT EXISTS elerheto_modulok text[] DEFAULT '{docs}';

-- HR Tables
CREATE TABLE hr_munkakor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    megnevezes TEXT NOT NULL,
    feor_kod TEXT,
    szervezeti_egyseg_id UUID REFERENCES szervezeti_egyseg(id) ON DELETE RESTRICT,
    besorolasi_szint TEXT,
    kockazat_tipusa TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_dolgozo_adatlap (
    id UUID PRIMARY KEY REFERENCES felhasznalo_profil(id) ON DELETE RESTRICT,
    munkakor_id UUID REFERENCES hr_munkakor(id) ON DELETE RESTRICT,
    lakcim TEXT,
    szuletesi_ido DATE,
    anyja_neve TEXT,
    belepes_datuma DATE,
    orvosi_alkalmassag_ervenyesseg DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_dolgozo_titkos_adat (
    dolgozo_id UUID PRIMARY KEY REFERENCES hr_dolgozo_adatlap(id) ON DELETE RESTRICT,
    taj_szam_titkositott BYTEA,
    adoazonosito_titkositott BYTEA,
    bankszamla_titkositott BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_toborzas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nev TEXT NOT NULL,
    email TEXT NOT NULL,
    megpalyazott_munkakor_id UUID REFERENCES hr_munkakor(id) ON DELETE RESTRICT,
    statusz hr_toborzas_statusz DEFAULT 'uj',
    cv_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_tavollet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES hr_dolgozo_adatlap(id) ON DELETE RESTRICT,
    kezdet_datuma DATE NOT NULL,
    veg_datuma DATE NOT NULL,
    tipus hr_tavollet_tipus NOT NULL,
    statusz hr_tavollet_statusz DEFAULT 'tervezet',
    jovahagyo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_teljesitmeny (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES hr_dolgozo_adatlap(id) ON DELETE RESTRICT,
    ertekeles_datuma DATE NOT NULL,
    ertekelt_idoszak TEXT,
    pontszam INTEGER,
    kpi_statusz hr_kpi_statusz,
    ertekeles_szovege TEXT,
    ertekeles_keszito_id UUID REFERENCES felhasznalo_profil(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recursive CTE Helper Function for RLS
CREATE OR REPLACE FUNCTION get_hr_subordinates(p_manager_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    SELECT id, szulo_id FROM szervezeti_egyseg 
    WHERE id = (SELECT szervezeti_egyseg_id FROM felhasznalo_profil WHERE id = p_manager_id)
    UNION
    SELECT se.id, se.szulo_id FROM szervezeti_egyseg se
    INNER JOIN subordinates s ON se.szulo_id = s.id
  )
  SELECT fp.id FROM felhasznalo_profil fp
  WHERE fp.szervezeti_egyseg_id IN (SELECT id FROM subordinates);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Enable
ALTER TABLE hr_munkakor ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_dolgozo_adatlap ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_dolgozo_titkos_adat ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_toborzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_tavollet ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_teljesitmeny ENABLE ROW LEVEL SECURITY;

-- Basic Read Policies (Simplified strict ABAC/RBAC)
CREATE POLICY "Munkaköröket mindenki latja akinek van HR modulja" ON hr_munkakor 
FOR SELECT TO authenticated 
USING ( (SELECT elerheto_modulok FROM felhasznalo_profil WHERE id = auth.uid()) @> '{hr}'::text[] );

CREATE POLICY "Sajat vagy beosztott vagy HR latja adatlapot" ON hr_dolgozo_adatlap 
FOR SELECT TO authenticated 
USING (
  id = auth.uid() OR 
  id IN (SELECT get_hr_subordinates(auth.uid())) OR
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

CREATE POLICY "Csak HR vagy Sajat Titkos adat" ON hr_dolgozo_titkos_adat
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR 
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'admin')
);

-- Triggers (Audit Log hook for the new tables)
CREATE TRIGGER audit_hr_munkakor
  AFTER INSERT OR UPDATE OR DELETE ON hr_munkakor
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

CREATE TRIGGER audit_hr_dolgozo_adatlap
  AFTER INSERT OR UPDATE OR DELETE ON hr_dolgozo_adatlap
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

CREATE TRIGGER audit_hr_toborzas
  AFTER INSERT OR UPDATE OR DELETE ON hr_toborzas
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

CREATE TRIGGER audit_hr_tavollet
  AFTER INSERT OR UPDATE OR DELETE ON hr_tavollet
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

-- Secure RPC for accessing secret data with forced audit log
CREATE OR REPLACE FUNCTION get_decrypted_hr_data(p_dolgozo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_secret_row RECORD;
  v_result JSONB;
BEGIN
  -- Verify permission (must be HR Leader, Admin or self)
  IF NOT (
    p_dolgozo_id = auth.uid() OR 
    (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_vezeto', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT * INTO v_secret_row FROM hr_dolgozo_titkos_adat WHERE dolgozo_id = p_dolgozo_id;

  -- Create forced audit log!
  INSERT INTO esemeny_naplo (entitas_tipus, entitas_id, esemeny_tipus, user_id, indoklas)
  VALUES ('hr_dolgozo_titkos_adat', p_dolgozo_id, 'hr_megtekintve', auth.uid(), 'Különleges/Titkos HR adat megtekintése RPC-n keresztül');

  v_result := jsonb_build_object(
    'taj_szam', encode(v_secret_row.taj_szam_titkositott, 'escape'), -- Placeholder logic for actual pgcrypto decrypt
    'adoazonosito', encode(v_secret_row.adoazonosito_titkositott, 'escape'),
    'bankszamla', encode(v_secret_row.bankszamla_titkositott, 'escape')
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

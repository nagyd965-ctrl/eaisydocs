-- Új tábla az ügyszám allokációhoz
CREATE TABLE ugyszam_allokacio (
    ev INTEGER PRIMARY KEY,
    utolso_sorszam INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE ugyszam_allokacio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on ugyszam_allokacio" ON ugyszam_allokacio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Iktatószám generáló RPC (Postgres függvény)
CREATE OR REPLACE FUNCTION generate_iktatoszam(p_ev INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sorszam INTEGER;
  v_iktatoszam TEXT;
BEGIN
  INSERT INTO iktatoszam_allokacio (ev, utolso_sorszam)
  VALUES (p_ev, 1)
  ON CONFLICT (ev) DO UPDATE 
  SET utolso_sorszam = iktatoszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;
  
  -- Generált szám: I/2026/00001
  v_iktatoszam := 'I/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_iktatoszam;
END;
$$;

-- Ügyszám generáló RPC (Postgres függvény)
CREATE OR REPLACE FUNCTION generate_ugyszam(p_ev INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sorszam INTEGER;
  v_ugyszam TEXT;
BEGIN
  INSERT INTO ugyszam_allokacio (ev, utolso_sorszam)
  VALUES (p_ev, 1)
  ON CONFLICT (ev) DO UPDATE 
  SET utolso_sorszam = ugyszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;
  
  -- Generált szám: U/2026/00001
  v_ugyszam := 'U/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_ugyszam;
END;
$$;

-- Seed: Irattári terv mintaadatok
INSERT INTO irattari_terv (tetelszam, megnevezes, megorzesi_ido_ev, selejtezheto)
VALUES 
  ('1.1', 'Általános adminisztráció és levelezés', 5, true),
  ('2.1', 'Pénzügyi és Számviteli iratok', 8, true),
  ('3.1', 'HR és Munkaügyi dokumentumok', 50, false),
  ('4.1', 'Szerződések és Jogi dokumentumok', 10, true)
ON CONFLICT (tetelszam) DO NOTHING;

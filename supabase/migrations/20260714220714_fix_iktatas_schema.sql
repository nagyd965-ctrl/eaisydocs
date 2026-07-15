-- 1. Add alszam to irat table
ALTER TABLE irat ADD COLUMN alszam INTEGER;

-- 2. Modify generate_iktatoszam to accept a prefix
DROP FUNCTION IF EXISTS generate_iktatoszam(INTEGER);
CREATE OR REPLACE FUNCTION generate_iktatoszam(p_ev INTEGER, p_prefix TEXT)
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
  
  -- Generált szám: PENZUGY/2026/00001
  v_iktatoszam := p_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_iktatoszam;
END;
$$;

-- 3. Modify generate_ugyszam to accept a prefix
DROP FUNCTION IF EXISTS generate_ugyszam(INTEGER);
CREATE OR REPLACE FUNCTION generate_ugyszam(p_ev INTEGER, p_prefix TEXT)
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
  
  -- Generált szám: PENZUGY/2026/00001
  v_ugyszam := p_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_ugyszam;
END;
$$;

-- 1. Tábla létrehozása az érkeztetőszámok kiosztásához
CREATE TABLE erkeztetoszam_allokacio (
    ev INTEGER PRIMARY KEY,
    utolso_sorszam INTEGER NOT NULL DEFAULT 0
);

-- 2. RLS bekapcsolása (bár az IMAP robot service_role-lal hívja, de manuális érkeztetésnél kell)
ALTER TABLE erkeztetoszam_allokacio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on erkeztetoszam_allokacio" ON erkeztetoszam_allokacio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Függvény az érkeztetőszám (E/Év-Sorszám) biztonságos, tranzakcionális kiosztásához
CREATE OR REPLACE FUNCTION generate_erkeztetoszam(p_ev INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sorszam INTEGER;
  v_erkeztetoszam TEXT;
BEGIN
  -- Év beszúrása 0-s kezdőértékkel, ha még nem létezik (ON CONFLICT DO NOTHING)
  INSERT INTO erkeztetoszam_allokacio (ev, utolso_sorszam)
  VALUES (p_ev, 0)
  ON CONFLICT (ev) DO NOTHING;

  -- Sorszám atombiztos növelése és kiolvasása sor szintű zárolással (UPDATE RETURNING)
  UPDATE erkeztetoszam_allokacio
  SET utolso_sorszam = erkeztetoszam_allokacio.utolso_sorszam + 1
  WHERE ev = p_ev
  RETURNING utolso_sorszam INTO v_sorszam;

  -- Formázás: E/YYYY-XXXXX (pl. E/2026-00001)
  v_erkeztetoszam := 'E/' || p_ev::TEXT || '-' || lpad(v_sorszam::TEXT, 5, '0');
  
  RETURN v_erkeztetoszam;
END;
$$;

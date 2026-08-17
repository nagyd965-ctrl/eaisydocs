-- eaisyBill integráció: külső hivatkozás mezők az irat táblában
ALTER TABLE irat
  ADD COLUMN IF NOT EXISTS kulso_forras TEXT,         -- pl. 'eaisybill'
  ADD COLUMN IF NOT EXISTS kulso_hivatkozas_id TEXT;  -- eaisyBill invoice UUID

-- Külső fájl URL tárolás irat_fajl táblában (nem töltjük fel a Storage-ba)
ALTER TABLE irat_fajl
  ADD COLUMN IF NOT EXISTS kulso_fajl_url TEXT,       -- eaisyBill public storage URL
  ALTER COLUMN storage_path DROP NOT NULL;             -- külső iratoknál nincs helyi storage path

-- Index a duplikáció ellenőrzéshez
CREATE INDEX IF NOT EXISTS idx_irat_kulso_hivatkozas
  ON irat (kulso_forras, kulso_hivatkozas_id)
  WHERE kulso_hivatkozas_id IS NOT NULL;

-- Komment dokumentáció
COMMENT ON COLUMN irat.kulso_forras IS 'Külső forrásrendszer neve (pl. eaisybill). NULL = manuálisan érkezett.';
COMMENT ON COLUMN irat.kulso_hivatkozas_id IS 'A forrásrendszerben lévő rekord UUID azonosítója.';
COMMENT ON COLUMN irat_fajl.kulso_fajl_url IS 'Ha a fájl külső rendszerben van, ide kerül a public URL. Ilyenkor storage_path NULL.';

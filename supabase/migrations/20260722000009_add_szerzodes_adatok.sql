-- 20260722000009_add_szerzodes_adatok.sql

ALTER TABLE hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS szerzodes_tipusa TEXT DEFAULT 'határozatlan',
  ADD COLUMN IF NOT EXISTS munkaviszony_vege DATE;

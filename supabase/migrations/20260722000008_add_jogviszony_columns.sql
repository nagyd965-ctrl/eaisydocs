-- Add employment specific columns to hr_dolgozo_adatlap

ALTER TABLE hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS munkaviszony_tipusa TEXT,
  ADD COLUMN IF NOT EXISTS munkaido_fte NUMERIC,
  ADD COLUMN IF NOT EXISTS munkarend TEXT,
  ADD COLUMN IF NOT EXISTS berkategoria TEXT,
  ADD COLUMN IF NOT EXISTS kozvetlen_vezeto TEXT;

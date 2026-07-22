-- Add personal info columns to hr_dolgozo_adatlap

ALTER TABLE hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS szuletesi_datum DATE,
  ADD COLUMN IF NOT EXISTS anyja_neve TEXT,
  ADD COLUMN IF NOT EXISTS telefonszam TEXT;

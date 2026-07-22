-- Add standalone columns to hr_dolgozo_adatlap for HR demo purposes
ALTER TABLE hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS nev TEXT,
  ADD COLUMN IF NOT EXISTS pozicio TEXT,
  ADD COLUMN IF NOT EXISTS szervezeti_egyseg TEXT,
  ADD COLUMN IF NOT EXISTS statusz TEXT;
  
-- Remove foreign key to felhasznalo_profil so we can insert mock employees without auth.users
ALTER TABLE hr_dolgozo_adatlap DROP CONSTRAINT IF EXISTS hr_dolgozo_adatlap_id_fkey;

-- Since id is no longer a foreign key to felhasznalo_profil, we need it to default to uuid if it doesn't already
ALTER TABLE hr_dolgozo_adatlap ALTER COLUMN id SET DEFAULT gen_random_uuid();

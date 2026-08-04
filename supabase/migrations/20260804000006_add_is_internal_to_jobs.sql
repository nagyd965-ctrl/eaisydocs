-- Add is_internal column to hr_allashirdetes
ALTER TABLE hr_allashirdetes 
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

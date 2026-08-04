-- Add fields for vacation balance calculation
ALTER TABLE hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS gyermekek_szama INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS megvaltozott_munkakepessegu BOOLEAN DEFAULT FALSE;

-- Add naptar_jegyzet column to hr_toborzas
ALTER TABLE hr_toborzas ADD COLUMN IF NOT EXISTS naptar_jegyzet TEXT;

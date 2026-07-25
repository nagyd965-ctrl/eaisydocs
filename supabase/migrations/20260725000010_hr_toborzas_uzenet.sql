-- Add uzenet column to hr_toborzas for candidate introduction/motivation
ALTER TABLE hr_toborzas ADD COLUMN IF NOT EXISTS uzenet TEXT;

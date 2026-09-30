-- Migracio: erkezes_modja ENUM bovitese + eaisyBill rekordok frissitese
-- Az eaisyBill importok korabban 'rendszer' ertekkel lettek mentve.

-- 1. ENUM bovitese
ALTER TYPE erkezes_modja ADD VALUE IF NOT EXISTS 'eaisybill';

-- 2. Meglevo eaisyBill importok frissitese
UPDATE irat
SET erkezes_modja = 'eaisybill'
WHERE kulso_forras = 'eaisybill'
  AND erkezes_modja = 'rendszer';

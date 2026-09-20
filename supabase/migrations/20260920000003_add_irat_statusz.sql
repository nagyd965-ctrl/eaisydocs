-- Hozzáadjuk a statusz mezőt az irat táblához (erkeztetve, iktatva, nem_iktatando)
ALTER TABLE irat ADD COLUMN IF NOT EXISTS statusz TEXT DEFAULT 'erkeztetve';

-- Frissítjük a meglévő iratok státuszát
UPDATE irat SET statusz = 'iktatva' WHERE ugyirat_id IS NOT NULL AND (statusz IS NULL OR statusz = 'erkeztetve');

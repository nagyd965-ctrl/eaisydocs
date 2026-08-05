-- Add iktato_prefix column to szervezeti_egyseg
ALTER TABLE szervezeti_egyseg ADD COLUMN iktato_prefix TEXT;

-- Seed prefixes for existing departments
UPDATE szervezeti_egyseg SET iktato_prefix = 'PENZUGY' WHERE nev ILIKE '%pénzügy%';
UPDATE szervezeti_egyseg SET iktato_prefix = 'HR' WHERE nev ILIKE '%hr%' OR nev ILIKE '%munkaügy%';
UPDATE szervezeti_egyseg SET iktato_prefix = 'JOGI' WHERE nev ILIKE '%jog%';
UPDATE szervezeti_egyseg SET iktato_prefix = 'UGYFELSZOLGALAT' WHERE nev ILIKE '%ügyfélszolgálat%';
UPDATE szervezeti_egyseg SET iktato_prefix = 'IT' WHERE nev ILIKE '%informatika%';
UPDATE szervezeti_egyseg SET iktato_prefix = 'ALT' WHERE iktato_prefix IS NULL;

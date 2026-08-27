-- Partner típus (cég, magánszemély, egyéni vállalkozó, hatóság/intézmény) és további mezők hozzáadása
ALTER TABLE public.partner ADD COLUMN IF NOT EXISTS tipus TEXT DEFAULT 'ceg';
ALTER TABLE public.partner ADD COLUMN IF NOT EXISTS cim TEXT;
ALTER TABLE public.partner ADD COLUMN IF NOT EXISTS telefonszam TEXT;

-- Meglévő rekordok kitöltése (alapértelmezett: ceg)
UPDATE public.partner 
SET tipus = CASE 
  WHEN nev ILIKE '%kft%' OR nev ILIKE '%zrt%' OR nev ILIKE '%bt%' OR nev ILIKE '%kkt%' OR nev ILIKE '%nyrt%' OR nev ILIKE '%ev%' OR nev ILIKE '%kht%' OR nev ILIKE '%kft.%' THEN 'ceg'
  WHEN nev ILIKE '%dániel nagy%' OR nev ILIKE '%nagy dániel%' THEN 'maganszemely'
  ELSE 'ceg'
END
WHERE tipus IS NULL;

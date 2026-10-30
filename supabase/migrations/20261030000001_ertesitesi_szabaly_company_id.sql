-- Értesítési szabályok cég-specifikussá tétele (multi-tenant)
-- A 20261008000001 multitenancy migráció nem terjedt ki erre a táblára.

-- 1) company_id oszlop hozzáadása
ALTER TABLE public.ertesitesi_szabaly
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2) Backfill: meglévő sorok az első (default) céghez rendelése
UPDATE public.ertesitesi_szabaly
SET company_id = (SELECT id FROM public.companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL;

-- 3) NOT NULL kényszer
ALTER TABLE public.ertesitesi_szabaly ALTER COLUMN company_id SET NOT NULL;

-- 4) UNIQUE constraint bővítése company_id-val
ALTER TABLE public.ertesitesi_szabaly
DROP CONSTRAINT IF EXISTS ertesitesi_szabaly_esemeny_tipus_kinek_key;
ALTER TABLE public.ertesitesi_szabaly
ADD CONSTRAINT ertesitesi_szabaly_esemeny_tipus_kinek_company_key
UNIQUE(esemeny_tipus, kinek, company_id);

-- 5) Index a gyors cég-szűrt lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_ertesitesi_szabaly_company ON public.ertesitesi_szabaly(company_id);

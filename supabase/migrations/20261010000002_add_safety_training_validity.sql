-- ==============================================================================
-- 20261010000002_add_safety_training_validity.sql
-- Munkavédelmi és tűzvédelmi oktatás érvényességi mező (Mvt. 55. §, Ttv. 22. §)
-- ==============================================================================

-- 1. ervenyesseg_vege oszlop hozzáadása a hr_munkavedelmi_oktatas táblához
ALTER TABLE public.hr_munkavedelmi_oktatas 
ADD COLUMN IF NOT EXISTS ervenyesseg_vege DATE;

-- 2. Meglévő oktatások érvényességének automatikus feltöltése (oktatás dátuma + 1 év)
UPDATE public.hr_munkavedelmi_oktatas
SET ervenyesseg_vege = (oktatas_datuma + INTERVAL '1 year')::date
WHERE ervenyesseg_vege IS NULL;

-- 3. Index az érvényességi dátum szerinti gyors szűréshez és lejárati riasztásokhoz
CREATE INDEX IF NOT EXISTS idx_hr_munkavedelmi_oktatas_ervenyesseg 
ON public.hr_munkavedelmi_oktatas(ervenyesseg_vege);

-- 4. Kommentár
COMMENT ON COLUMN public.hr_munkavedelmi_oktatas.ervenyesseg_vege IS 'Munkavédelmi és tűzvédelmi oktatás hatályossága/érvényességének lejárata (alapértelmezetten oktatás + 1 év)';

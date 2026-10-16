-- 20261016000001_notification_log_module_separation.sql
-- Értesítési napló moduláris szétválasztása (eaisyDocs vs eaisyHR) és multi-tenancy (company_id)

-- 1. Új oszlopok hozzáadása az ertesites_naplo táblához
ALTER TABLE public.ertesites_naplo 
ADD COLUMN IF NOT EXISTS modul TEXT NOT NULL DEFAULT 'docs' CHECK (modul IN ('docs', 'hr'));

ALTER TABLE public.ertesites_naplo 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 2. Teljesítmény-optimalizáló indexek
CREATE INDEX IF NOT EXISTS idx_ertesites_naplo_modul ON public.ertesites_naplo (modul);
CREATE INDEX IF NOT EXISTS idx_ertesites_naplo_company_id ON public.ertesites_naplo (company_id);
CREATE INDEX IF NOT EXISTS idx_ertesites_naplo_modul_company ON public.ertesites_naplo (modul, company_id, mikor DESC);

-- 3. Meglévő rekordok intelligens modul-besorolása (Docs vs HR)
UPDATE public.ertesites_naplo
SET modul = 'hr'
WHERE targy ILIKE '%eaisyhr%' 
   OR targy ILIKE '%interjú%' 
   OR targy ILIKE '%interju%' 
   OR targy ILIKE '%jelentkezés%' 
   OR targy ILIKE '%jelentkezes%' 
   OR targy ILIKE '%orvosi%' 
   OR targy ILIKE '%szabadság%' 
   OR targy ILIKE '%szabadsag%' 
   OR targy ILIKE '%próbaidő%' 
   OR targy ILIKE '%probaido%' 
   OR targy ILIKE '%tanulmányi%' 
   OR targy ILIKE '%kpi%' 
   OR targy ILIKE '%flottakezelő%' 
   OR targy ILIKE '%flottakezelo%' 
   OR targy ILIKE '%dolgozó%' 
   OR targy ILIKE '%munkavállaló%';

-- 4. Cégkapcsolat visszamenőleges feloldása
-- 4.a: Ahol van kapcsolódó ügyirat, onnan másoljuk a company_id-t
UPDATE public.ertesites_naplo n
SET company_id = u.company_id
FROM public.ugyirat u
WHERE n.ugyirat_id = u.id AND n.company_id IS NULL;

-- 4.b: Ahol még nincs company_id, ott a Think AI Kft-hez (vagy az első aktív céghez) rendeljük
DO $$
DECLARE
  v_default_company_id UUID;
BEGIN
  SELECT id INTO v_default_company_id 
  FROM public.companies 
  WHERE name ILIKE '%think ai%' 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_default_company_id IS NULL THEN
    SELECT id INTO v_default_company_id 
    FROM public.companies 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;

  IF v_default_company_id IS NOT NULL THEN
    UPDATE public.ertesites_naplo
    SET company_id = v_default_company_id
    WHERE company_id IS NULL;
  END IF;
END $$;

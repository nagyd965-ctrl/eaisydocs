-- 20261014000001_add_eaisybill_company_id.sql
-- Hozzáadja az eaisybill_company_id mezőt a companies táblához a dinamikus cégintegrációhoz.

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS eaisybill_company_id UUID NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_eaisybill_company_id 
ON public.companies(eaisybill_company_id) 
WHERE eaisybill_company_id IS NOT NULL;

-- Meglévő Think AI Kft összekapcsolása az eaisyBill párjával (ha még nincs beállítva)
UPDATE public.companies 
SET eaisybill_company_id = 'ecf31039-b539-4e04-bbea-70ea48c701bb' 
WHERE (tax_number ILIKE '12345678%' OR name ILIKE '%Think AI%') 
  AND eaisybill_company_id IS NULL;

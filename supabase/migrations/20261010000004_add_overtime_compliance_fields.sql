-- 20261010000004_add_overtime_compliance_fields.sql
-- Mt. 135. § szerinti önként vállalt túlmunka (max. 400 óra) megállapodás jelölője a dolgozói adatlapon

ALTER TABLE public.hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS onkent_vallalt_tulora_400h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onkent_vallalt_tulora_datum DATE;

COMMENT ON COLUMN public.hr_dolgozo_adatlap.onkent_vallalt_tulora_400h IS 
  'Munkavállalói írásbeli megállapodás az Mt. 135. § szerinti önként vállalt rendkívüli munkaidőről (évi 250 óra helyett max. 400 óra)';

COMMENT ON COLUMN public.hr_dolgozo_adatlap.onkent_vallalt_tulora_datum IS 
  'Az Mt. 135. § szerinti önként vállalt túlmunka megállapodás kelte / hatálybalépése';

-- 20261010000001_add_leave_compliance_fields.sql
-- Mt. 122. § (3) szerinti 14 napos egybefüggő pihenő eltérő megállapodás jelölője a dolgozói adatlapon

ALTER TABLE public.hr_dolgozo_adatlap 
  ADD COLUMN IF NOT EXISTS eltero_megallapodas_14_nap BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.hr_dolgozo_adatlap.eltero_megallapodas_14_nap IS 
  'Munkavállalói eltérő megállapodás/nyilatkozat az Mt. 122. § (3) szerinti 14 napos egybefüggő szabadság eltekintéséről';

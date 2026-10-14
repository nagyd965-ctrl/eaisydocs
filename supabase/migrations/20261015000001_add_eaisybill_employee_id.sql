-- 20261015000001_add_eaisybill_employee_id.sql
-- Foglalkoztatottak eaisyBooks bérszámfejtésből történő átemeléséhez és duplikációvédelméhez

ALTER TABLE public.felhasznalo_profil 
ADD COLUMN IF NOT EXISTS eaisybill_employee_id UUID;

ALTER TABLE public.hr_dolgozo_adatlap 
ADD COLUMN IF NOT EXISTS eaisybill_employee_id UUID;

CREATE INDEX IF NOT EXISTS idx_felhasznalo_profil_eaisybill_employee_id 
ON public.felhasznalo_profil(eaisybill_employee_id);

CREATE INDEX IF NOT EXISTS idx_hr_dolgozo_adatlap_eaisybill_employee_id 
ON public.hr_dolgozo_adatlap(eaisybill_employee_id);

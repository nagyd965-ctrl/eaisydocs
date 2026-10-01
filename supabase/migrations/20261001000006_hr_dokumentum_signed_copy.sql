-- 20261001000006_hr_dokumentum_signed_copy.sql
-- Aláírt példányok feltöltése és verziókezelése a HR dokumentumokhoz

ALTER TABLE public.hr_dokumentum
  ADD COLUMN IF NOT EXISTS alairt_fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS alairva_ekor TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alairas_statusz TEXT DEFAULT 'vazlat',
  ADD COLUMN IF NOT EXISTS alairo_neve TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_dokumentum_alairas_statusz ON public.hr_dokumentum(alairas_statusz);

COMMENT ON COLUMN public.hr_dokumentum.alairt_fajl_url IS 'A mindkét fél által aláírt, beszkennelt példány tárolási útvonala az irat_files vödörben';
COMMENT ON COLUMN public.hr_dokumentum.alairva_ekor IS 'Az aláírt példány feltöltésének / hitelesítésének időpontja';
COMMENT ON COLUMN public.hr_dokumentum.alairas_statusz IS 'Aláírási státusz: vazlat (csak generált sablon létezik) vagy alairva (aláírt példány csatolva)';
COMMENT ON COLUMN public.hr_dokumentum.alairo_neve IS 'Az aláíró / hitelesítő személy neve';

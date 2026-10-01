-- 20261001000001_hr_orvosi_vizsgalat_filing.sql
-- Foglalkozás-egészségügyi vizsgálatok dokumentum csatolása és személyi dosszié iktatása

ALTER TABLE public.hr_orvosi_vizsgalat
  ADD COLUMN IF NOT EXISTS dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS orvos_neve TEXT,
  ADD COLUMN IF NOT EXISTS szakrendeles TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_orvosi_vizsgalat_dokumentum_id ON public.hr_orvosi_vizsgalat(dokumentum_id);
CREATE INDEX IF NOT EXISTS idx_hr_orvosi_vizsgalat_iktatoszam ON public.hr_orvosi_vizsgalat(iktatoszam);
CREATE INDEX IF NOT EXISTS idx_hr_orvosi_vizsgalat_ugyirat_id ON public.hr_orvosi_vizsgalat(ugyirat_id);

COMMENT ON COLUMN public.hr_orvosi_vizsgalat.dokumentum_id IS 'Kapcsolódó HR dokumentum hivatkozás';
COMMENT ON COLUMN public.hr_orvosi_vizsgalat.fajl_url IS 'Feltöltött vagy generált lelet / alkalmassági lap tárolási útvonala (irat_files)';
COMMENT ON COLUMN public.hr_orvosi_vizsgalat.iktatoszam IS 'Hivatalos eaisyDocs gap-mentes iktatószám a személyi dossziéban';

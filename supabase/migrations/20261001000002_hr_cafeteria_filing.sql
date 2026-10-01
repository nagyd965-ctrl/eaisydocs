-- 20261001000002_hr_cafeteria_filing.sql
-- Cafeteria nyilatkozatok dokumentum csatolása és eaisyDocs személyi dosszié iktatása

ALTER TABLE public.hr_cafeteria_keret
  ADD COLUMN IF NOT EXISTS dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lezaras_datuma TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hr_cafeteria_keret_dokumentum_id ON public.hr_cafeteria_keret(dokumentum_id);
CREATE INDEX IF NOT EXISTS idx_hr_cafeteria_keret_iktatoszam ON public.hr_cafeteria_keret(iktatoszam);
CREATE INDEX IF NOT EXISTS idx_hr_cafeteria_keret_ugyirat_id ON public.hr_cafeteria_keret(ugyirat_id);

COMMENT ON COLUMN public.hr_cafeteria_keret.dokumentum_id IS 'Kapcsolódó HR dokumentum hivatkozás';
COMMENT ON COLUMN public.hr_cafeteria_keret.fajl_url IS 'Generált cafeteria nyilatkozat tárolási útvonala (irat_files tárhely)';
COMMENT ON COLUMN public.hr_cafeteria_keret.iktatoszam IS 'Hivatalos eaisyDocs gap-mentes iktatószám a személyi dossziéban';
COMMENT ON COLUMN public.hr_cafeteria_keret.lezaras_datuma IS 'A nyilatkozat véglegesítésének és lezárásának időpontja';

-- 20261001000003_hr_tanulmanyi_szerzodes_filing.sql
-- Mt. 229. § szerinti tanulmányi szerződések kiterjesztése, dokumentumkezelése és eaisyDocs iktatása

ALTER TABLE public.hr_tanulmanyi_szerzodes
  ADD COLUMN IF NOT EXISTS intezmeny_neve TEXT,
  ADD COLUMN IF NOT EXISTS kepzes_szintje TEXT,
  ADD COLUMN IF NOT EXISTS munkaido_kedvezmeny TEXT,
  ADD COLUMN IF NOT EXISTS szerzodes_szam TEXT,
  ADD COLUMN IF NOT EXISTS dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_tanulmanyi_szerzodes_dokumentum_id ON public.hr_tanulmanyi_szerzodes(dokumentum_id);
CREATE INDEX IF NOT EXISTS idx_hr_tanulmanyi_szerzodes_iktatoszam ON public.hr_tanulmanyi_szerzodes(iktatoszam);
CREATE INDEX IF NOT EXISTS idx_hr_tanulmanyi_szerzodes_ugyirat_id ON public.hr_tanulmanyi_szerzodes(ugyirat_id);

COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.intezmeny_neve IS 'Képző intézmény vagy oktatási szervezet megnevezése';
COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.munkaido_kedvezmeny IS 'Biztosított tanulmányi munkaidő-kedvezmény (vizsganapok, órakedvezmény)';
COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.dokumentum_id IS 'Kapcsolódó HR dokumentum rekord azonosító';
COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.fajl_url IS 'Generált vagy feltöltött tanulmányi szerződés PDF elérési útja (irat_files tárhely)';
COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.iktatoszam IS 'Hivatalos eaisyDocs iktatószám a munkavállaló személyi dossziéjában';
COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.ugyirat_id IS 'Hivatkozás az eaisyDocs munkavállalói személyi dossziéra (ugyirat)';
COMMENT ON COLUMN public.hr_tanulmanyi_szerzodes.irat_id IS 'Hivatkozás az eaisyDocs iktatott iratra';

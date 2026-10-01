-- 20260930000003_hr_filing_bridge.sql
-- eaisyHR ↔ eaisyDocs Munkavállalói Személyi Dosszié és Iratkezelési Híd

-- 1. Bővítjük az entitas_tipus enumot a munkavállaló és HR dokumentum típusokkal
DO $$ 
BEGIN
  BEGIN
    ALTER TYPE public.entitas_tipus ADD VALUE IF NOT EXISTS 'munkavallalo';
  EXCEPTION
    WHEN duplicate_object THEN null;
  END;

  BEGIN
    ALTER TYPE public.entitas_tipus ADD VALUE IF NOT EXISTS 'hr_dokumentum';
  EXCEPTION
    WHEN duplicate_object THEN null;
  END;
END $$;

-- 2. hr_dokumentum tábla bővítése az iktatási kapcsolatokkal
ALTER TABLE public.hr_dokumentum
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS iktatva_ekor TIMESTAMPTZ;

-- Indexek a gyors lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_hr_dokumentum_irat_id ON public.hr_dokumentum(irat_id);
CREATE INDEX IF NOT EXISTS idx_hr_dokumentum_ugyirat_id ON public.hr_dokumentum(ugyirat_id);
CREATE INDEX IF NOT EXISTS idx_hr_dokumentum_iktatoszam ON public.hr_dokumentum(iktatoszam);

-- 3. Megjegyzés dokumentáció
COMMENT ON COLUMN public.hr_dokumentum.irat_id IS 'Hivatalos eaisyDocs irat hivatkozás';
COMMENT ON COLUMN public.hr_dokumentum.ugyirat_id IS 'Munkavállalói személyi dosszié (ügyirat) hivatkozás';
COMMENT ON COLUMN public.hr_dokumentum.iktatoszam IS 'Gap-mentes iktatószám (pl. HR/2026/000012/1)';
COMMENT ON COLUMN public.hr_dokumentum.iktatva_ekor IS 'Hivatalos iktatás időpontja';

-- 20261001000013_hr_onboarding_munkakor.sql
-- Onboarding folyamathoz kapcsolódó hivatalos munkaköri leírás rögzítése és verziókövetése

CREATE TABLE IF NOT EXISTS public.hr_onboarding_munkakor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID NOT NULL REFERENCES public.hr_onboarding(id) ON DELETE CASCADE,
    dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE SET NULL,
    munkakor_id UUID REFERENCES public.hr_munkakor(id) ON DELETE SET NULL,
    munkakor_megnevezes TEXT NOT NULL,
    feor_kod TEXT,
    verzio_id UUID REFERENCES public.hr_munkakor_leiras_verzio(id) ON DELETE SET NULL,
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    forras_tipus TEXT NOT NULL DEFAULT 'katalogus', -- 'katalogus' | 'generator' | 'feltoltes'
    statusz TEXT NOT NULL DEFAULT 'atadva', -- 'vazlat' | 'atadva' | 'alairva'
    megjegyzes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek a gyors lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_hr_onb_munkakor_onb_id ON public.hr_onboarding_munkakor(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_hr_onb_munkakor_dolgozo_id ON public.hr_onboarding_munkakor(dolgozo_id);

-- RLS
ALTER TABLE public.hr_onboarding_munkakor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR és Admin teljes hozzáférés onboarding munkakörhöz"
  ON public.hr_onboarding_munkakor
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil 
      WHERE id = auth.uid() 
      AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil 
      WHERE id = auth.uid() 
      AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
  );

CREATE POLICY "Dolgozó megtekintheti a saját munkaköri leírás rekordját"
  ON public.hr_onboarding_munkakor
  FOR SELECT TO authenticated
  USING (dolgozo_id = auth.uid());

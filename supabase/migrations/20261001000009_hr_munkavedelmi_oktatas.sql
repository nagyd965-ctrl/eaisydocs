-- ==============================================================================
-- 20261001000009_hr_munkavedelmi_oktatas.sql
-- Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv nyilvántartás (Mvt. 55. §, Ttv. 22. §)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hr_munkavedelmi_oktatas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    onboarding_id UUID REFERENCES public.hr_onboarding(id) ON DELETE CASCADE,
    oktatas_tipusa TEXT NOT NULL DEFAULT 'elozetes_munkaba_allasi',
    oktatas_datuma DATE NOT NULL DEFAULT CURRENT_DATE,
    oktato_neve TEXT NOT NULL,
    oktato_beosztasa TEXT,
    tematika JSONB NOT NULL DEFAULT '[]'::jsonb,
    megjegyzes TEXT,
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexek a gyors szűréshez
CREATE INDEX IF NOT EXISTS idx_hr_munkavedelmi_oktatas_dolgozo ON public.hr_munkavedelmi_oktatas(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_munkavedelmi_oktatas_onboarding ON public.hr_munkavedelmi_oktatas(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_hr_munkavedelmi_oktatas_dokumentum ON public.hr_munkavedelmi_oktatas(dokumentum_id);

-- RLS engedélyezése
ALTER TABLE public.hr_munkavedelmi_oktatas ENABLE ROW LEVEL SECURITY;

-- 1. Olvasási jogosultság: HR, Admin, Vezető, Munkavédelmi felelős bárkiét; dolgozó a sajátját
CREATE POLICY "hr_munkavedelmi_oktatas_select_policy"
ON public.hr_munkavedelmi_oktatas
FOR SELECT
TO authenticated
USING (
    dolgozo_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.felhasznalo_profil p
        WHERE p.id = auth.uid()
        AND p.hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars', 'vezeto', 'munkavedelmi', 'auditor')
    )
);

-- 2. Írási jogosultság (INSERT / UPDATE / DELETE): HR, Admin, Munkavédelmi felelős
CREATE POLICY "hr_munkavedelmi_oktatas_modify_policy"
ON public.hr_munkavedelmi_oktatas
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.felhasznalo_profil p
        WHERE p.id = auth.uid()
        AND p.hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars', 'munkavedelmi')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.felhasznalo_profil p
        WHERE p.id = auth.uid()
        AND p.hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars', 'munkavedelmi')
    )
);

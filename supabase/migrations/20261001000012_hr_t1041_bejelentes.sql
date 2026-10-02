-- Migration: hr_t1041_bejelentes tábla és RLS jogosultságok
-- NAV T1041 biztosítotti bejelentés és hatósági nyugták kezelése az Onboarding folyamatban és a Compliance modulban

CREATE TABLE IF NOT EXISTS public.hr_t1041_bejelentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID REFERENCES public.hr_onboarding(id) ON DELETE CASCADE,
    dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    bejelentes_tipus TEXT NOT NULL DEFAULT 'U', -- U: Új bejelentés, V: Változás, T: Törlés/Kijelentés
    biztositott_neve TEXT NOT NULL,
    taj_szam TEXT,
    adoazonosito_jel TEXT,
    munkakor TEXT,
    feor_kod TEXT,
    jogviszony_kezdete DATE,
    heti_munkaido_ora NUMERIC(4,2) DEFAULT 40.0,
    allapot TEXT NOT NULL DEFAULT 'elokeszitve', -- elokeszitve, bekuldve, igazolva
    bekuldes_datuma DATE,
    
    -- Generált adatlap PDF dokumentum
    adatlap_dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    adatlap_url TEXT,
    
    -- Visszaigazoló NAV nyugta PDF dokumentum (amikor a könyvelő feltölti a beküldött igazolást)
    nyugta_dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    nyugta_url TEXT,
    
    megjegyzes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_hr_t1041_onboarding_id ON public.hr_t1041_bejelentes(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_hr_t1041_dolgozo_id ON public.hr_t1041_bejelentes(dolgozo_id);

ALTER TABLE public.hr_t1041_bejelentes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'hr_t1041_bejelentes' AND policyname = 'HR és Vezetők kezelik a T1041 bejelentéseket'
    ) THEN
        CREATE POLICY "HR és Vezetők kezelik a T1041 bejelentéseket" ON public.hr_t1041_bejelentes
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.felhasznalo_profil
                    WHERE id = auth.uid()
                    AND hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.felhasznalo_profil
                    WHERE id = auth.uid()
                    AND hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
                )
            );
    END IF;
END $$;

-- Migration: hr_munkaszerzodes tábla és RLS jogosultságok
-- Munkaszerződés (Mt. 42-45. §) kezelése az Onboarding folyamatban és a munkavállalói életciklusban

CREATE TABLE IF NOT EXISTS public.hr_munkaszerzodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    onboarding_id UUID REFERENCES public.hr_onboarding(id) ON DELETE CASCADE,
    szerzodes_szam TEXT,
    munkakor TEXT NOT NULL,
    kezdes_datuma DATE NOT NULL,
    szerzodes_tipusa TEXT NOT NULL DEFAULT 'hatarozatlan', -- hatarozatlan, hatarozott
    hatarozott_lejarat DATE,
    munkaido_tipus TEXT NOT NULL DEFAULT 'teljes', -- teljes, reszmunkaido
    napi_munkaido_ora NUMERIC(4,2) DEFAULT 8.0,
    probaido_honap INTEGER DEFAULT 3,
    alapber NUMERIC(12,2) NOT NULL DEFAULT 500000,
    munkavegzes_helye TEXT NOT NULL DEFAULT 'A Munkáltató mindenkori székhelye és telephelyei',
    tavmunka_megallapodas BOOLEAN DEFAULT false,
    
    -- Munkavállaló személyes azonosító adatai
    szuletesi_hely TEXT,
    szuletesi_datum DATE,
    anyja_neve TEXT,
    lakcim TEXT,
    adoazonosito_jel TEXT,
    taj_szam TEXT,
    bankszamlaszam TEXT,
    
    -- Kapcsolat a generált eaisyDocs dokumentummal
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_hr_munkaszerzodes_dolgozo_id ON public.hr_munkaszerzodes(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_munkaszerzodes_onboarding_id ON public.hr_munkaszerzodes(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_hr_munkaszerzodes_dokumentum_id ON public.hr_munkaszerzodes(dokumentum_id);

-- RLS
ALTER TABLE public.hr_munkaszerzodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR és Vezetők kezelik a munkaszerződéseket" ON public.hr_munkaszerzodes
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

CREATE POLICY "Dolgozó megtekintheti saját szerződését" ON public.hr_munkaszerzodes
    FOR SELECT TO authenticated
    USING (
        dolgozo_id = auth.uid()
    );

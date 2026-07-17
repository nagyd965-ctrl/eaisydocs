-- Kifele menő E-mail (Értesítési Motor) Táblái

-- 1. Értesítési Szabályok Tábla
CREATE TABLE IF NOT EXISTS public.ertesitesi_szabaly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    esemeny_tipus TEXT NOT NULL, -- pl. 'hatarido_kozeledik', 'uj_szignalas'
    kinek TEXT NOT NULL,         -- pl. 'felelos', 'vezeto', 'iratkezelo'
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(esemeny_tipus, kinek)
);

-- RLS a Szabályokon
ALTER TABLE public.ertesitesi_szabaly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mindenki olvashatja a szabalyokat"
    ON public.ertesitesi_szabaly FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Csak admin szerkesztheti a szabalyokat"
    ON public.ertesitesi_szabaly FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.felhasznalo_profil f
            WHERE f.id = auth.uid() AND f.szerepkor = 'admin'
        )
    );

-- Alapértelmezett Szabályok betöltése a brief alapján
INSERT INTO public.ertesitesi_szabaly (esemeny_tipus, kinek, aktiv) VALUES
('hatarido_kozeledik', 'felelos', true),
('hatarido_lejart', 'felelos', true),
('hatarido_lejart', 'vezeto', true),
('uj_szignalas', 'felelos', true),
('allapotvaltozas', 'vezeto', true),
('megorzesi_ido_lejart', 'iratkezelo', true)
ON CONFLICT (esemeny_tipus, kinek) DO NOTHING;

-- 2. Értesítési Napló (Audit miatt append-only)
DROP TABLE IF EXISTS public.ertesites_naplo CASCADE;

CREATE TABLE public.ertesites_naplo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mikor TIMESTAMPTZ DEFAULT now(),
    csatorna TEXT NOT NULL CHECK (csatorna IN ('email', 'sms')),
    cimzett_email TEXT NOT NULL,
    targy TEXT NOT NULL,
    uzenet TEXT,
    statusz TEXT NOT NULL CHECK (statusz IN ('sikeres', 'hibas', 'folyamatban')),
    hiba_oka TEXT,
    ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL, -- Opcionális kapcsolódás
    kivato_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL  -- Aki az eseményt kiváltotta
);

-- RLS a Naplón
ALTER TABLE public.ertesites_naplo ENABLE ROW LEVEL SECURITY;

-- Append-only: mindenki írhat bele (aki be van jelentkezve)
CREATE POLICY "Mindenki szurhat be naplot"
    ON public.ertesites_naplo FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Csak a vezetők (admin, rendszergazda, vezeto) láthatják a naplót
CREATE POLICY "Csak Admin es Auditor lathatja a naplot"
    ON public.ertesites_naplo FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.felhasznalo_profil f
            WHERE f.id = auth.uid() AND f.szerepkor IN ('admin', 'vezeto', 'rendszergazda')
        )
    );

-- Tilos a módosítás és a törlés
CREATE POLICY "Tilos a naplo modositasa"
    ON public.ertesites_naplo FOR UPDATE
    USING (false);

CREATE POLICY "Tilos a naplo torlese"
    ON public.ertesites_naplo FOR DELETE
    USING (false);

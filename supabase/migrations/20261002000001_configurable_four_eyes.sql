-- 1. Create table rendszer_beallitas
CREATE TABLE IF NOT EXISTS public.rendszer_beallitas (
    kulcs TEXT PRIMARY KEY,
    ertek JSONB NOT NULL DEFAULT '{}'::jsonb,
    leiras TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Insert default for negy_szem_elve_selejtezesnel
INSERT INTO public.rendszer_beallitas (kulcs, ertek, leiras)
VALUES (
    'negy_szem_elve_selejtezesnel',
    '{"kotelezo": true}'::jsonb,
    'Szigorú négyszem-elv megkövetelése selejtezési javaslat jóváhagyásakor (a felterjesztő munkatárs nem hagyhatja jóvá a saját javaslatát).'
)
ON CONFLICT (kulcs) DO NOTHING;

-- 3. RLS on rendszer_beallitas
ALTER TABLE public.rendszer_beallitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Minden autentikalt latja a rendszerbeallitasokat" ON public.rendszer_beallitas;
CREATE POLICY "Minden autentikalt latja a rendszerbeallitasokat"
ON public.rendszer_beallitas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Csak admin szerkesztheti a rendszerbeallitasokat" ON public.rendszer_beallitas;
CREATE POLICY "Csak admin szerkesztheti a rendszerbeallitasokat"
ON public.rendszer_beallitas
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.felhasznalo_profil fp
        WHERE fp.id = auth.uid()
        AND (fp.docs_szerepkor IN ('admin', 'rendszergazda') OR fp.szerepkor IN ('admin', 'rendszergazda'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.felhasznalo_profil fp
        WHERE fp.id = auth.uid()
        AND (fp.docs_szerepkor IN ('admin', 'rendszergazda') OR fp.szerepkor IN ('admin', 'rendszergazda'))
    )
);

-- 4. Helper function to check if 4-eyes is required
CREATE OR REPLACE FUNCTION public.is_negy_szem_elve_kotelezo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((ertek->>'kotelezo')::boolean, true)
  FROM public.rendszer_beallitas
  WHERE kulcs = 'negy_szem_elve_selejtezesnel';
$$;

-- 5. Update selejtezes_csomag RLS policy to respect the configurable setting
DROP POLICY IF EXISTS "Negy szem elve a frissitesnel" ON public.selejtezes_csomag;
CREATE POLICY "Negy szem elve a frissitesnel" ON public.selejtezes_csomag FOR UPDATE 
USING (
    statusz = 'jovahagyasra_var' 
    AND (
        NOT public.is_negy_szem_elve_kotelezo()
        OR auth.uid() != javaslattevo_user_id
    )
)
WITH CHECK (
    statusz IN ('jovahagyva', 'elutasitva')
    AND jovahagyo_user_id = auth.uid()
);

-- 20261001000005_hr_kituntetes_modul.sql
-- Munkavállalói kitüntetések, szakmai elismerések és oklevelek nyilvántartása, eaisyDocs iktatással

CREATE TABLE IF NOT EXISTS public.hr_kituntetes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES public.hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    megnevezes TEXT NOT NULL,
    kategoria TEXT NOT NULL DEFAULT 'vallalati_dij',
    datum DATE NOT NULL,
    adomanyozo TEXT,
    indoklas TEXT NOT NULL,
    jutalom_osszeg NUMERIC,
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    fajl_url TEXT,
    iktatoszam TEXT,
    ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
    irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.hr_kituntetes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kituntetesek olvasasa"
    ON public.hr_kituntetes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Kituntetesek kezelese"
    ON public.hr_kituntetes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_hr_kituntetes_dolgozo_id ON public.hr_kituntetes(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_kituntetes_dokumentum_id ON public.hr_kituntetes(dokumentum_id);
CREATE INDEX IF NOT EXISTS idx_hr_kituntetes_iktatoszam ON public.hr_kituntetes(iktatoszam);
CREATE INDEX IF NOT EXISTS idx_hr_kituntetes_ugyirat_id ON public.hr_kituntetes(ugyirat_id);

COMMENT ON TABLE public.hr_kituntetes IS 'Munkavállalói kitüntetések, elismerések, díjak és jubileumi elismerések táblája';
COMMENT ON COLUMN public.hr_kituntetes.megnevezes IS 'Az elismerés vagy díj hivatalos megnevezése';
COMMENT ON COLUMN public.hr_kituntetes.kategoria IS 'Elismerés kategóriája (vallalati_dij, szakmai_innovacio, jubileum, stb.)';
COMMENT ON COLUMN public.hr_kituntetes.adomanyozo IS 'Az elismerést átadó/adományozó vezető vagy testület';
COMMENT ON COLUMN public.hr_kituntetes.jutalom_osszeg IS 'Kapcsolódó pénzjutalom összege Ft-ban';
COMMENT ON COLUMN public.hr_kituntetes.iktatoszam IS 'Hivatalos eaisyDocs iktatószám a személyi dossziéban';

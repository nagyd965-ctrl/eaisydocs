-- ============================================================================
-- EAISYHR: MŰSZAKTERVEZÉS ÉS MŰSZAKSABLONOK (HR-TASK-01)
-- ============================================================================

BEGIN;

-- 1. Műszaksablonok tábla
CREATE TABLE IF NOT EXISTS public.hr_muszak_sablon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    kod VARCHAR(20) NOT NULL,
    megnevezes VARCHAR(100) NOT NULL,
    kezdes_ido TIME NOT NULL,
    befejezes_ido TIME NOT NULL,
    munkaora NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    szunet_perc INTEGER NOT NULL DEFAULT 30,
    szin_kod VARCHAR(30) NOT NULL DEFAULT '#0d9488',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_hr_muszak_sablon_company_kod UNIQUE (company_id, kod)
);

-- 2. Műszakbeosztások tábla (Roster / heti és havi beosztások)
CREATE TABLE IF NOT EXISTS public.hr_muszak_beosztas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    dolgozo_id UUID NOT NULL REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    datum DATE NOT NULL,
    sablon_id UUID REFERENCES public.hr_muszak_sablon(id) ON DELETE SET NULL,
    egyedi_kezdes TIME,
    egyedi_befejezes TIME,
    tervezett_ora NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    megjegyzes TEXT,
    statusz VARCHAR(20) NOT NULL DEFAULT 'tervezett' CHECK (statusz IN ('tervezett', 'jovahagyva', 'lezart')),
    letrehozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_hr_muszak_beosztas_dolgozo_datum UNIQUE (dolgozo_id, datum)
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_hr_muszak_sablon_company ON public.hr_muszak_sablon(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_muszak_beosztas_company ON public.hr_muszak_beosztas(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_muszak_beosztas_dolgozo ON public.hr_muszak_beosztas(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_muszak_beosztas_datum ON public.hr_muszak_beosztas(datum);
CREATE INDEX IF NOT EXISTS idx_hr_muszak_beosztas_sablon ON public.hr_muszak_beosztas(sablon_id);

-- RLS Bekapcsolása
ALTER TABLE public.hr_muszak_sablon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_muszak_beosztas ENABLE ROW LEVEL SECURITY;

-- Restrictive Multi-Tenant Házirendek
DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.hr_muszak_sablon;
CREATE POLICY "tenant_isolation_restrictive" ON public.hr_muszak_sablon
AS RESTRICTIVE FOR ALL TO authenticated
USING (public.user_has_company_access(company_id))
WITH CHECK (public.user_has_company_access(company_id));

DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.hr_muszak_beosztas;
CREATE POLICY "tenant_isolation_restrictive" ON public.hr_muszak_beosztas
AS RESTRICTIVE FOR ALL TO authenticated
USING (public.user_has_company_access(company_id))
WITH CHECK (public.user_has_company_access(company_id));

-- Permissive Házirendek: Műszaksablonok
DROP POLICY IF EXISTS "Műszaksablonok olvasása cégen belül" ON public.hr_muszak_sablon;
CREATE POLICY "Műszaksablonok olvasása cégen belül" ON public.hr_muszak_sablon
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "HR és Vezető módosíthatja a sablonokat" ON public.hr_muszak_sablon;
CREATE POLICY "HR és Vezető módosíthatja a sablonokat" ON public.hr_muszak_sablon
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.felhasznalo_profil p
    WHERE p.id = auth.uid() 
      AND (p.hr_szerepkor IN ('hr_vezeto', 'admin', 'hr_munkatars') OR p.szerepkor = 'admin')
  )
);

-- Permissive Házirendek: Műszakbeosztások
DROP POLICY IF EXISTS "Műszakbeosztások olvasása" ON public.hr_muszak_beosztas;
CREATE POLICY "Műszakbeosztások olvasása" ON public.hr_muszak_beosztas
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil p
    WHERE p.id = auth.uid() 
      AND (p.hr_szerepkor IN ('hr_vezeto', 'admin', 'hr_munkatars') OR p.szerepkor = 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_muszak_beosztas.dolgozo_id 
      AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és Vezető kezeli a műszakbeosztásokat" ON public.hr_muszak_beosztas;
CREATE POLICY "HR és Vezető kezeli a műszakbeosztásokat" ON public.hr_muszak_beosztas
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.felhasznalo_profil p
    WHERE p.id = auth.uid() 
      AND (p.hr_szerepkor IN ('hr_vezeto', 'admin', 'hr_munkatars') OR p.szerepkor = 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.felhasznalo_profil beosztott
    WHERE beosztott.id = hr_muszak_beosztas.dolgozo_id 
      AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

-- 3. Alapértelmezett sablonok generálása az összes meglévő céghez
INSERT INTO public.hr_muszak_sablon (company_id, kod, megnevezes, kezdes_ido, befejezes_ido, munkaora, szunet_perc, szin_kod, is_active)
SELECT 
    c.id,
    s.kod,
    s.megnevezes,
    s.kezdes_ido::TIME,
    s.befejezes_ido::TIME,
    s.munkaora,
    s.szunet_perc,
    s.szin_kod,
    true
FROM public.companies c
CROSS JOIN (
    VALUES 
        ('D', 'Délelőttös', '06:00:00', '14:00:00', 8.00, 30, '#0d9488'),
        ('DU', 'Délutános', '14:00:00', '22:00:00', 8.00, 30, '#d97706'),
        ('E', 'Éjszakás', '22:00:00', '06:00:00', 8.00, 30, '#6366f1'),
        ('N', 'Normál irodai', '08:00:00', '16:30:00', 8.00, 30, '#10b981')
) AS s(kod, megnevezes, kezdes_ido, befejezes_ido, munkaora, szunet_perc, szin_kod)
ON CONFLICT (company_id, kod) DO NOTHING;

COMMIT;

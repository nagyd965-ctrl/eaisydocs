-- ============================================================================
-- EAISYHR: DOLGOZÓI AJÁNLÁS (EMPLOYEE REFERRAL) ÉS FIX BÓNUSZ TÁMOGATÁS
-- ============================================================================

BEGIN;

-- 1. referral_bonus_amount mező hozzáadása a companies táblához
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS referral_bonus_amount INTEGER DEFAULT 150000;

-- 2. hr_dolgozoi_ajanlas tábla létrehozása
CREATE TABLE IF NOT EXISTS public.hr_dolgozoi_ajanlas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    ajanlo_dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    allashirdetes_id UUID REFERENCES public.hr_allashirdetes(id) ON DELETE SET NULL,
    toborzas_id UUID REFERENCES public.hr_toborzas(id) ON DELETE SET NULL,
    jelolt_nev TEXT NOT NULL,
    jelolt_email TEXT NOT NULL,
    jelolt_telefon TEXT,
    linkedin_url TEXT,
    cv_storage_path TEXT,
    ajanlas_indoklas TEXT,
    bonusz_osszeg INTEGER NOT NULL DEFAULT 150000,
    bonusz_statusz TEXT NOT NULL DEFAULT 'fuggoben', -- 'fuggoben', 'feltetelhez_kotve', 'kifizetheto', 'kifizetve', 'elutasitva'
    kifizetes_datuma DATE,
    megjegyzes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek létrehozása a hatékony lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_hr_dolgozoi_ajanlas_company ON public.hr_dolgozoi_ajanlas(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_dolgozoi_ajanlas_ajanlo ON public.hr_dolgozoi_ajanlas(ajanlo_dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_dolgozoi_ajanlas_allashirdetes ON public.hr_dolgozoi_ajanlas(allashirdetes_id);
CREATE INDEX IF NOT EXISTS idx_hr_dolgozoi_ajanlas_toborzas ON public.hr_dolgozoi_ajanlas(toborzas_id);
CREATE INDEX IF NOT EXISTS idx_hr_dolgozoi_ajanlas_bonusz_statusz ON public.hr_dolgozoi_ajanlas(bonusz_statusz);

-- 3. RLS bekapcsolása
ALTER TABLE public.hr_dolgozoi_ajanlas ENABLE ROW LEVEL SECURITY;

-- Restrictive Multi-Tenant elszigetelés (ADR A-028)
DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.hr_dolgozoi_ajanlas;
CREATE POLICY "tenant_isolation_restrictive" ON public.hr_dolgozoi_ajanlas
AS RESTRICTIVE FOR ALL TO authenticated
USING (public.user_has_company_access(company_id))
WITH CHECK (public.user_has_company_access(company_id));

-- Dolgozó láthatja a saját ajánlásait, HR és Admin pedig az összeset a saját cégén belül
DROP POLICY IF EXISTS "hr_dolgozoi_ajanlas_select" ON public.hr_dolgozoi_ajanlas;
CREATE POLICY "hr_dolgozoi_ajanlas_select" ON public.hr_dolgozoi_ajanlas FOR SELECT
TO authenticated
USING (
    ajanlo_dolgozo_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = hr_dolgozoi_ajanlas.company_id
        AND user_id = auth.uid()
        AND (role IN ('owner', 'admin') OR hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars'))
    )
);

-- Bármely dolgozó rögzíthet ajánlást
DROP POLICY IF EXISTS "hr_dolgozoi_ajanlas_insert" ON public.hr_dolgozoi_ajanlas;
CREATE POLICY "hr_dolgozoi_ajanlas_insert" ON public.hr_dolgozoi_ajanlas FOR INSERT
TO authenticated
WITH CHECK (
    ajanlo_dolgozo_id = auth.uid()
);

-- HR és Admin módosíthatja az ajánlást (pl. státuszváltás, bónusz kifizetés)
DROP POLICY IF EXISTS "hr_dolgozoi_ajanlas_update" ON public.hr_dolgozoi_ajanlas;
CREATE POLICY "hr_dolgozoi_ajanlas_update" ON public.hr_dolgozoi_ajanlas FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = hr_dolgozoi_ajanlas.company_id
        AND user_id = auth.uid()
        AND (role IN ('owner', 'admin') OR hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars'))
    )
);

COMMIT;

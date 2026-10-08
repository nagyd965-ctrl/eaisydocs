-- ============================================================================
-- EAISYDOCS & EAISYHR MULTI-TENANCY SÉMAMIGRÁCIÓ 2: KIEGÉSZÍTŐ TÁBLÁK ÉS RLS SEGÉD
-- ============================================================================

BEGIN;

-- 1. Segédfüggvény: Felhasználó cég-hozzáférésének ultragyors ellenőrzése
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_access_cache
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
$$;

-- 2. Kiegészítő táblák felkészítése (szervezeti egységek, számlálók, HR entitások)
DO $$
DECLARE
  v_company_id uuid;
  t text;
  v_additional_tables text[] := ARRAY[
    'szervezeti_egyseg',
    'erkeztetoszam_allokacio',
    'ugyszam_allokacio',
    'hr_jogviszony',
    'hr_beosztas',
    'hr_ceges_dokumentum',
    'hr_ceges_dokumentum_nyugtazas',
    'hr_dokumentum',
    'hr_fejlesztesi_terv',
    'hr_fejlesztesi_cel',
    'hr_fegyelmi',
    'hr_kilepes_interju',
    'hr_orvosi_vizsgalat',
    'hr_t1041_bejelentes',
    'hr_tanulmanyi_szerzodes',
    'hr_kepzettseg',
    'hr_helyettesites',
    'helyettesites'
  ];
BEGIN
  SELECT id INTO v_company_id FROM public.companies WHERE name = 'Think AI Kft.' LIMIT 1;

  FOREACH t IN ARRAY v_additional_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;', t);
      END IF;

      -- Meglévő sorok hozzárendelése az alapértelmezett céghez
      EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL;', t, v_company_id);
      
      -- Default érték beállítása
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET DEFAULT %L;', t, v_company_id);
      
      -- Index létrehozása
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id);', 'idx_' || t || '_company_id', t);
      
      RAISE NOTICE 'Kiegészítő tábla felkészítve többcég-kezelésre: %', t;
    END IF;
  END LOOP;
END;
$$;

COMMIT;

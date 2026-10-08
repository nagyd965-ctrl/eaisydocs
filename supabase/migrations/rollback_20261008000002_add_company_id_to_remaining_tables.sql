-- ============================================================================
-- ROLLBACK: KIEGÉSZÍTŐ TÁBLÁK MULTI-TENANCY SÉMAVÁLTOZÁSAINAK VISSZAVONÁSA
-- ============================================================================

BEGIN;

DO $$
DECLARE
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
  FOREACH t IN ARRAY v_additional_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS public.%I;', 'idx_' || t || '_company_id');
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN company_id CASCADE;', t);
    END IF;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.user_has_company_access(uuid);

COMMIT;

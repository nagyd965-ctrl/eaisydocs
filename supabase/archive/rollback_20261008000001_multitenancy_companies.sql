-- ============================================================================
-- EAISYDOCS & EAISYHR MULTI-TENANCY ROLLBACK SCRIPT (VISSZAÁLLÍTÁS)
-- ============================================================================
-- Ez a script visszaállítja az adatbázist a 20261008000001 migráció előtti állapotba:
-- 1. Eltávolítja a company_id oszlopokat és indexeket az érintett alaptáblákból
-- 2. Törli a multi-tenancy triggereket, függvényeket és táblákat
-- ============================================================================

BEGIN;

-- 1. COMPANY_ID OSZLOPOK ÉS INDEXEK ELTÁVOLÍTÁSA AZ ALAPTÁBLÁKBÓL
DO $$
DECLARE
  t text;
  v_tables text[] := ARRAY[
    'ugy',
    'ugyirat',
    'irat',
    'partner',
    'irattari_terv',
    'iktatoszam_allokacio',
    'irat_fizikai_hely',
    'selejtezes_csomag',
    'feladat',
    'mentett_kereses',
    'esemeny_naplo',
    'hr_dolgozo_adatlap',
    'hr_dolgozo_titkos_adat',
    'hr_szervezeti_egyseg',
    'hr_munkakor',
    'hr_jelenlet',
    'hr_jelenlet_korrekcio',
    'hr_havi_jelenlet_zaras',
    'hr_tavollet',
    'hr_tulora_egyenleg',
    'hr_allashirdetes',
    'hr_toborzas',
    'hr_onboarding',
    'hr_onboarding_feladat',
    'hr_offboarding',
    'hr_offboarding_feladat',
    'hr_cafeteria_keret',
    'hr_cafeteria_valasztas',
    'hr_teljesitmeny_ciklus',
    'hr_teljesitmeny',
    'hr_munkahelyi_eszkoz',
    'hr_munkavedelmi_oktatas',
    'hr_munkaszerzodes',
    'hr_bevallas_archivum',
    'hr_esemeny_naplo'
  ];
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS company_id CASCADE;', t);
      RAISE NOTICE 'company_id oszlop eltávolítva a táblából: %', t;
    END IF;
  END LOOP;
END;
$$;

-- 2. FÜGGVÉNYEK ÉS TRIGGEREK TÖRLÉSE
DROP TRIGGER IF EXISTS trg_sync_company_member_cache ON public.company_members;
DROP TRIGGER IF EXISTS trg_on_company_created ON public.companies;
DROP FUNCTION IF EXISTS public.join_company_by_token(text);
DROP FUNCTION IF EXISTS public.user_has_company_access(uuid);
DROP FUNCTION IF EXISTS public.on_company_created();
DROP FUNCTION IF EXISTS public.sync_company_member_cache();

-- 3. TÖRZSTÁBLÁK TÖRLÉSE (FORDÍTOTT SORRENDBEN)
DROP TABLE IF EXISTS public.user_company_access_cache CASCADE;
DROP TABLE IF EXISTS public.company_members CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

COMMIT;

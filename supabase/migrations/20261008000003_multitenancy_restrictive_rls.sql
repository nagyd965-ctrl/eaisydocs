-- ============================================================================
-- EAISYDOCS & EAISYHR MULTI-TENANCY SÉMAMIGRÁCIÓ 3: RESTRICTIVE RLS HÁZIRENDEK
-- ============================================================================
-- A RESTRICTIVE házirendek 'AND' kapcsolattal kényszerítik ki a többcég-elszigetelést.
-- Bármilyen más jogosultság vagy ABAC szabály csak a felhasználó saját cégein belül érvényesülhet!
-- ============================================================================

BEGIN;

DO $$
DECLARE
  t text;
  v_tables text[] := ARRAY[
    'ugy',
    'ugyirat',
    'irat',
    'partner',
    'irattari_terv',
    'szervezeti_egyseg',
    'feladat',
    'selejtezes_csomag',
    'mentett_kereses',
    'esemeny_naplo',
    'hr_dolgozo_adatlap',
    'hr_dolgozo_titkos_adat',
    'hr_szervezeti_egyseg',
    'hr_munkakor',
    'hr_beosztas',
    'hr_jogviszony',
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
    'hr_esemeny_naplo',
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
  FOREACH t IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      -- RLS bekapcsolása a táblán
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      
      -- Esetleges korábbi házirend törlése
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.%I;', t);
      
      -- Szigorú elszigetelési házirend (RESTRICTIVE: kötelező AND kapcsolat minden más szabályhoz)
      EXECUTE format('
        CREATE POLICY "tenant_isolation_restrictive" ON public.%I
        AS RESTRICTIVE FOR ALL TO authenticated
        USING (public.user_has_company_access(company_id))
        WITH CHECK (public.user_has_company_access(company_id));
      ', t);
      
      RAISE NOTICE 'Tenant isolation RLS beállítva a táblára: %', t;
    END IF;
  END LOOP;
END;
$$;

COMMIT;

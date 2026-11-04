-- ============================================================================
-- Migration: 20261104000004_fix_hr_only_members_docs_isolation.sql
-- Scope: [Közös] eaisyDocs & eaisyHR moduláris szeparáció javítása
-- Cél:
--   1. Azon felhasználóknál, akiknek a `felhasznalo_profil.elerheto_modulok`
--      tömbjében NEM szerepel a `'docs'` modul (kizárólag eaisyHR hozzáférésük van),
--      a `company_members.docs_szerepkor` értékét NULL-ra, a `docs_modulok`
--      értékét üres tömbre (`'{}'`) állítjuk, valamint a Docs-specifikus
--      `szervezeti_egyseg_id` mezőt is NULL-ra állítjuk (az eaisyHR a
--      `hr_szervezeti_egyseg_id`-t használja).
--   2. Azon felhasználóknál, akiknek az `elerheto_modulok` tömbjében NEM szerepel
--      a `'hr'` modul (kizárólag eaisyDocs hozzáférésük van), a `company_members.hr_szerepkor`
--      értékét NULL-ra, a `hr_modulok` értékét üres tömbre (`'{}'`) állítjuk.
-- ============================================================================

BEGIN;

-- 1. HR-only felhasználók company_members.docs_szerepkor és docs_modulok tisztítása
UPDATE public.company_members cm
SET
  docs_szerepkor = NULL,
  docs_modulok = '{}'::text[]
FROM public.felhasznalo_profil fp
WHERE cm.user_id = fp.id
  AND NOT ('docs' = ANY(COALESCE(fp.elerheto_modulok, ARRAY['docs']::text[])));

-- 2. HR-only felhasználók Docs-specifikus szervezeti_egyseg_id mezőjének tisztítása
UPDATE public.felhasznalo_profil
SET szervezeti_egyseg_id = NULL
WHERE NOT ('docs' = ANY(COALESCE(elerheto_modulok, ARRAY['docs']::text[])))
  AND szervezeti_egyseg_id IS NOT NULL;

-- 3. Docs-only felhasználók company_members.hr_szerepkor és hr_modulok tisztítása
UPDATE public.company_members cm
SET
  hr_szerepkor = NULL,
  hr_modulok = '{}'::text[]
FROM public.felhasznalo_profil fp
WHERE cm.user_id = fp.id
  AND NOT ('hr' = ANY(COALESCE(fp.elerheto_modulok, ARRAY[]::text[])));

COMMIT;

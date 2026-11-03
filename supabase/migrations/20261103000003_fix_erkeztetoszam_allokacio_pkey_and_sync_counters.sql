-- =============================================================================
-- Migration: 20261103000003_fix_erkeztetoszam_allokacio_pkey_and_sync_counters.sql
-- Purpose:
--   1. Fix `public.erkeztetoszam_allokacio` primary key from `(ev)` to `(company_id, ev)`
--      so `generate_erkeztetoszam(p_ev, p_company_id)` `ON CONFLICT (company_id, ev)`
--      succeeds for every company (including newly created/imported companies).
--   2. Synchronize `erkeztetoszam_allokacio`, `iktatoszam_allokacio`, and `ugyszam_allokacio`
--      counters with existing rows in `irat`, `ugyirat`, and `ugy` across all companies
--      so no counter ever collides with existing records.
-- =============================================================================

BEGIN;

-- 1. Ensure company_id is NOT NULL on erkeztetoszam_allokacio
UPDATE public.erkeztetoszam_allokacio
SET company_id = public.get_default_company_id()
WHERE company_id IS NULL;

ALTER TABLE public.erkeztetoszam_allokacio
  ALTER COLUMN company_id SET DEFAULT public.get_default_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- 2. Replace single-column PRIMARY KEY (ev) with composite PRIMARY KEY (company_id, ev)
ALTER TABLE public.erkeztetoszam_allokacio
  DROP CONSTRAINT IF EXISTS erkeztetoszam_allokacio_pkey;

ALTER TABLE public.erkeztetoszam_allokacio
  ADD CONSTRAINT erkeztetoszam_allokacio_pkey PRIMARY KEY (company_id, ev);

-- 3. Sync erkeztetoszam_allokacio with highest existing E/YYYY/NNNNN per company
INSERT INTO public.erkeztetoszam_allokacio (company_id, ev, utolso_sorszam)
SELECT
  i.company_id,
  split_part(i.erkeztetoszam, '/', 2)::integer AS ev,
  MAX(split_part(i.erkeztetoszam, '/', 3)::integer) AS max_sorszam
FROM public.irat i
WHERE i.company_id IS NOT NULL
  AND i.erkeztetoszam ~ '^E/[0-9]{4}/[0-9]+$'
GROUP BY i.company_id, split_part(i.erkeztetoszam, '/', 2)::integer
ON CONFLICT (company_id, ev) DO UPDATE
SET utolso_sorszam = GREATEST(public.erkeztetoszam_allokacio.utolso_sorszam, EXCLUDED.utolso_sorszam);

-- 4. Sync iktatoszam_allokacio with highest existing PREFIX/YYYY/NNNNN per company
INSERT INTO public.iktatoszam_allokacio (company_id, ev, prefix, utolso_sorszam)
SELECT
  u.company_id,
  split_part(u.iktatoszam, '/', 2)::integer AS ev,
  UPPER(split_part(u.iktatoszam, '/', 1)) AS prefix,
  MAX(split_part(u.iktatoszam, '/', 3)::integer) AS max_sorszam
FROM public.ugyirat u
WHERE u.company_id IS NOT NULL
  AND u.iktatoszam ~ '^[^/]+/[0-9]{4}/[0-9]+$'
GROUP BY u.company_id, split_part(u.iktatoszam, '/', 2)::integer, UPPER(split_part(u.iktatoszam, '/', 1))
ON CONFLICT (company_id, ev, prefix) DO UPDATE
SET utolso_sorszam = GREATEST(public.iktatoszam_allokacio.utolso_sorszam, EXCLUDED.utolso_sorszam);

-- 5. Sync ugyszam_allokacio with highest existing PREFIX/YYYY/NNNNN per company
INSERT INTO public.ugyszam_allokacio (company_id, ev, prefix, utolso_sorszam)
SELECT
  ug.company_id,
  split_part(ug.ugyszam, '/', 2)::integer AS ev,
  UPPER(split_part(ug.ugyszam, '/', 1)) AS prefix,
  MAX(split_part(ug.ugyszam, '/', 3)::integer) AS max_sorszam
FROM public.ugy ug
WHERE ug.company_id IS NOT NULL
  AND ug.ugyszam ~ '^[^/]+/[0-9]{4}/[0-9]+$'
GROUP BY ug.company_id, split_part(ug.ugyszam, '/', 2)::integer, UPPER(split_part(ug.ugyszam, '/', 1))
ON CONFLICT (company_id, ev, prefix) DO UPDATE
SET utolso_sorszam = GREATEST(public.ugyszam_allokacio.utolso_sorszam, EXCLUDED.utolso_sorszam);

-- 6. Self-verification DO block
DO $$
DECLARE
  v_pk_def text;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO v_pk_def
  FROM pg_constraint
  WHERE conrelid = 'public.erkeztetoszam_allokacio'::regclass
    AND conname = 'erkeztetoszam_allokacio_pkey';

  IF v_pk_def IS DISTINCT FROM 'PRIMARY KEY (company_id, ev)' THEN
    RAISE EXCEPTION 'Self-check failed: erkeztetoszam_allokacio_pkey is %, expected PRIMARY KEY (company_id, ev)', v_pk_def;
  END IF;
END $$;

COMMIT;

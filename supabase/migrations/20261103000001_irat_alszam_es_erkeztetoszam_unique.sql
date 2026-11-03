-- =============================================================================
-- Migration: 20261103000001_irat_alszam_es_erkeztetoszam_unique.sql
-- Scope: [Docs]
-- Purpose (J-22 DB + J-23 DB / 30. & 33. pont):
--   1. Enforce database-level uniqueness on (ugyirat_id, alszam) so concurrent
--      reply/template/filing insertions trigger SQLSTATE 23505 and activate
--      the retry loop in src/utils/alszam-helper.ts.
--   2. Enforce database-level uniqueness on (company_id, erkeztetoszam) WHERE
--      erkeztetoszam IS NOT NULL so no duplicate arrival numbers can exist
--      within the same company.
--   3. Self-verification DO block ensuring both uniqueness guards exist.
-- =============================================================================

-- 1. Pre-flight check: abort with descriptive error if any duplicate exists
DO $$
DECLARE
  v_dup_alszam_count integer;
  v_dup_erk_count integer;
BEGIN
  SELECT count(*) INTO v_dup_alszam_count
  FROM (
    SELECT ugyirat_id, alszam
    FROM public.irat
    WHERE ugyirat_id IS NOT NULL AND alszam IS NOT NULL
    GROUP BY ugyirat_id, alszam
    HAVING count(*) > 1
  ) sub_alszam;

  IF v_dup_alszam_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight check failed: % duplicate (ugyirat_id, alszam) group(s) found in public.irat.', v_dup_alszam_count;
  END IF;

  SELECT count(*) INTO v_dup_erk_count
  FROM (
    SELECT company_id, erkeztetoszam
    FROM public.irat
    WHERE erkeztetoszam IS NOT NULL
    GROUP BY company_id, erkeztetoszam
    HAVING count(*) > 1
  ) sub_erk;

  IF v_dup_erk_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight check failed: % duplicate (company_id, erkeztetoszam) group(s) found in public.irat.', v_dup_erk_count;
  END IF;
END;
$$;

-- 2. Unique constraint on (ugyirat_id, alszam) and partial unique index on (company_id, erkeztetoszam)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'irat_ugyirat_alszam_key'
      AND conrelid = 'public.irat'::regclass
  ) THEN
    ALTER TABLE public.irat ADD CONSTRAINT irat_ugyirat_alszam_key UNIQUE (ugyirat_id, alszam);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS irat_company_erkeztetoszam_key
  ON public.irat (company_id, erkeztetoszam)
  WHERE erkeztetoszam IS NOT NULL;

-- 3. Self-verifying post-check DO block
DO $$
DECLARE
  v_alszam_constraint_exists boolean;
  v_erkeztetoszam_index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'irat_ugyirat_alszam_key'
      AND conrelid = 'public.irat'::regclass
      AND contype = 'u'
  ) INTO v_alszam_constraint_exists;

  IF NOT v_alszam_constraint_exists THEN
    RAISE EXCEPTION 'Self-check failed: UNIQUE constraint irat_ugyirat_alszam_key does not exist on public.irat!';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'irat'
      AND indexname = 'irat_company_erkeztetoszam_key'
  ) INTO v_erkeztetoszam_index_exists;

  IF NOT v_erkeztetoszam_index_exists THEN
    RAISE EXCEPTION 'Self-check failed: UNIQUE index irat_company_erkeztetoszam_key does not exist on public.irat!';
  END IF;
END;
$$;

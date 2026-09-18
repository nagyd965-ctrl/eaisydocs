-- ============================================================================
-- Migration: 20260918000002_concurrency_30_users_hardening.sql
-- Description: Concurrency hardening for 30 concurrent users:
--   1. Partner clean adoszam unique index (deduplication)
--   2. Conditional unique index on active physical document checkouts
--   3. ugyszam_allokacio (ev, prefix) composite PK and prefix-aware sequence
--   4. ai_feladat_sor support for 'pdfa_conversion' task type and fajl_id
-- ============================================================================

-- 1. Partner Unique Clean Tax Index
DO $$
BEGIN
  -- Deduplicate if any exists before creating unique index
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY regexp_replace(adoszam, '[-\s]', '', 'g')
             ORDER BY created_at ASC NULLS LAST, id ASC
           ) as rn
    FROM public.partner
    WHERE adoszam IS NOT NULL AND TRIM(adoszam) <> ''
  )
  DELETE FROM public.partner
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'partner' AND indexname = 'idx_partner_clean_adoszam'
  ) THEN
    CREATE UNIQUE INDEX idx_partner_clean_adoszam 
    ON public.partner (regexp_replace(adoszam, '[-\s]', '', 'g')) 
    WHERE adoszam IS NOT NULL AND TRIM(adoszam) <> '';
  END IF;
END $$;


-- 2. Conditional Unique Index on Active Physical Checkouts
-- Ensures only 1 active checkout can exist per irat at any time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'irat_kolcsonzes_naplo' AND indexname = 'idx_irat_kolcsonzes_aktiv'
  ) THEN
    CREATE UNIQUE INDEX idx_irat_kolcsonzes_aktiv 
    ON public.irat_kolcsonzes_naplo (irat_id) 
    WHERE statusz = 'kikolcsonozve';
  END IF;
END $$;


-- 3. Upgrade ugyszam_allokacio to Composite (ev, prefix) Primary Key
DO $$
BEGIN
  -- Add prefix column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ugyszam_allokacio' AND column_name = 'prefix'
  ) THEN
    ALTER TABLE public.ugyszam_allokacio ADD COLUMN prefix TEXT NOT NULL DEFAULT 'NYILV';
  END IF;

  -- Ensure existing rows have a clean prefix
  UPDATE public.ugyszam_allokacio SET prefix = 'NYILV' WHERE prefix IS NULL OR TRIM(prefix) = '';

  -- Drop old primary key constraint if it was single-column (ev)
  BEGIN
    ALTER TABLE public.ugyszam_allokacio DROP CONSTRAINT IF EXISTS ugyszam_allokacio_pkey;
    ALTER TABLE public.ugyszam_allokacio ADD PRIMARY KEY (ev, prefix);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice updating ugyszam_allokacio primary key: %', SQLERRM;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.generate_ugyszam(p_ev INTEGER, p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sorszam INTEGER;
  v_prefix TEXT;
  v_ugyszam TEXT;
BEGIN
  v_prefix := COALESCE(NULLIF(TRIM(p_prefix), ''), 'NYILV');

  INSERT INTO public.ugyszam_allokacio (ev, prefix, utolso_sorszam)
  VALUES (p_ev, v_prefix, 1)
  ON CONFLICT (ev, prefix) DO UPDATE 
  SET utolso_sorszam = ugyszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;
  
  -- Generált szám: PENZUGY/2026/00001
  v_ugyszam := v_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_ugyszam;
END;
$$;


-- 4. Update ai_feladat_sor for PDF/A Conversion and optional fajl_id
DO $$
BEGIN
  -- Update check constraint to allow 'pdfa_conversion'
  ALTER TABLE public.ai_feladat_sor DROP CONSTRAINT IF EXISTS ai_feladat_sor_feladat_tipus_check;
  ALTER TABLE public.ai_feladat_sor ADD CONSTRAINT ai_feladat_sor_feladat_tipus_check 
  CHECK (feladat_tipus IN ('embedding', 'ai_metadata_extraction', 'ocr', 'pdfa_conversion'));

  -- Add fajl_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ai_feladat_sor' AND column_name = 'fajl_id'
  ) THEN
    ALTER TABLE public.ai_feladat_sor ADD COLUMN fajl_id UUID REFERENCES public.irat_fajl(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'ai_feladat_sor' AND indexname = 'idx_ai_feladat_sor_fajl_id'
  ) THEN
    CREATE INDEX idx_ai_feladat_sor_fajl_id ON public.ai_feladat_sor (fajl_id);
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.claim_ai_tasks(INT);
CREATE OR REPLACE FUNCTION public.claim_ai_tasks(p_limit INT DEFAULT 5)
RETURNS TABLE (
    task_id UUID,
    task_irat_id UUID,
    task_tipus TEXT,
    task_probalkozasok INT,
    task_created_at TIMESTAMPTZ,
    task_fajl_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH locked_rows AS (
        SELECT s.id
        FROM public.ai_feladat_sor s
        WHERE s.statusz = 'fuggoben'
          AND s.kovetkezo_futtatas <= NOW()
        ORDER BY s.created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.ai_feladat_sor u
    SET statusz = 'folyamatban',
        probalkozasok_szama = u.probalkozasok_szama + 1,
        updated_at = NOW()
    FROM locked_rows lr
    WHERE u.id = lr.id
    RETURNING u.id, u.irat_id, u.feladat_tipus, u.probalkozasok_szama, u.created_at, u.fajl_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ai_tasks(INT) TO authenticated, service_role, anon;

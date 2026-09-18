-- Migration: Prefix-isolated sequences for iktatószám and ügyszám (TC-15 fix)

-- 1. Ensure prefix column exists on iktatoszam_allokacio
ALTER TABLE public.iktatoszam_allokacio ADD COLUMN IF NOT EXISTS prefix TEXT NOT NULL DEFAULT 'NYILV';

-- Ensure composite primary key (ev, prefix) on iktatoszam_allokacio
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'iktatoszam_allokacio_pkey' AND conrelid = 'public.iktatoszam_allokacio'::regclass
  ) THEN
    ALTER TABLE public.iktatoszam_allokacio DROP CONSTRAINT iktatoszam_allokacio_pkey;
  END IF;
  
  ALTER TABLE public.iktatoszam_allokacio ADD PRIMARY KEY (ev, prefix);
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Ensure prefix column exists on ugyszam_allokacio
ALTER TABLE public.ugyszam_allokacio ADD COLUMN IF NOT EXISTS prefix TEXT NOT NULL DEFAULT 'NYILV';

-- Ensure composite primary key (ev, prefix) on ugyszam_allokacio
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ugyszam_allokacio_pkey' AND conrelid = 'public.ugyszam_allokacio'::regclass
  ) THEN
    ALTER TABLE public.ugyszam_allokacio DROP CONSTRAINT ugyszam_allokacio_pkey;
  END IF;

  ALTER TABLE public.ugyszam_allokacio ADD PRIMARY KEY (ev, prefix);
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Update generate_iktatoszam function to allocate per (ev, prefix)
CREATE OR REPLACE FUNCTION generate_iktatoszam(p_ev INTEGER, p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sorszam INTEGER;
  v_clean_prefix TEXT;
  v_iktatoszam TEXT;
BEGIN
  v_clean_prefix := UPPER(COALESCE(NULLIF(TRIM(p_prefix), ''), 'NYILV'));

  INSERT INTO iktatoszam_allokacio (ev, prefix, utolso_sorszam)
  VALUES (p_ev, v_clean_prefix, 1)
  ON CONFLICT (ev, prefix) DO UPDATE 
  SET utolso_sorszam = iktatoszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;
  
  -- Generált szám: PENZUGY/2026/00001
  v_iktatoszam := v_clean_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_iktatoszam;
END;
$$;

-- 4. Update generate_ugyszam function to allocate per (ev, prefix)
CREATE OR REPLACE FUNCTION generate_ugyszam(p_ev INTEGER, p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sorszam INTEGER;
  v_clean_prefix TEXT;
  v_ugyszam TEXT;
BEGIN
  v_clean_prefix := UPPER(COALESCE(NULLIF(TRIM(p_prefix), ''), 'NYILV'));

  INSERT INTO ugyszam_allokacio (ev, prefix, utolso_sorszam)
  VALUES (p_ev, v_clean_prefix, 1)
  ON CONFLICT (ev, prefix) DO UPDATE 
  SET utolso_sorszam = ugyszam_allokacio.utolso_sorszam + 1
  RETURNING utolso_sorszam INTO v_sorszam;
  
  -- Generált szám: PENZUGY/2026/00001
  v_ugyszam := v_clean_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0');
  RETURN v_ugyszam;
END;
$$;

-- 5. Seed/Sync iktatoszam_allokacio from existing iktatoszam in ugyirat
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT 
      UPPER(split_part(iktatoszam, '/', 1)) AS p_prefix,
      split_part(iktatoszam, '/', 2)::INT AS p_ev,
      MAX(split_part(iktatoszam, '/', 3)::INT) AS max_num
    FROM ugyirat
    WHERE iktatoszam ~ '^[A-Za-z0-9_-]+/[0-9]{4}/[0-9]+'
    GROUP BY 1, 2
  ) LOOP
    INSERT INTO iktatoszam_allokacio (ev, prefix, utolso_sorszam)
    VALUES (r.p_ev, r.p_prefix, r.max_num)
    ON CONFLICT (ev, prefix) DO UPDATE
    SET utolso_sorszam = GREATEST(iktatoszam_allokacio.utolso_sorszam, EXCLUDED.utolso_sorszam);
  END LOOP;
END $$;

-- ============================================================================
-- Migration: 20261027000001_career_portal_pro_upgrade.sql
-- Purpose: International-level Career Portal & Multi-Company ATS upgrade
-- ============================================================================

-- 1. Extend hr_allashirdetes with structured job metadata & EU Pay Transparency fields
ALTER TABLE public.hr_allashirdetes
  ADD COLUMN IF NOT EXISTS munkavegzes_modja text DEFAULT 'hibrid',
  ADD COLUMN IF NOT EXISTS helyszin text,
  ADD COLUMN IF NOT EXISTS foglalkoztatas_tipusa text DEFAULT 'teljes_munkaido',
  ADD COLUMN IF NOT EXISTS tapasztalati_szint text DEFAULT 'medior',
  ADD COLUMN IF NOT EXISTS reszleg_nev text,
  ADD COLUMN IF NOT EXISTS bersav_min integer,
  ADD COLUMN IF NOT EXISTS bersav_max integer,
  ADD COLUMN IF NOT EXISTS bersav_publikus boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS jelentkezesi_hatarido date;

-- Backfill company_id on hr_allashirdetes from hr_munkakor where missing
UPDATE public.hr_allashirdetes a
SET company_id = m.company_id
FROM public.hr_munkakor m
WHERE a.munkakor_id = m.id
  AND a.company_id IS NULL
  AND m.company_id IS NOT NULL;

-- Backfill default structured metadata on existing postings so they render richly
UPDATE public.hr_allashirdetes a
SET
  helyszin = COALESCE(a.helyszin, c.address, 'Budapest'),
  munkavegzes_modja = COALESCE(a.munkavegzes_modja, 'hibrid'),
  foglalkoztatas_tipusa = COALESCE(a.foglalkoztatas_tipusa, 'teljes_munkaido'),
  tapasztalati_szint = CASE
    WHEN LOWER(a.cim) LIKE '%senior%' OR LOWER(a.cim) LIKE '%lead%' THEN 'senior'
    WHEN LOWER(a.cim) LIKE '%junior%' THEN 'junior'
    ELSE COALESCE(a.tapasztalati_szint, 'medior')
  END
FROM public.companies c
WHERE a.company_id = c.id;

-- Add realistic salary ranges to existing demo postings if not set yet
UPDATE public.hr_allashirdetes
SET
  bersav_min = 1200000,
  bersav_max = 1650000,
  bersav_publikus = true,
  munkavegzes_modja = 'hibrid',
  tapasztalati_szint = 'senior'
WHERE LOWER(cim) LIKE '%senior full-stack%' AND bersav_min IS NULL;

UPDATE public.hr_allashirdetes
SET
  bersav_min = 850000,
  bersav_max = 1150000,
  bersav_publikus = true,
  munkavegzes_modja = 'hibrid',
  tapasztalati_szint = 'medior'
WHERE LOWER(cim) LIKE '%ux/ui%' AND bersav_min IS NULL;

UPDATE public.hr_allashirdetes
SET
  bersav_min = 650000,
  bersav_max = 850000,
  bersav_publikus = true,
  munkavegzes_modja = 'irodai',
  tapasztalati_szint = 'medior'
WHERE LOWER(cim) LIKE '%flotta%' AND bersav_min IS NULL;

-- 2. Extend hr_toborzas for international ATS candidate fields & Spontaneous Talent Pool
ALTER TABLE public.hr_toborzas
  ALTER COLUMN megpalyazott_munkakor_id DROP NOT NULL;

ALTER TABLE public.hr_toborzas
  ADD COLUMN IF NOT EXISTS palyazati_kod text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS berigeny integer,
  ADD COLUMN IF NOT EXISTS kezdesi_ido text,
  ADD COLUMN IF NOT EXISTS forras text DEFAULT 'karrieroldal',
  ADD COLUMN IF NOT EXISTS megpalyazott_terulet text;

-- Backfill palyazati_kod for existing candidates
UPDATE public.hr_toborzas
SET palyazati_kod = 'KAR-' || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::text || '-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
WHERE palyazati_kod IS NULL;

CREATE INDEX IF NOT EXISTS idx_hr_allashirdetes_company_id ON public.hr_allashirdetes(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_toborzas_company_id ON public.hr_toborzas(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_toborzas_palyazati_kod ON public.hr_toborzas(palyazati_kod);

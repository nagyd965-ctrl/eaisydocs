-- Migration: 20260930000002_partner_expansion.sql
-- B7 Feladat: Partnertörzs bővítés (szerepkör, státusz, pénzügyi mezők, kapcsolattartók tábla)

-- 1. Új mezők a partner táblához
ALTER TABLE public.partner 
  ADD COLUMN IF NOT EXISTS szerepkor TEXT DEFAULT 'vevo',
  ADD COLUMN IF NOT EXISTS statusz TEXT DEFAULT 'aktiv',
  ADD COLUMN IF NOT EXISTS bankszamlaszam TEXT,
  ADD COLUMN IF NOT EXISTS fizetesi_hatarido_nap INT DEFAULT 8,
  ADD COLUMN IF NOT EXISTS fizetesi_mod TEXT DEFAULT 'atutalas',
  ADD COLUMN IF NOT EXISTS weboldal TEXT,
  ADD COLUMN IF NOT EXISTS megjegyzes TEXT,
  ADD COLUMN IF NOT EXISTS eaisybill_partner_id TEXT;

-- Szerepkör és státusz integritási megszorítások
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_partner_szerepkor'
  ) THEN
    ALTER TABLE public.partner
      ADD CONSTRAINT chk_partner_szerepkor 
      CHECK (szerepkor IN ('vevo', 'szallito', 'mindketto', 'hatosag', 'bank', 'egyeb'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_partner_statusz'
  ) THEN
    ALTER TABLE public.partner
      ADD CONSTRAINT chk_partner_statusz 
      CHECK (statusz IN ('aktiv', 'inaktiv'));
  END IF;
END $$;

-- 2. Partner kapcsolattartók tábla létrehozása
CREATE TABLE IF NOT EXISTS public.partner_kapcsolattarto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner(id) ON DELETE CASCADE,
  nev TEXT NOT NULL,
  beosztas TEXT,
  email TEXT,
  telefonszam TEXT,
  elsodleges BOOLEAN DEFAULT false,
  megjegyzes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index a gyors kapcsolattartó lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_partner_kapcsolattarto_partner_id 
  ON public.partner_kapcsolattarto(partner_id);

-- RLS bekapcsolása a kapcsolattartók táblán
ALTER TABLE public.partner_kapcsolattarto ENABLE ROW LEVEL SECURITY;

-- Szabályok: hitelesített felhasználók teljes hozzáféréssel bírnak
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partner_kapcsolattarto' AND policyname = 'partner_kapcsolattarto_authenticated_all'
  ) THEN
    CREATE POLICY partner_kapcsolattarto_authenticated_all
      ON public.partner_kapcsolattarto
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partner_kapcsolattarto' AND policyname = 'partner_kapcsolattarto_anon_read'
  ) THEN
    CREATE POLICY partner_kapcsolattarto_anon_read
      ON public.partner_kapcsolattarto
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

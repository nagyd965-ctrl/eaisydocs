-- Migration: 20261004000001_add_irat_expedialas.sql
-- Kimenő iratok kézbesítési (expediálási) mezőinek hozzáadása

ALTER TABLE public.irat
  ADD COLUMN IF NOT EXISTS kezbesites_modja TEXT,
  ADD COLUMN IF NOT EXISTS kezbesites_datuma TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kezbesites_cimzett TEXT,
  ADD COLUMN IF NOT EXISTS kezbesites_azonosito TEXT,
  ADD COLUMN IF NOT EXISTS kezbesites_statusz TEXT DEFAULT 'nincs_expedialva',
  ADD COLUMN IF NOT EXISTS kezbesites_megjegyzes TEXT;

-- Index az expediálási állapot gyors lekérdezéséhez
CREATE INDEX IF NOT EXISTS idx_irat_kezbesites_statusz ON public.irat(kezbesites_statusz);

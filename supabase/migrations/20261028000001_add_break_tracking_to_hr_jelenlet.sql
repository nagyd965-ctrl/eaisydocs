-- ============================================================================
-- Migration: 20261028000001_add_break_tracking_to_hr_jelenlet.sql
-- Purpose: Persist lunch break (ebédszünet) and non-working resume gaps in hr_jelenlet
-- ============================================================================

ALTER TABLE public.hr_jelenlet
  ADD COLUMN IF NOT EXISTS szunet_perc integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS szunet_ms bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS szunet_kezdete timestamptz DEFAULT NULL;

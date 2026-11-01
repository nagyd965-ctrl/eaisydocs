-- =============================================================================
-- Migration: 20261101000005_drop_surviving_d1_d3_policies.sql
-- Scope: [Közös] / [HR]
-- Description:
--   Drop the surviving legacy permissive RLS policies on hr_munkaszuneti_nap,
--   hr_kpi_katalogus, and ertesitesi_szabaly using their exact names from
--   live pg_policies, followed by an automated verification DO block.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Mindenki olvashatja a munkaszüneti napokat" ON public.hr_munkaszuneti_nap;
DROP POLICY IF EXISTS "HR kezeli a munkaszüneti napokat" ON public.hr_munkaszuneti_nap;
DROP POLICY IF EXISTS "Mindenki latja a KPI katalogust akinek van HR modulja" ON public.hr_kpi_katalogus;
DROP POLICY IF EXISTS "HR adminok es vezetok modolithatjak a KPI katalogust" ON public.hr_kpi_katalogus;
DROP POLICY IF EXISTS "Mindenki olvashatja a szabalyokat" ON public.ertesitesi_szabaly;
DROP POLICY IF EXISTS "Csak admin szerkesztheti a szabalyokat" ON public.ertesitesi_szabaly;

DO $$
DECLARE
  v_unexpected_count integer;
  v_unexpected_list text;
BEGIN
  SELECT
    count(*),
    string_agg(tablename || '.' || policyname, ', ' ORDER BY tablename, policyname)
  INTO v_unexpected_count, v_unexpected_list
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('hr_munkaszuneti_nap', 'hr_kpi_katalogus', 'ertesitesi_szabaly')
    AND policyname NOT IN (
      'hr_munkaszuneti_nap_select', 'hr_munkaszuneti_nap_write',
      'hr_kpi_katalogus_select', 'hr_kpi_katalogus_write',
      'ertesitesi_szabaly_company_isolation', 'ertesitesi_szabaly_select', 'ertesitesi_szabaly_write'
    );

  IF v_unexpected_count > 0 THEN
    RAISE EXCEPTION 'Unexpected RLS policies remained on D1-D3 tables (%): %', v_unexpected_count, v_unexpected_list;
  END IF;
END $$;

COMMIT;


-- ============================================================================
-- Migration: 20261103000004_management_dashboard_schema.sql
-- Purpose:
--   1. Add `elerheto_modulok` (eaisyDocs / eaisyHR module registration),
--      `is_active`, and `plan` columns to `public.companies`.
--   2. Create `public.app_error_logs` for the Management Dashboard Control Center
--      (Hibaközpont) with RLS and performance indexes.
-- ============================================================================

BEGIN;

-- 1. Extend public.companies with module registration & status fields
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS elerheto_modulok text[] NOT NULL DEFAULT ARRAY['docs', 'hr']::text[],
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'PRO';

-- Initialize MAURONI MARCO ROMANO as an eaisyDocs-registered company if it has no HR members
UPDATE public.companies c
SET elerheto_modulok = ARRAY['docs']::text[]
WHERE c.id = '2cf8bf64-30de-465f-818c-d9be81bdc213'
  AND NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = c.id AND cm.hr_szerepkor IS NOT NULL
  );

-- 2. Create public.app_error_logs for central observability
CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  error_type text NOT NULL DEFAULT 'frontend',
  severity text NOT NULL DEFAULT 'error',
  component text,
  action text,
  message text NOT NULL,
  stack_trace text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  url text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at ON public.app_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_company_id ON public.app_error_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_error_type ON public.app_error_logs (error_type);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_severity ON public.app_error_logs (severity);

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_error_logs_insert_authenticated" ON public.app_error_logs;
CREATE POLICY "app_error_logs_insert_authenticated"
  ON public.app_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "app_error_logs_select_superadmin" ON public.app_error_logs;
CREATE POLICY "app_error_logs_select_superadmin"
  ON public.app_error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil fp
      WHERE fp.id = (SELECT auth.uid())
        AND (
          fp.szerepkor IN ('admin', 'rendszergazda')
          OR fp.docs_szerepkor IN ('admin', 'rendszergazda')
          OR fp.hr_szerepkor IN ('admin', 'rendszergazda')
        )
    )
  );

DROP POLICY IF EXISTS "app_error_logs_delete_superadmin" ON public.app_error_logs;
CREATE POLICY "app_error_logs_delete_superadmin"
  ON public.app_error_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil fp
      WHERE fp.id = (SELECT auth.uid())
        AND (
          fp.szerepkor IN ('admin', 'rendszergazda')
          OR fp.docs_szerepkor IN ('admin', 'rendszergazda')
          OR fp.hr_szerepkor IN ('admin', 'rendszergazda')
        )
    )
  );

COMMIT;

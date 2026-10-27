-- ============================================================================
-- Migration: 20261027000002_add_career_presentation_to_companies.sql
-- Purpose: Add multi-company AI Career Presentation (career_presentation jsonb)
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS career_presentation jsonb;

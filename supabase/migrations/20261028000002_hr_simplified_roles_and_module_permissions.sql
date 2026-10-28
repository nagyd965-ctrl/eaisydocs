-- ============================================================================
-- Migration: 20261028000002_hr_simplified_roles_and_module_permissions.sql
-- Purpose: Simplify HR roles to 3 core roles (munkavallalo, vezeto, admin)
--          and add per-user module toggle permissions (hr_modulok text[])
-- ============================================================================

-- 1. Add hr_modulok array column to felhasznalo_profil and company_members
ALTER TABLE public.felhasznalo_profil
  ADD COLUMN IF NOT EXISTS hr_modulok text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS hr_modulok text[] NOT NULL DEFAULT '{}';

-- 2. Drop any restrictive check constraint on hr_szerepkor if present, then re-add clean check
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE conrelid IN ('public.felhasznalo_profil'::regclass, 'public.company_members'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%hr_szerepkor%'
  ) LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- 3. Migrate legacy roles in felhasznalo_profil to (munkavallalo, vezeto, admin) + hr_modulok
UPDATE public.felhasznalo_profil
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','compliance','reports','recruitment','onboarding','offboarding','audit'],
  hr_szerepkor = 'admin'
WHERE hr_szerepkor IN ('admin', 'rendszergazda');

UPDATE public.felhasznalo_profil
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','compliance','reports','recruitment','onboarding','offboarding','audit'],
  hr_szerepkor = 'vezeto'
WHERE hr_szerepkor = 'hr_vezeto';

UPDATE public.felhasznalo_profil
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','compliance','reports','recruitment','onboarding','offboarding','audit'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor IN ('hr_munkatars', 'auditor');

UPDATE public.felhasznalo_profil
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','reports'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor = 'berugyi';

UPDATE public.felhasznalo_profil
SET
  hr_modulok = ARRAY['admin','compliance'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor = 'munkavedelmi';

UPDATE public.felhasznalo_profil
SET
  hr_modulok = ARRAY['recruitment','onboarding'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor = 'toborzo';

-- 4. Migrate legacy roles in company_members to (munkavallalo, vezeto, admin) + hr_modulok
UPDATE public.company_members
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','compliance','reports','recruitment','onboarding','offboarding','audit'],
  hr_szerepkor = 'admin'
WHERE hr_szerepkor IN ('admin', 'rendszergazda');

UPDATE public.company_members
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','compliance','reports','recruitment','onboarding','offboarding','audit'],
  hr_szerepkor = 'vezeto'
WHERE hr_szerepkor = 'hr_vezeto';

UPDATE public.company_members
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','compliance','reports','recruitment','onboarding','offboarding','audit'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor IN ('hr_munkatars', 'auditor');

UPDATE public.company_members
SET
  hr_modulok = ARRAY['admin','organization','time','payroll','reports'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor = 'berugyi';

UPDATE public.company_members
SET
  hr_modulok = ARRAY['admin','compliance'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor = 'munkavedelmi';

UPDATE public.company_members
SET
  hr_modulok = ARRAY['recruitment','onboarding'],
  hr_szerepkor = 'munkavallalo'
WHERE hr_szerepkor = 'toborzo';

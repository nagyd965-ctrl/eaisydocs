-- Migration: 20261018000001_fix_company_members_select_policy.sql
-- Cél: A company_members SELECT házirendjének javítása.
-- A cég bármely tagja láthatja a cég többi tagját (kollégákat), így a HR vezetők,
-- részlegvezetők és iratkezelők látják a céghez tartozó munkatársakat,
-- miközben a cégek közötti szigorú izoláció (public.user_has_company_access) 100%-ban fennmarad.

DROP POLICY IF EXISTS "Members can view their own memberships" ON public.company_members;
DROP POLICY IF EXISTS "Members can view members of their own companies" ON public.company_members;

CREATE POLICY "Members can view members of their own companies"
  ON public.company_members FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
  );

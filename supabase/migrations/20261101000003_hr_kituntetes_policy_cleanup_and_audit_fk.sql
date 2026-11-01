-- ============================================================================
-- 20261101000003_hr_kituntetes_policy_cleanup_and_audit_fk.sql
-- eaisyHR 5. Kategória (Verifikációs P0/P1 csomag):
--   1. [P0-1] hr_kituntetes (és a többi karton/onboarding/offboarding tábla)
--      örökölt USING (true) permissive policy-jeinek eltávolítása és lecserélése
--      2 paraméteres has_hr_module_access(..., company_id) szabályokra.
--   2. [P1-16] set_hr_esemeny_naplo_company_id trigger és hr_esemeny_naplo
--      company_id FK (ON DELETE SET NULL) javítása, hogy cégtörléskor az audit
--      naplóbejegyzés soha ne törlődjön.
-- ============================================================================

-- ============================================================================
-- 1. [P0-1] Örökölt USING (true) permissive szabályok eltávolítása és pótlása
-- ============================================================================

-- 1.1 hr_kituntetes (a hr_kituntetes_select és hr_kituntetes_modify már létezik 20261101000001-ből)
DROP POLICY IF EXISTS "Kituntetesek olvasasa" ON public.hr_kituntetes;
DROP POLICY IF EXISTS "Kituntetesek kezelese" ON public.hr_kituntetes;

-- 1.2 hr_fegyelmi (a "Dolgozo vagy HR lathatja a fegyelmi ugyeket" és "Csak HR vagy Admin kezelheti a fegyelmi ugyeket" már létezik)
DROP POLICY IF EXISTS "Fegyelmi olvasas" ON public.hr_fegyelmi;
DROP POLICY IF EXISTS "Fegyelmi iras" ON public.hr_fegyelmi;

-- 1.3 hr_orvosi_vizsgalat (a "Dolgozo vagy HR lathatja az orvosi adatokat" és "Csak HR vagy munkavedelmi irhat orvosi adatokat" már létezik)
DROP POLICY IF EXISTS "Orvosi olvasas" ON public.hr_orvosi_vizsgalat;
DROP POLICY IF EXISTS "Orvosi iras" ON public.hr_orvosi_vizsgalat;

-- 1.4 hr_elozo_munkahely
DROP POLICY IF EXISTS "Munkahely olvasas" ON public.hr_elozo_munkahely;
DROP POLICY IF EXISTS "Munkahely iras" ON public.hr_elozo_munkahely;
DROP POLICY IF EXISTS "hr_elozo_munkahely_select" ON public.hr_elozo_munkahely;
DROP POLICY IF EXISTS "hr_elozo_munkahely_modify" ON public.hr_elozo_munkahely;

CREATE POLICY "hr_elozo_munkahely_select" ON public.hr_elozo_munkahely
  FOR SELECT TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'offboarding', 'compliance', 'audit'], company_id)
  );

CREATE POLICY "hr_elozo_munkahely_modify" ON public.hr_elozo_munkahely
  FOR ALL TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding'], company_id)
  )
  WITH CHECK (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding'], company_id)
  );

-- 1.5 hr_kepzettseg
DROP POLICY IF EXISTS "Kepzettseg olvasas" ON public.hr_kepzettseg;
DROP POLICY IF EXISTS "Kepzettseg iras" ON public.hr_kepzettseg;
DROP POLICY IF EXISTS "hr_kepzettseg_select" ON public.hr_kepzettseg;
DROP POLICY IF EXISTS "hr_kepzettseg_modify" ON public.hr_kepzettseg;

CREATE POLICY "hr_kepzettseg_select" ON public.hr_kepzettseg
  FOR SELECT TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'performance', 'compliance', 'audit'], company_id)
  );

CREATE POLICY "hr_kepzettseg_modify" ON public.hr_kepzettseg
  FOR ALL TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'performance'], company_id)
  )
  WITH CHECK (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'performance'], company_id)
  );

-- 1.6 hr_tanulmanyi_szerzodes
DROP POLICY IF EXISTS "Szerzodes olvasas" ON public.hr_tanulmanyi_szerzodes;
DROP POLICY IF EXISTS "Szerzodes iras" ON public.hr_tanulmanyi_szerzodes;
DROP POLICY IF EXISTS "hr_tanulmanyi_szerzodes_select" ON public.hr_tanulmanyi_szerzodes;
DROP POLICY IF EXISTS "hr_tanulmanyi_szerzodes_modify" ON public.hr_tanulmanyi_szerzodes;

CREATE POLICY "hr_tanulmanyi_szerzodes_select" ON public.hr_tanulmanyi_szerzodes
  FOR SELECT TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'payroll', 'compliance', 'audit'], company_id)
  );

CREATE POLICY "hr_tanulmanyi_szerzodes_modify" ON public.hr_tanulmanyi_szerzodes
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'payroll'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'payroll'], company_id)
  );

-- 1.7 hr_munkahelyi_eszkoz
DROP POLICY IF EXISTS "HR modul eszkoz olvasas" ON public.hr_munkahelyi_eszkoz;
DROP POLICY IF EXISTS "HR modul eszkoz iras" ON public.hr_munkahelyi_eszkoz;
DROP POLICY IF EXISTS "hr_munkahelyi_eszkoz_select" ON public.hr_munkahelyi_eszkoz;
DROP POLICY IF EXISTS "hr_munkahelyi_eszkoz_modify" ON public.hr_munkahelyi_eszkoz;

CREATE POLICY "hr_munkahelyi_eszkoz_select" ON public.hr_munkahelyi_eszkoz
  FOR SELECT TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'offboarding', 'compliance', 'audit'], company_id)
  );

CREATE POLICY "hr_munkahelyi_eszkoz_modify" ON public.hr_munkahelyi_eszkoz
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'offboarding'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'employees', 'organization', 'onboarding', 'offboarding'], company_id)
  );

-- 1.8 hr_onboarding és hr_onboarding_feladat
DROP POLICY IF EXISTS "Onboarding olvasás" ON public.hr_onboarding;
DROP POLICY IF EXISTS "Onboarding írás" ON public.hr_onboarding;
DROP POLICY IF EXISTS "hr_onboarding_select" ON public.hr_onboarding;
DROP POLICY IF EXISTS "hr_onboarding_modify" ON public.hr_onboarding;

CREATE POLICY "hr_onboarding_select" ON public.hr_onboarding
  FOR SELECT TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'onboarding', 'employees', 'organization', 'audit'], company_id)
  );

CREATE POLICY "hr_onboarding_modify" ON public.hr_onboarding
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'onboarding', 'employees'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'onboarding', 'employees'], company_id)
  );

DROP POLICY IF EXISTS "Onboarding feladat olvasás" ON public.hr_onboarding_feladat;
DROP POLICY IF EXISTS "Onboarding feladat írás" ON public.hr_onboarding_feladat;
DROP POLICY IF EXISTS "hr_onboarding_feladat_select" ON public.hr_onboarding_feladat;
DROP POLICY IF EXISTS "hr_onboarding_feladat_modify" ON public.hr_onboarding_feladat;

CREATE POLICY "hr_onboarding_feladat_select" ON public.hr_onboarding_feladat
  FOR SELECT TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'onboarding', 'employees', 'organization', 'audit'], company_id)
    OR EXISTS (
      SELECT 1 FROM public.hr_onboarding o
      WHERE o.id = hr_onboarding_feladat.onboarding_id AND o.dolgozo_id = auth.uid()
    )
  );

CREATE POLICY "hr_onboarding_feladat_modify" ON public.hr_onboarding_feladat
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'onboarding', 'employees'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'onboarding', 'employees'], company_id)
  );

-- 1.9 hr_offboarding és hr_offboarding_feladat
DROP POLICY IF EXISTS "Offboarding olvasás" ON public.hr_offboarding;
DROP POLICY IF EXISTS "Offboarding írás" ON public.hr_offboarding;
DROP POLICY IF EXISTS "hr_offboarding_select" ON public.hr_offboarding;
DROP POLICY IF EXISTS "hr_offboarding_modify" ON public.hr_offboarding;

CREATE POLICY "hr_offboarding_select" ON public.hr_offboarding
  FOR SELECT TO authenticated
  USING (
    dolgozo_id = auth.uid()
    OR public.has_hr_module_access(ARRAY['admin', 'offboarding', 'employees', 'organization', 'payroll', 'audit'], company_id)
  );

CREATE POLICY "hr_offboarding_modify" ON public.hr_offboarding
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'offboarding', 'employees'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'offboarding', 'employees'], company_id)
  );

DROP POLICY IF EXISTS "Offboarding feladat olvasás" ON public.hr_offboarding_feladat;
DROP POLICY IF EXISTS "Offboarding feladat írás" ON public.hr_offboarding_feladat;
DROP POLICY IF EXISTS "hr_offboarding_feladat_select" ON public.hr_offboarding_feladat;
DROP POLICY IF EXISTS "hr_offboarding_feladat_modify" ON public.hr_offboarding_feladat;

CREATE POLICY "hr_offboarding_feladat_select" ON public.hr_offboarding_feladat
  FOR SELECT TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'offboarding', 'employees', 'organization', 'audit'], company_id)
    OR EXISTS (
      SELECT 1 FROM public.hr_offboarding o
      WHERE o.id = hr_offboarding_feladat.offboarding_id AND o.dolgozo_id = auth.uid()
    )
  );

CREATE POLICY "hr_offboarding_feladat_modify" ON public.hr_offboarding_feladat
  FOR ALL TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'offboarding', 'employees'], company_id)
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'offboarding', 'employees'], company_id)
  );

-- ============================================================================
-- 2. [P1-16] Cégtörlési audit-napló megőrzése (trigger + ON DELETE SET NULL)
-- ============================================================================

-- 2.1 A set_hr_esemeny_naplo_company_id trigger ne írja felül a NULL-t, ha
--     cégtörlési ('companies' + 'adat_torles') eseményről van szó.
CREATE OR REPLACE FUNCTION public.set_hr_esemeny_naplo_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NEW.company_id IS NULL THEN
    -- Cégtörlésnél szándékosan NULL a company_id, hogy a törölt cég után is megmaradjon a napló
    IF NEW.entitas_tipus = 'companies' AND NEW.esemeny_tipus = 'adat_torles' THEN
      RETURN NEW;
    END IF;

    v_uid := COALESCE(NEW.felhasznalo_id, auth.uid());

    IF v_uid IS NOT NULL THEN
      SELECT cm.company_id INTO NEW.company_id
      FROM public.company_members cm
      WHERE cm.user_id = v_uid
      ORDER BY cm.created_at ASC
      LIMIT 1;
    END IF;

    IF NEW.company_id IS NULL THEN
      SELECT id INTO NEW.company_id
      FROM public.companies
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2.2 A hr_esemeny_naplo.company_id külső kulcs ON DELETE SET NULL legyen ON DELETE CASCADE helyett
ALTER TABLE public.hr_esemeny_naplo
  DROP CONSTRAINT IF EXISTS hr_esemeny_naplo_company_id_fkey;

ALTER TABLE public.hr_esemeny_naplo
  ADD CONSTRAINT hr_esemeny_naplo_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


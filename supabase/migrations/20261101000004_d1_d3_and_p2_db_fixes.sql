-- =============================================================================
-- Migration: 20261101000004_d1_d3_and_p2_db_fixes.sql
-- Scope: [Közös] / [HR]
-- Description:
--   1. [D1] hr_munkaszuneti_nap: add nullable company_id (NULL = országos alap,
--      NOT NULL = vállalati felülbírálás / egyedi munkanap-áthelyezés), partial
--      unique indexes, and 2-parameter RLS policies.
--   2. [D2] ertesitesi_szabaly: add company_id, backfill existing rules to the
--      primary company and clone to all other companies, add trigger on
--      public.companies AFTER INSERT to seed default rules for new companies,
--      and add RESTRICTIVE + company-scoped PERMISSIVE RLS policies.
--   3. [D3] hr_kpi_katalogus: add nullable company_id (NULL = központi sablon,
--      NOT NULL = vállalati saját KPI), index, and 2-parameter RLS policies.
--   4. [P2/A] hr_esemeny_naplo: tighten INSERT policy WITH CHECK from (true) to
--      enforce caller identity (felhasznalo_id = auth.uid()) and company access.
--   5. [P2/B] hr_cafeteria_keret & hr_berpapir: include company_id in unique
--      constraints so multi-company employees do not overwrite each other on upsert.
--   6. [P2/C] admin_update_user_profile: make the UPDATE EXISTS check on
--      company_members symmetrical with v_has_shared_admin_company (include
--      public.has_hr_module_access(ARRAY['admin'], cm_caller.company_id)).
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. [D1] hr_munkaszuneti_nap — Országos alap (NULL) + vállalati felülbírálás
-- =============================================================================

ALTER TABLE public.hr_munkaszuneti_nap
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.hr_munkaszuneti_nap
  DROP CONSTRAINT IF EXISTS hr_munkaszuneti_nap_datum_key;

CREATE UNIQUE INDEX IF NOT EXISTS hr_munkaszuneti_nap_global_datum_idx
  ON public.hr_munkaszuneti_nap(datum)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hr_munkaszuneti_nap_company_datum_idx
  ON public.hr_munkaszuneti_nap(company_id, datum)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hr_munkaszuneti_nap_company_id
  ON public.hr_munkaszuneti_nap(company_id);

DROP POLICY IF EXISTS "Munkaszuneti napok olvasasa" ON public.hr_munkaszuneti_nap;
DROP POLICY IF EXISTS "Munkaszuneti napok kezelese" ON public.hr_munkaszuneti_nap;
DROP POLICY IF EXISTS "hr_munkaszuneti_nap_select" ON public.hr_munkaszuneti_nap;
DROP POLICY IF EXISTS "hr_munkaszuneti_nap_write" ON public.hr_munkaszuneti_nap;

CREATE POLICY "hr_munkaszuneti_nap_select" ON public.hr_munkaszuneti_nap
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    OR public.user_has_company_access(company_id)
  );

CREATE POLICY "hr_munkaszuneti_nap_write" ON public.hr_munkaszuneti_nap
  FOR ALL
  TO authenticated
  USING (
    company_id IS NOT NULL
    AND public.user_has_company_access(company_id)
    AND public.has_hr_module_access(ARRAY['admin', 'time'], company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND public.user_has_company_access(company_id)
    AND public.has_hr_module_access(ARRAY['admin', 'time'], company_id)
  );


-- =============================================================================
-- 2. [D2] ertesitesi_szabaly — Vállalati szintű értesítési szabályok + klónozás
-- =============================================================================

ALTER TABLE public.ertesitesi_szabaly
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.ertesitesi_szabaly
  DROP CONSTRAINT IF EXISTS ertesitesi_szabaly_esemeny_tipus_kinek_key;

-- 2.1. Meglévő NULL company_id-jú sorok hozzárendelése az elsődleges vállalathoz
UPDATE public.ertesitesi_szabaly
SET company_id = (
  SELECT c.id
  FROM public.companies c
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE company_id IS NULL;

-- 2.2. Alapértelmezett szabályok klónozása minden további vállalathoz
INSERT INTO public.ertesitesi_szabaly (esemeny_tipus, kinek, aktiv, csatorna, company_id)
SELECT
  src.esemeny_tipus,
  src.kinek,
  src.aktiv,
  src.csatorna,
  c.id AS company_id
FROM public.companies c
CROSS JOIN (
  SELECT DISTINCT ON (esemeny_tipus, kinek)
    esemeny_tipus,
    kinek,
    aktiv,
    csatorna
  FROM public.ertesitesi_szabaly
  ORDER BY esemeny_tipus, kinek, created_at ASC
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ertesitesi_szabaly existing
  WHERE existing.company_id = c.id
    AND existing.esemeny_tipus = src.esemeny_tipus
    AND existing.kinek = src.kinek
);

CREATE INDEX IF NOT EXISTS idx_ertesitesi_szabaly_company_id
  ON public.ertesitesi_szabaly(company_id);

ALTER TABLE public.ertesitesi_szabaly
  DROP CONSTRAINT IF EXISTS ertesitesi_szabaly_company_esemeny_kinek_key;

ALTER TABLE public.ertesitesi_szabaly
  ADD CONSTRAINT ertesitesi_szabaly_company_esemeny_kinek_key
  UNIQUE (company_id, esemeny_tipus, kinek);

-- 2.3. Trigger új vállalat létrehozásakor az alapértelmezett szabályok automatikus létrehozására
CREATE OR REPLACE FUNCTION public.seed_company_notification_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.ertesitesi_szabaly (esemeny_tipus, kinek, aktiv, csatorna, company_id)
  SELECT
    src.esemeny_tipus,
    src.kinek,
    true AS aktiv,
    src.csatorna,
    NEW.id AS company_id
  FROM (
    SELECT DISTINCT ON (esemeny_tipus, kinek)
      esemeny_tipus,
      kinek,
      csatorna
    FROM public.ertesitesi_szabaly
    WHERE company_id IS NOT NULL
    ORDER BY esemeny_tipus, kinek, created_at ASC
  ) src
  ON CONFLICT (company_id, esemeny_tipus, kinek) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_seed_company_notification_rules ON public.companies;
CREATE TRIGGER trg_seed_company_notification_rules
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_company_notification_rules();

-- 2.4. RLS szabályok (RESTRICTIVE + 2-paraméteres PERMISSIVE)
DROP POLICY IF EXISTS "Mindenki olvashatja a szabályokat" ON public.ertesitesi_szabaly;
DROP POLICY IF EXISTS "Admin módosíthatja a szabályokat" ON public.ertesitesi_szabaly;
DROP POLICY IF EXISTS ertesitesi_szabaly_company_isolation ON public.ertesitesi_szabaly;
DROP POLICY IF EXISTS "ertesitesi_szabaly_select" ON public.ertesitesi_szabaly;
DROP POLICY IF EXISTS "ertesitesi_szabaly_write" ON public.ertesitesi_szabaly;

CREATE POLICY ertesitesi_szabaly_company_isolation ON public.ertesitesi_szabaly
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

CREATE POLICY "ertesitesi_szabaly_select" ON public.ertesitesi_szabaly
  FOR SELECT
  TO authenticated
  USING (public.user_has_company_access(company_id));

CREATE POLICY "ertesitesi_szabaly_write" ON public.ertesitesi_szabaly
  FOR ALL
  TO authenticated
  USING (
    public.has_hr_module_access(ARRAY['admin', 'organization'], company_id)
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.company_id = ertesitesi_szabaly.company_id
        AND (
          cm.role IN ('owner', 'admin')
          OR cm.docs_szerepkor::text IN ('admin', 'rendszergazda')
          OR cm.hr_szerepkor::text IN ('admin', 'rendszergazda')
        )
    )
  )
  WITH CHECK (
    public.has_hr_module_access(ARRAY['admin', 'organization'], company_id)
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.company_id = ertesitesi_szabaly.company_id
        AND (
          cm.role IN ('owner', 'admin')
          OR cm.docs_szerepkor::text IN ('admin', 'rendszergazda')
          OR cm.hr_szerepkor::text IN ('admin', 'rendszergazda')
        )
    )
  );


-- =============================================================================
-- 3. [D3] hr_kpi_katalogus — Központi sablon (NULL) + vállalati saját KPI-k
-- =============================================================================

ALTER TABLE public.hr_kpi_katalogus
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hr_kpi_katalogus_company_id
  ON public.hr_kpi_katalogus(company_id);

DROP POLICY IF EXISTS "Minden belépett olvashatja a KPI katalógust" ON public.hr_kpi_katalogus;
DROP POLICY IF EXISTS "HR és Admin írhatja a KPI katalógust" ON public.hr_kpi_katalogus;
DROP POLICY IF EXISTS "hr_kpi_katalogus_select" ON public.hr_kpi_katalogus;
DROP POLICY IF EXISTS "hr_kpi_katalogus_write" ON public.hr_kpi_katalogus;

CREATE POLICY "hr_kpi_katalogus_select" ON public.hr_kpi_katalogus
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    OR public.user_has_company_access(company_id)
  );

CREATE POLICY "hr_kpi_katalogus_write" ON public.hr_kpi_katalogus
  FOR ALL
  TO authenticated
  USING (
    company_id IS NOT NULL
    AND public.user_has_company_access(company_id)
    AND public.has_hr_module_access(ARRAY['admin', 'organization', 'performance'], company_id)
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND public.user_has_company_access(company_id)
    AND public.has_hr_module_access(ARRAY['admin', 'organization', 'performance'], company_id)
  );


-- =============================================================================
-- 4. [P2/A] hr_esemeny_naplo INSERT policy szűkítés
-- =============================================================================

DROP POLICY IF EXISTS "Eseménynapló rögzítés" ON public.hr_esemeny_naplo;

CREATE POLICY "Eseménynapló rögzítés" ON public.hr_esemeny_naplo
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (felhasznalo_id IS NULL OR felhasznalo_id = auth.uid())
    AND (company_id IS NULL OR public.user_has_company_access(company_id))
  );


-- =============================================================================
-- 5. [P2/B] Többvállalatos UNIQUE constraint javítások (cafeteria keret, bérpapír)
-- =============================================================================

ALTER TABLE public.hr_cafeteria_keret
  DROP CONSTRAINT IF EXISTS hr_cafeteria_keret_dolgozo_id_ev_key;

ALTER TABLE public.hr_cafeteria_keret
  DROP CONSTRAINT IF EXISTS hr_cafeteria_keret_company_dolgozo_ev_key;

ALTER TABLE public.hr_cafeteria_keret
  ADD CONSTRAINT hr_cafeteria_keret_company_dolgozo_ev_key
  UNIQUE (company_id, dolgozo_id, ev);

ALTER TABLE public.hr_berpapir
  DROP CONSTRAINT IF EXISTS hr_berpapir_dolgozo_ev_honap_key;

ALTER TABLE public.hr_berpapir
  DROP CONSTRAINT IF EXISTS hr_berpapir_company_dolgozo_ev_honap_key;

ALTER TABLE public.hr_berpapir
  ADD CONSTRAINT hr_berpapir_company_dolgozo_ev_honap_key
  UNIQUE (company_id, dolgozo_id, ev, honap);


-- =============================================================================
-- 6. [P2/C] admin_update_user_profile — EXISTS-szimmetria javítás
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id uuid,
  new_role user_szerepkor,
  new_minosites irat_minosites,
  new_department_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_global_sysadmin boolean := false;
  v_has_shared_admin_company boolean := false;
  v_target_company_count integer := 0;
  v_dept_company_id uuid := null;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Nincs bejelentkezve!';
  END IF;

  IF target_user_id = v_caller_id AND new_role::text NOT IN ('rendszergazda', 'admin') THEN
    RAISE EXCEPTION 'Saját adminisztrátori jogosultságodat nem csökkentheted a rendszerből való kizáródás megelőzése érdekében!';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.felhasznalo_profil fp
    WHERE fp.id = v_caller_id
      AND (
        fp.szerepkor::text = 'rendszergazda'
        OR fp.docs_szerepkor::text = 'rendszergazda'
      )
  ) INTO v_is_global_sysadmin;

  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm_caller
    JOIN public.company_members cm_target
      ON cm_target.company_id = cm_caller.company_id
    WHERE cm_caller.user_id = v_caller_id
      AND cm_target.user_id = target_user_id
      AND (
        cm_caller.role IN ('owner', 'admin')
        OR cm_caller.docs_szerepkor::text IN ('admin', 'rendszergazda')
        OR cm_caller.hr_szerepkor::text IN ('admin', 'rendszergazda')
        OR public.has_hr_module_access(ARRAY['admin'], cm_caller.company_id)
      )
  ) INTO v_has_shared_admin_company;

  IF NOT v_has_shared_admin_company AND NOT v_is_global_sysadmin THEN
    RAISE EXCEPTION 'Csak az adott vállalat rendszergazdája módosíthatja a vállalathoz tartozó felhasználó jogosultságait!';
  END IF;

  IF new_department_id IS NOT NULL THEN
    SELECT se.company_id
    INTO v_dept_company_id
    FROM public.szervezeti_egyseg se
    WHERE se.id = new_department_id;

    IF v_dept_company_id IS NOT NULL AND NOT public.user_has_company_access(v_dept_company_id) AND NOT v_is_global_sysadmin THEN
      RAISE EXCEPTION 'A megadott szervezeti egység egy másik vállalathoz tartozik!';
    END IF;
  END IF;

  UPDATE public.company_members cm_target
  SET docs_szerepkor = new_role::text
  WHERE cm_target.user_id = target_user_id
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm_caller
      WHERE cm_caller.company_id = cm_target.company_id
        AND cm_caller.user_id = v_caller_id
        AND (
          cm_caller.role IN ('owner', 'admin')
          OR cm_caller.docs_szerepkor::text IN ('admin', 'rendszergazda')
          OR cm_caller.hr_szerepkor::text IN ('admin', 'rendszergazda')
          OR public.has_hr_module_access(ARRAY['admin'], cm_caller.company_id)
          OR v_is_global_sysadmin
        )
    );

  SELECT COUNT(*)
  INTO v_target_company_count
  FROM public.company_members cm
  WHERE cm.user_id = target_user_id;

  IF v_target_company_count <= 1 OR v_is_global_sysadmin THEN
    UPDATE public.felhasznalo_profil
    SET
      szerepkor = new_role,
      docs_szerepkor = new_role::text::docs_szerepkor_enum,
      max_minosites = new_minosites,
      szervezeti_egyseg_id = new_department_id
    WHERE id = target_user_id;
  ELSE
    UPDATE public.felhasznalo_profil
    SET
      max_minosites = new_minosites,
      szervezeti_egyseg_id = COALESCE(new_department_id, szervezeti_egyseg_id)
    WHERE id = target_user_id;
  END IF;
END;
$function$;

COMMIT;


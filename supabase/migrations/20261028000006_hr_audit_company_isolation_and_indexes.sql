-- 20261028000006_hr_audit_company_isolation_and_indexes.sql
-- [HR] Eseménynapló (hr_esemeny_naplo) és Kiküldési Napló (ertesites_naplo) szigorú company_id izoláció, backfill és BEFORE INSERT triggerek

-- 1. hr_esemeny_naplo meglévő company_id IS NULL rekordok visszamenőleges feloldása (backfill)
UPDATE public.hr_esemeny_naplo n
SET company_id = cm.company_id
FROM public.company_members cm
WHERE n.company_id IS NULL
  AND n.felhasznalo_id = cm.user_id;

DO $$
DECLARE
  v_default_company_id UUID;
BEGIN
  SELECT id INTO v_default_company_id
  FROM public.companies
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_default_company_id IS NOT NULL THEN
    UPDATE public.hr_esemeny_naplo
    SET company_id = v_default_company_id
    WHERE company_id IS NULL;
  END IF;
END $$;

-- 2. ertesites_naplo meglévő company_id IS NULL rekordok visszamenőleges feloldása (backfill)
-- 2.a: Ügyirat alapján
UPDATE public.ertesites_naplo n
SET company_id = u.company_id
FROM public.ugyirat u
WHERE n.company_id IS NULL
  AND n.ugyirat_id = u.id
  AND u.company_id IS NOT NULL;

-- 2.b: Kiváltó felhasználó cégtagsága alapján
UPDATE public.ertesites_naplo n
SET company_id = cm.company_id
FROM public.company_members cm
WHERE n.company_id IS NULL
  AND n.kivato_user_id = cm.user_id;

-- 2.c: Toborzási jelölt e-mail címe alapján (HR értesítéseknél)
UPDATE public.ertesites_naplo n
SET company_id = t.company_id
FROM public.hr_toborzas t
WHERE n.company_id IS NULL
  AND n.cimzett_email IS NOT NULL
  AND lower(n.cimzett_email) = lower(t.email)
  AND t.company_id IS NOT NULL;

-- 2.d: Alapértelmezett cég fallback
DO $$
DECLARE
  v_default_company_id UUID;
BEGIN
  SELECT id INTO v_default_company_id
  FROM public.companies
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_default_company_id IS NOT NULL THEN
    UPDATE public.ertesites_naplo
    SET company_id = v_default_company_id
    WHERE company_id IS NULL;
  END IF;
END $$;

-- 3. Megerősített BEFORE INSERT trigger a hr_esemeny_naplo táblán
CREATE OR REPLACE FUNCTION public.set_hr_esemeny_naplo_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NEW.company_id IS NULL THEN
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

DROP TRIGGER IF EXISTS trg_hr_esemeny_naplo_company_id ON public.hr_esemeny_naplo;
CREATE TRIGGER trg_hr_esemeny_naplo_company_id
BEFORE INSERT ON public.hr_esemeny_naplo
FOR EACH ROW
EXECUTE FUNCTION public.set_hr_esemeny_naplo_company_id();

-- 4. BEFORE INSERT trigger az ertesites_naplo táblán a kötelező company_id garantálására
CREATE OR REPLACE FUNCTION public.set_ertesites_naplo_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NEW.company_id IS NULL THEN
    -- 1) Ügyirat alapján
    IF NEW.ugyirat_id IS NOT NULL THEN
      SELECT u.company_id INTO NEW.company_id
      FROM public.ugyirat u
      WHERE u.id = NEW.ugyirat_id
      LIMIT 1;
    END IF;

    -- 2) Kiváltó felhasználó vagy bejelentkezett user alapján
    IF NEW.company_id IS NULL THEN
      v_uid := COALESCE(NEW.kivato_user_id, auth.uid());
      IF v_uid IS NOT NULL THEN
        SELECT cm.company_id INTO NEW.company_id
        FROM public.company_members cm
        WHERE cm.user_id = v_uid
        ORDER BY cm.created_at ASC
        LIMIT 1;
      END IF;
    END IF;

    -- 3) Címzett e-mail (toborzási jelölt) alapján
    IF NEW.company_id IS NULL AND NEW.cimzett_email IS NOT NULL THEN
      SELECT t.company_id INTO NEW.company_id
      FROM public.hr_toborzas t
      WHERE lower(t.email) = lower(NEW.cimzett_email)
        AND t.company_id IS NOT NULL
      ORDER BY t.created_at DESC
      LIMIT 1;
    END IF;

    -- 4) Fallback az első aktív cégre
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

DROP TRIGGER IF EXISTS trg_ertesites_naplo_company_id ON public.ertesites_naplo;
CREATE TRIGGER trg_ertesites_naplo_company_id
BEFORE INSERT ON public.ertesites_naplo
FOR EACH ROW
EXECUTE FUNCTION public.set_ertesites_naplo_company_id();

-- 5. Indexek a szerveroldali lapozáshoz és szűréshez
CREATE INDEX IF NOT EXISTS idx_hr_esemeny_naplo_company_created_at
  ON public.hr_esemeny_naplo (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hr_esemeny_naplo_company_entitas
  ON public.hr_esemeny_naplo (company_id, entitas_tipus, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ertesites_naplo_modul_company_mikor
  ON public.ertesites_naplo (modul, company_id, mikor DESC);

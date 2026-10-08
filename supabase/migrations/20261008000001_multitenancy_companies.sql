-- ============================================================================
-- EAISYDOCS & EAISYHR MULTI-TENANCY SÉMAMIGRÁCIÓ (VISIBILL MINTÁRA)
-- ============================================================================
-- Létrehozza a companies, company_members és user_company_access_cache táblákat,
-- hozzáadja a company_id mezőt az összes alaptáblához,
-- létrehozza az alapértelmezett céget ("Think AI Kft."), és minden meglévő
-- rekordot hozzárendel, valamint beállítja a felhasználói tagságokat.
-- ============================================================================

BEGIN;

-- 1. COMPANIES TÖRZSTÁBLA
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_number text,
  address text,
  representative_name text,
  phone text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  country_code text NOT NULL DEFAULT 'HU',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexek a cégekhez
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_tax_number ON public.companies(tax_number);
CREATE INDEX IF NOT EXISTS idx_companies_share_token ON public.companies(share_token);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. COMPANY_MEMBERS KAPCSOLÓTÁBLA
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  docs_szerepkor text, -- Opcionális cég-specifikus felülbírálás
  hr_szerepkor text,   -- Opcionális cég-specifikus felülbírálás
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- 3. USER_COMPANY_ACCESS_CACHE (GYORSÍTÓTÁR AZ RLS-HEZ)
CREATE TABLE IF NOT EXISTS public.user_company_access_cache (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_access_cache_user ON public.user_company_access_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_access_cache_company ON public.user_company_access_cache(company_id);

ALTER TABLE public.user_company_access_cache ENABLE ROW LEVEL SECURITY;

-- 4. GYORSÍTÓTÁR SZINKRONIZÁLÓ TRIGGER ÉS FÜGGVÉNYEK
CREATE OR REPLACE FUNCTION public.sync_company_member_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.user_company_access_cache (user_id, company_id, role, updated_at)
    VALUES (NEW.user_id, NEW.company_id, NEW.role, now())
    ON CONFLICT (user_id, company_id)
    DO UPDATE SET role = EXCLUDED.role, updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_company_access_cache
    WHERE user_id = OLD.user_id AND company_id = OLD.company_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_member_cache ON public.company_members;
CREATE TRIGGER trg_sync_company_member_cache
AFTER INSERT OR UPDATE OR DELETE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_member_cache();

-- Cég létrehozásakor az owner automatikusan tag lesz
CREATE OR REPLACE FUNCTION public.on_company_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_company_created ON public.companies;
CREATE TRIGGER trg_on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.on_company_created();

-- Segédfüggvény RLS ellenőrzéshez (STABLE, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_access_cache
    WHERE user_id = (SELECT auth.uid())
      AND company_id = p_company_id
  );
$$;

-- RLS Házirendek a Companies és Company_members táblákra
DROP POLICY IF EXISTS "Members can view companies" ON public.companies;
CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR id IN (SELECT company_id FROM public.user_company_access_cache WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Owners and admins can update companies" ON public.companies;
CREATE POLICY "Owners and admins can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR id IN (
      SELECT company_id FROM public.user_company_access_cache 
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Members can view their own memberships" ON public.company_members;
CREATE POLICY "Members can view their own memberships"
  ON public.company_members FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR company_id IN (
      SELECT company_id FROM public.user_company_access_cache 
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage company members" ON public.company_members;
CREATE POLICY "Admins can manage company members"
  ON public.company_members FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_company_access_cache 
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can read access cache" ON public.user_company_access_cache;
CREATE POLICY "Users can read access cache"
  ON public.user_company_access_cache FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 5. ALAPÉRTELMEZETT CÉG ÉS TULAJDONOS BEÁLLÍTÁSA
DO $$
DECLARE
  v_default_company_id uuid;
  v_admin_id uuid;
  u RECORD;
BEGIN
  -- Keresünk egy admin felhasználót
  SELECT id INTO v_admin_id 
  FROM public.felhasznalo_profil 
  WHERE docs_szerepkor = 'admin' OR hr_szerepkor = 'admin' OR szerepkor = 'admin' 
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  -- Ha nincs profil, keressünk az auth.users-ben
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  END IF;

  -- Alapértelmezett cég létrehozása, ha még nem létezik
  SELECT id INTO v_default_company_id FROM public.companies WHERE name = 'Think AI Kft.' LIMIT 1;

  IF v_default_company_id IS NULL THEN
    INSERT INTO public.companies (id, name, tax_number, address, representative_name, owner_id)
    VALUES (
      gen_random_uuid(),
      'Think AI Kft.',
      '12345678-2-41',
      '1054 Budapest, Szabadság tér 7.',
      'Nagy Dániel',
      v_admin_id
    )
    RETURNING id INTO v_default_company_id;
    RAISE NOTICE 'Alapértelmezett cég létrehozva ID: %', v_default_company_id;
  END IF;

  -- Minden meglévő felhasználót hozzárendelünk az alapértelmezett céghez
  FOR u IN SELECT id FROM public.felhasznalo_profil LOOP
    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (
      v_default_company_id, 
      u.id, 
      CASE WHEN u.id = v_admin_id THEN 'owner' ELSE 'member' END
    )
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END LOOP;

  -- Szinkronizálás a cache táblába
  INSERT INTO public.user_company_access_cache (user_id, company_id, role)
  SELECT user_id, company_id, role FROM public.company_members
  ON CONFLICT (user_id, company_id) DO NOTHING;

END;
$$;

-- 6. COMPANY_ID OSZLOPOK ÉS INDEXEK HOZZÁADÁSA AZ ALAPTÁBLÁKHOZ
DO $$
DECLARE
  v_company_id uuid;
  t text;
  v_tables text[] := ARRAY[
    -- eaisyDocs táblák
    'ugy',
    'ugyirat',
    'irat',
    'partner',
    'irattari_terv',
    'iktatoszam_allokacio',
    'irat_fizikai_hely',
    'selejtezes_csomag',
    'feladat',
    'mentett_kereses',
    'esemeny_naplo',
    -- eaisyHR táblák
    'hr_dolgozo_adatlap',
    'hr_dolgozo_titkos_adat',
    'hr_szervezeti_egyseg',
    'hr_munkakor',
    'hr_jelenlet',
    'hr_jelenlet_korrekcio',
    'hr_havi_jelenlet_zaras',
    'hr_tavollet',
    'hr_tulora_egyenleg',
    'hr_allashirdetes',
    'hr_toborzas',
    'hr_onboarding',
    'hr_onboarding_feladat',
    'hr_offboarding',
    'hr_offboarding_feladat',
    'hr_cafeteria_keret',
    'hr_cafeteria_valasztas',
    'hr_teljesitmeny_ciklus',
    'hr_teljesitmeny',
    'hr_munkahelyi_eszkoz',
    'hr_munkavedelmi_oktatas',
    'hr_munkaszerzodes',
    'hr_bevallas_archivum',
    'hr_esemeny_naplo'
  ];
BEGIN
  -- Alapértelmezett cég azonosítója
  SELECT id INTO v_company_id FROM public.companies WHERE name = 'Think AI Kft.' LIMIT 1;

  FOREACH t IN ARRAY v_tables LOOP
    -- Csak akkor hajtjuk végre, ha a tábla létezik az adatbázisban
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      
      -- Oszlop hozzáadása ha még nincs
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;', t);
      
      -- Meglévő rekordok feltöltése
      EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL;', t, v_company_id);
      
      -- Default érték beállítása a zökkenőmentes kompatibilitáshoz
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET DEFAULT %L;', t, v_company_id);
      
      -- Index létrehozása a villámgyors szűréshez
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id);', 'idx_' || t || '_company_id', t);
      
      RAISE NOTICE 'Tábla felkészítve többcég-kezelésre: %', t;
    END IF;
  END LOOP;
END;
$$;

-- 7. CSATLAKOZÁS MEGHÍVÓ KÓDDAL (RPC FÜGGVÉNY)
CREATE OR REPLACE FUNCTION public.join_company_by_token(p_share_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nincs aktív bejelentkezett munkamenet.');
  END IF;

  SELECT id, name INTO v_company_id, v_company_name
  FROM public.companies
  WHERE share_token = trim(p_share_token);

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Érvénytelen vagy nem létező meghívókód.');
  END IF;

  -- Hozzáadás a members-hez
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'member')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN json_build_object(
    'success', true, 
    'company_id', v_company_id, 
    'company_name', v_company_name
  );
END;
$$;

COMMIT;

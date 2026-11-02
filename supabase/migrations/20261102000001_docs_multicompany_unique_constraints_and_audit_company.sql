-- ============================================================================
-- Migration: 20261102000001_docs_multicompany_unique_constraints_and_audit_company.sql
-- Description:
--   1. Convert global UNIQUE constraints on irattari_terv(tetelszam), ugy(ugyszam),
--      ugyirat(iktatoszam), and idx_partner_clean_adoszam to company-scoped
--      UNIQUE (company_id, ...) constraints/indexes.
--   2. Drop hardcoded company_id DEFAULT on esemeny_naplo, add BEFORE INSERT
--      trigger resolve_esemeny_naplo_company_id() to resolve company_id from
--      the target entity (irat, ugyirat, ugy, partner, feladat, etc.), update
--      log_audit_event(), and backfill existing esemeny_naplo rows.
--   3. Add optional p_company_id UUID DEFAULT NULL filter to search_iratok_hybrid
--      and fix cascade_ugyirat_fts_update() trigger function invocation.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MULTI-COMPANY UNIQUE CONSTRAINTS (irattari_terv, ugy, ugyirat, partner)
-- ============================================================================

-- 1a. irattari_terv: UNIQUE (company_id, tetelszam)
ALTER TABLE public.irattari_terv DROP CONSTRAINT IF EXISTS irattari_terv_tetelszam_key;
ALTER TABLE public.irattari_terv DROP CONSTRAINT IF EXISTS irattari_terv_company_tetelszam_key;
ALTER TABLE public.irattari_terv
  ADD CONSTRAINT irattari_terv_company_tetelszam_key UNIQUE (company_id, tetelszam);

-- 1b. ugy: UNIQUE (company_id, ugyszam)
ALTER TABLE public.ugy DROP CONSTRAINT IF EXISTS ugy_ugyszam_key;
ALTER TABLE public.ugy DROP CONSTRAINT IF EXISTS ugy_company_ugyszam_key;
ALTER TABLE public.ugy
  ADD CONSTRAINT ugy_company_ugyszam_key UNIQUE (company_id, ugyszam);

-- 1c. ugyirat: UNIQUE (company_id, iktatoszam)
ALTER TABLE public.ugyirat DROP CONSTRAINT IF EXISTS ugyirat_iktatoszam_key;
ALTER TABLE public.ugyirat DROP CONSTRAINT IF EXISTS ugyirat_company_iktatoszam_key;
ALTER TABLE public.ugyirat
  ADD CONSTRAINT ugyirat_company_iktatoszam_key UNIQUE (company_id, iktatoszam);

-- 1d. partner: company-scoped clean tax number unique index
DROP INDEX IF EXISTS public.idx_partner_clean_adoszam;

CREATE UNIQUE INDEX idx_partner_clean_adoszam
  ON public.partner (company_id, regexp_replace(adoszam, '[-\s]', '', 'g'))
  WHERE adoszam IS NOT NULL AND TRIM(adoszam) <> '';


-- ============================================================================
-- 2. ESEMENY_NAPLO COMPANY_ID RESOLUTION TRIGGER & BACKFILL
-- ============================================================================

-- Drop the static default company_id on esemeny_naplo so omitted company_id
-- arrives as NULL and is resolved dynamically from the target entity.
ALTER TABLE public.esemeny_naplo ALTER COLUMN company_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.resolve_esemeny_naplo_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_company_id UUID := NULL;
BEGIN
  -- 1. Resolve from target entity whenever entitas_id is provided
  IF NEW.entitas_id IS NOT NULL THEN
    IF NEW.entitas_tipus = 'ugyirat' THEN
      SELECT u.company_id INTO v_entity_company_id
      FROM public.ugyirat u
      WHERE u.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'irat' THEN
      SELECT COALESCE(i.company_id, u.company_id) INTO v_entity_company_id
      FROM public.irat i
      LEFT JOIN public.ugyirat u ON u.id = i.ugyirat_id
      WHERE i.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'ugy' THEN
      SELECT ug.company_id INTO v_entity_company_id
      FROM public.ugy ug
      WHERE ug.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'partner' THEN
      SELECT p.company_id INTO v_entity_company_id
      FROM public.partner p
      WHERE p.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'feladat' THEN
      SELECT COALESCE(f.company_id, u.company_id) INTO v_entity_company_id
      FROM public.feladat f
      LEFT JOIN public.ugyirat u ON u.id = f.ugyirat_id
      WHERE f.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'selejtezes_csomag' THEN
      SELECT sc.company_id INTO v_entity_company_id
      FROM public.selejtezes_csomag sc
      WHERE sc.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'irattari_terv' THEN
      SELECT it.company_id INTO v_entity_company_id
      FROM public.irattari_terv it
      WHERE it.id = NEW.entitas_id;
    ELSIF NEW.entitas_tipus = 'szervezeti_egyseg' THEN
      SELECT se.company_id INTO v_entity_company_id
      FROM public.szervezeti_egyseg se
      WHERE se.id = NEW.entitas_id;
    END IF;
  END IF;

  IF v_entity_company_id IS NOT NULL THEN
    NEW.company_id := v_entity_company_id;
  END IF;

  -- 2. If still NULL, try to extract from uj_ertek / elozo_ertek JSONB
  IF NEW.company_id IS NULL AND NEW.uj_ertek IS NOT NULL AND (NEW.uj_ertek ? 'company_id') THEN
    BEGIN
      NEW.company_id := (NEW.uj_ertek->>'company_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF NEW.company_id IS NULL AND NEW.elozo_ertek IS NOT NULL AND (NEW.elozo_ertek ? 'company_id') THEN
    BEGIN
      NEW.company_id := (NEW.elozo_ertek->>'company_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 3. Fallback to user's primary company membership or first company
  IF NEW.company_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT cm.company_id INTO NEW.company_id
    FROM public.company_members cm
    WHERE cm.user_id = NEW.user_id
    ORDER BY cm.created_at ASC
    LIMIT 1;
  END IF;

  IF NEW.company_id IS NULL THEN
    SELECT c.id INTO NEW.company_id
    FROM public.companies c
    ORDER BY c.created_at ASC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_esemeny_naplo_company_id ON public.esemeny_naplo;
CREATE TRIGGER trg_esemeny_naplo_company_id
BEFORE INSERT ON public.esemeny_naplo
FOR EACH ROW
EXECUTE FUNCTION public.resolve_esemeny_naplo_company_id();

-- Update log_audit_event() to explicitly pass company_id from NEW / OLD
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_esemeny_tipus esemeny_tipus;
    v_entitas_tipus TEXT;
    v_entitas_id UUID;
    v_company_id UUID := NULL;
    v_elozo JSONB := NULL;
    v_uj JSONB := NULL;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    END IF;

    v_entitas_tipus := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        v_entitas_id := NEW.id;
        v_uj := to_jsonb(NEW);
        
        IF TG_TABLE_NAME = 'irat' THEN
            v_esemeny_tipus := 'erkeztetve';
        ELSIF TG_TABLE_NAME = 'ugyirat' THEN
            v_esemeny_tipus := 'iktatva';
        ELSE
            v_esemeny_tipus := 'modositva';
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_entitas_id := NEW.id;
        v_elozo := to_jsonb(OLD);
        v_uj := to_jsonb(NEW);
        
        IF TG_TABLE_NAME = 'ugyirat' AND (v_elozo->>'statusz') IS DISTINCT FROM (v_uj->>'statusz') THEN
            IF (v_uj->>'statusz') = 'szignalt' THEN 
                RETURN NEW;
            ELSIF (v_uj->>'statusz') = 'lezart' THEN 
                RETURN NEW;
            ELSIF (v_uj->>'statusz') = 'elintezett' THEN 
                v_esemeny_tipus := 'elintezve';
            ELSIF (v_uj->>'statusz') = 'irattarban' THEN 
                v_esemeny_tipus := 'irattarozva';
            ELSIF (v_uj->>'statusz') = 'selejtezheto' THEN 
                v_esemeny_tipus := 'modositva';
            ELSE 
                v_esemeny_tipus := 'modositva';
            END IF;
        ELSIF TG_TABLE_NAME = 'ugy' AND (v_elozo->>'statusz') IS DISTINCT FROM (v_uj->>'statusz') THEN
            IF (v_uj->>'statusz') = 'lezart' THEN 
                RETURN NEW;
            ELSIF (v_uj->>'statusz') = 'irattarozott' THEN 
                v_esemeny_tipus := 'irattarozva';
            ELSIF (v_uj->>'statusz') = 'selejtezett' THEN 
                v_esemeny_tipus := 'selejtezve';
            ELSE 
                v_esemeny_tipus := 'modositva';
            END IF;
        ELSE
            v_esemeny_tipus := 'modositva';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_entitas_id := OLD.id;
        v_elozo := to_jsonb(OLD);
        v_esemeny_tipus := 'modositva';
    END IF;

    IF v_uj IS NOT NULL AND (v_uj ? 'company_id') AND (v_uj->>'company_id') IS NOT NULL THEN
        BEGIN
            v_company_id := (v_uj->>'company_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
    ELSIF v_elozo IS NOT NULL AND (v_elozo ? 'company_id') AND (v_elozo->>'company_id') IS NOT NULL THEN
        BEGIN
            v_company_id := (v_elozo->>'company_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
    END IF;

    IF v_user_email IS NOT NULL THEN
        IF v_uj IS NULL THEN
            v_uj := jsonb_build_object('user_email', v_user_email);
        ELSE
            v_uj := jsonb_set(v_uj, '{user_email}', to_jsonb(v_user_email));
        END IF;
    END IF;

    INSERT INTO public.esemeny_naplo (
        entitas_tipus,
        entitas_id,
        company_id,
        esemeny_tipus,
        user_id,
        elozo_ertek,
        uj_ertek
    ) VALUES (
        v_entitas_tipus,
        v_entitas_id,
        v_company_id,
        v_esemeny_tipus,
        v_user_id,
        v_elozo,
        v_uj
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Backfill existing esemeny_naplo rows whose company_id differs from their target entity
UPDATE public.esemeny_naplo en
SET company_id = u.company_id
FROM public.ugyirat u
WHERE en.entitas_tipus = 'ugyirat'
  AND en.entitas_id = u.id
  AND u.company_id IS NOT NULL
  AND en.company_id IS DISTINCT FROM u.company_id;

UPDATE public.esemeny_naplo en
SET company_id = COALESCE(i.company_id, u.company_id)
FROM public.irat i
LEFT JOIN public.ugyirat u ON u.id = i.ugyirat_id
WHERE en.entitas_tipus = 'irat'
  AND en.entitas_id = i.id
  AND COALESCE(i.company_id, u.company_id) IS NOT NULL
  AND en.company_id IS DISTINCT FROM COALESCE(i.company_id, u.company_id);

UPDATE public.esemeny_naplo en
SET company_id = ug.company_id
FROM public.ugy ug
WHERE en.entitas_tipus = 'ugy'
  AND en.entitas_id = ug.id
  AND ug.company_id IS NOT NULL
  AND en.company_id IS DISTINCT FROM ug.company_id;

UPDATE public.esemeny_naplo en
SET company_id = p.company_id
FROM public.partner p
WHERE en.entitas_tipus = 'partner'
  AND en.entitas_id = p.id
  AND p.company_id IS NOT NULL
  AND en.company_id IS DISTINCT FROM p.company_id;


-- ============================================================================
-- 3. FIX cascade_ugyirat_fts_update() & UPDATE search_iratok_hybrid WITH p_company_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cascade_ugyirat_fts_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Touch irat rows belonging to this ugyirat so fts_irat_trigger recomputes kereso_vektor
    UPDATE public.irat
    SET targy = targy
    WHERE ugyirat_id = NEW.id;
    RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.search_iratok_hybrid(TEXT, vector(768), TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, FLOAT);

CREATE OR REPLACE FUNCTION public.search_iratok_hybrid(
    p_query TEXT DEFAULT NULL,
    p_embedding vector(768) DEFAULT NULL,
    p_minosites TEXT DEFAULT NULL,
    p_irany TEXT DEFAULT NULL,
    p_iktatoszam TEXT DEFAULT NULL,
    p_erkeztetoszam TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_partner TEXT DEFAULT NULL,
    p_match_count INT DEFAULT 50,
    p_similarity_threshold FLOAT DEFAULT 0.65,
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    targy TEXT,
    leiras TEXT,
    erkeztetoszam TEXT,
    irany irat_irany,
    minosites irat_minosites,
    erkezes_datuma TIMESTAMPTZ,
    ugyirat_id UUID,
    iktatoszam TEXT,
    ugy_id UUID,
    ugy_targy TEXT,
    felelos_user_id UUID,
    partner_id UUID,
    partner_nev TEXT,
    fts_score REAL,
    vector_similarity FLOAT,
    combined_score FLOAT,
    match_type TEXT,
    snippet TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_clean_query TEXT := NULL;
    v_unaccent_query TEXT := NULL;
    v_tsquery_hu tsquery := NULL;
    v_tsquery_hu_unaccent tsquery := NULL;
    v_tsquery_simple tsquery := NULL;
    v_tsquery_full tsquery := NULL;
BEGIN
    IF p_query IS NOT NULL AND trim(p_query) <> '' THEN
        v_clean_query := trim(p_query);
        v_unaccent_query := unaccent(v_clean_query);

        v_tsquery_hu := plainto_tsquery('hungarian', v_clean_query);
        v_tsquery_hu_unaccent := plainto_tsquery('hungarian', v_unaccent_query);
        v_tsquery_simple := plainto_tsquery('simple', v_unaccent_query);

        IF v_tsquery_hu IS NOT NULL AND v_tsquery_hu_unaccent IS NOT NULL THEN
            v_tsquery_full := (v_tsquery_hu || v_tsquery_hu_unaccent);
        ELSE
            v_tsquery_full := COALESCE(v_tsquery_hu, v_tsquery_hu_unaccent, v_tsquery_simple);
        END IF;
    END IF;

    RETURN QUERY
    WITH filtered_base AS (
        SELECT 
            i.id,
            i.targy,
            i.leiras,
            i.erkeztetoszam,
            i.irany,
            i.minosites,
            i.erkezes_datuma,
            i.ugyirat_id,
            i.kereso_vektor,
            i.embedding,
            u.iktatoszam,
            ug.id AS ugy_id,
            ug.targy AS ugy_targy,
            ug.felelos_user_id,
            p.id AS partner_id,
            p.nev AS partner_nev,
            (
                SELECT string_agg(COALESCE(f.ocr_szoveg, ''), ' ')
                FROM irat_fajl f
                WHERE f.irat_id = i.id
            ) AS full_ocr_text
        FROM public.irat i
        LEFT JOIN public.ugyirat u ON u.id = i.ugyirat_id
        LEFT JOIN public.ugy ug ON ug.id = u.ugy_id
        LEFT JOIN public.partner p ON p.id = i.kuldo_partner_id
        WHERE 
            (p_company_id IS NULL OR i.company_id = p_company_id)
            AND (p_minosites IS NULL OR p_minosites = 'all' OR i.minosites::text = p_minosites)
            AND (p_irany IS NULL OR p_irany = 'all' OR i.irany::text = p_irany)
            AND (p_erkeztetoszam IS NULL OR i.erkeztetoszam ILIKE '%' || p_erkeztetoszam || '%')
            AND (p_iktatoszam IS NULL OR u.iktatoszam ILIKE '%' || p_iktatoszam || '%')
            AND (p_date_from IS NULL OR i.erkezes_datuma >= p_date_from)
            AND (p_date_to IS NULL OR i.erkezes_datuma <= p_date_to)
            AND (p_partner IS NULL OR p.nev ILIKE '%' || p_partner || '%')
    ),
    scored AS (
        SELECT 
            fb.*,
            CASE 
                WHEN v_clean_query IS NOT NULL THEN
                    GREATEST(
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_hu), 0.0),
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_hu_unaccent), 0.0),
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_simple), 0.0)
                    )
                ELSE 0.0
            END AS calc_fts_score,
            CASE 
                WHEN p_embedding IS NOT NULL AND fb.embedding IS NOT NULL THEN
                    1.0 - (fb.embedding <=> p_embedding)
                ELSE 0.0
            END AS calc_vector_sim,
            CASE
                WHEN v_clean_query IS NOT NULL AND (
                    unaccent(coalesce(fb.targy, '')) ILIKE '%' || v_unaccent_query || '%' OR
                    unaccent(coalesce(fb.leiras, '')) ILIKE '%' || v_unaccent_query || '%' OR
                    unaccent(coalesce(fb.erkeztetoszam, '')) ILIKE '%' || v_unaccent_query || '%' OR
                    unaccent(coalesce(fb.iktatoszam, '')) ILIKE '%' || v_unaccent_query || '%' OR
                    unaccent(coalesce(fb.partner_nev, '')) ILIKE '%' || v_unaccent_query || '%' OR
                    unaccent(coalesce(fb.ugy_targy, '')) ILIKE '%' || v_unaccent_query || '%'
                ) THEN true
                ELSE false
            END AS is_ilike_match
        FROM filtered_base fb
    ),
    ranked AS (
        SELECT 
            s.*,
            CASE 
                WHEN s.calc_fts_score > 0.01 AND s.calc_vector_sim >= p_similarity_threshold THEN
                    (s.calc_fts_score * 0.5) + (s.calc_vector_sim * 0.5)
                WHEN s.calc_fts_score > 0.01 OR s.is_ilike_match THEN
                    GREATEST(s.calc_fts_score, 0.45)
                WHEN s.calc_vector_sim >= p_similarity_threshold THEN
                    s.calc_vector_sim * 0.75
                WHEN v_clean_query IS NULL AND p_embedding IS NULL THEN
                    1.0
                ELSE 0.0
            END AS final_score,
            CASE 
                WHEN s.calc_fts_score > 0.01 AND s.calc_vector_sim >= p_similarity_threshold THEN 'hybrid'
                WHEN s.calc_fts_score > 0.01 OR s.is_ilike_match THEN 'fts'
                WHEN s.calc_vector_sim >= p_similarity_threshold THEN 'semantic'
                ELSE 'filter'
            END AS detected_match_type
        FROM scored s
    )
    SELECT 
        r.id,
        r.targy,
        r.leiras,
        r.erkeztetoszam,
        r.irany,
        r.minosites,
        r.erkezes_datuma,
        r.ugyirat_id,
        r.iktatoszam,
        r.ugy_id,
        r.ugy_targy,
        r.felelos_user_id,
        r.partner_id,
        r.partner_nev,
        r.calc_fts_score::REAL AS fts_score,
        r.calc_vector_sim::FLOAT AS vector_similarity,
        r.final_score::FLOAT AS combined_score,
        r.detected_match_type AS match_type,
        CASE 
            WHEN v_clean_query IS NOT NULL AND coalesce(r.full_ocr_text, '') <> '' THEN
                ts_headline(
                    'hungarian',
                    r.full_ocr_text,
                    COALESCE(v_tsquery_hu, v_tsquery_hu_unaccent, v_tsquery_simple),
                    'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false'
                )
            WHEN v_clean_query IS NOT NULL AND coalesce(r.leiras, '') <> '' THEN
                ts_headline(
                    'hungarian',
                    r.leiras,
                    COALESCE(v_tsquery_hu, v_tsquery_hu_unaccent, v_tsquery_simple),
                    'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false'
                )
            WHEN v_clean_query IS NOT NULL AND coalesce(r.targy, '') <> '' THEN
                ts_headline(
                    'hungarian',
                    r.targy,
                    COALESCE(v_tsquery_hu, v_tsquery_hu_unaccent, v_tsquery_simple),
                    'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false'
                )
            ELSE NULL
        END AS snippet
    FROM ranked r
    WHERE r.final_score > 0.0
    ORDER BY r.final_score DESC, r.erkezes_datuma DESC
    LIMIT p_match_count;
END;
$$;

COMMIT;

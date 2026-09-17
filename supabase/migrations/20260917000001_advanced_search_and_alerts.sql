-- ============================================================================
-- Migration: 20260917000001_advanced_search_and_alerts.sql
-- Description: Advanced Hybrid Search (FTS + pgvector) and Saved Search Alerts
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Add embedding column and HNSW index to irat
ALTER TABLE public.irat ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS irat_embedding_hnsw_idx 
ON public.irat USING hnsw (embedding vector_cosine_ops);

-- 3. Add notification columns to mentett_kereses
ALTER TABLE public.mentett_kereses 
ADD COLUMN IF NOT EXISTS ertesites_bekapcsolva BOOLEAN DEFAULT false;

ALTER TABLE public.mentett_kereses 
ADD COLUMN IF NOT EXISTS utolso_ertesites_datuma TIMESTAMPTZ DEFAULT NOW();

-- 4. Advanced Full-Text Search Function with Extended Metadata & Dual Stemming
CREATE OR REPLACE FUNCTION public.update_irat_fts_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_irat_id UUID;
    v_targy TEXT;
    v_leiras TEXT;
    v_erkeztetoszam TEXT;
    v_iktatoszam TEXT;
    v_ugy_targy TEXT;
    v_partner_nev TEXT;
    v_partner_adoszam TEXT;
    v_megjegyzesek TEXT;
    v_ocr_szoveg TEXT;
    v_text_a TEXT;
    v_text_b TEXT;
    v_text_c TEXT;
    v_text_d TEXT;
BEGIN
    -- Determine which table caused the trigger and obtain target irat_id
    IF TG_TABLE_NAME = 'irat' THEN
        v_irat_id := NEW.id;
    ELSIF TG_TABLE_NAME = 'irat_fajl' THEN
        v_irat_id := NEW.irat_id;
    ELSIF TG_TABLE_NAME = 'ugyirat' THEN
        -- When ugyirat changes, trigger updates for all child iratok
        -- (handled in a separate batch statement or loop below if called directly)
        v_irat_id := NULL;
    ELSIF TG_TABLE_NAME = 'ugyirat_megjegyzes' THEN
        v_irat_id := NULL;
    END IF;

    -- If a specific irat is targeted:
    IF v_irat_id IS NOT NULL THEN
        -- Gather irat & related details
        SELECT 
            i.targy,
            COALESCE(i.leiras, ''),
            COALESCE(i.erkeztetoszam, ''),
            COALESCE(u.iktatoszam, ''),
            COALESCE(ug.targy, ''),
            COALESCE(p.nev, ''),
            COALESCE(p.adoszam, '')
        INTO 
            v_targy,
            v_leiras,
            v_erkeztetoszam,
            v_iktatoszam,
            v_ugy_targy,
            v_partner_nev,
            v_partner_adoszam
        FROM irat i
        LEFT JOIN ugyirat u ON u.id = i.ugyirat_id
        LEFT JOIN ugy ug ON ug.id = u.ugy_id
        LEFT JOIN partner p ON p.id = i.kuldo_partner_id
        WHERE i.id = v_irat_id;

        -- Gather aggregated OCR / PDF texts
        SELECT string_agg(COALESCE(ocr_szoveg, ''), ' ') INTO v_ocr_szoveg
        FROM irat_fajl
        WHERE irat_id = v_irat_id;

        -- Gather aggregated dossier comments / notes
        SELECT string_agg(COALESCE(szoveg, ''), ' ') INTO v_megjegyzesek
        FROM ugyirat_megjegyzes um
        JOIN irat i ON i.ugyirat_id = um.ugyirat_id
        WHERE i.id = v_irat_id;

        -- Weight A: Target, Registry / Filing Numbers
        v_text_a := concat_ws(' ', v_targy, v_iktatoszam, v_erkeztetoszam);
        -- Weight B: Partner Info, Case Subject, Description
        v_text_b := concat_ws(' ', v_partner_nev, v_partner_adoszam, v_ugy_targy, v_leiras);
        -- Weight C: Notes / Comments
        v_text_c := COALESCE(v_megjegyzesek, '');
        -- Weight D: OCR / PDF text
        v_text_d := COALESCE(v_ocr_szoveg, '');

        -- Compute Dual Vector: Hungarian stemming + Unaccented Simple lexemes
        UPDATE irat
        SET kereso_vektor = 
            setweight(to_tsvector('hungarian', v_text_a) || to_tsvector('simple', unaccent(v_text_a)), 'A') ||
            setweight(to_tsvector('hungarian', v_text_b) || to_tsvector('simple', unaccent(v_text_b)), 'B') ||
            setweight(to_tsvector('hungarian', v_text_c) || to_tsvector('simple', unaccent(v_text_c)), 'C') ||
            setweight(to_tsvector('hungarian', v_text_d) || to_tsvector('simple', unaccent(v_text_d)), 'D')
        WHERE id = v_irat_id;
    END IF;

    RETURN NULL;
END;
$$;

-- Drop old triggers if exist
DROP TRIGGER IF EXISTS fts_irat_trigger ON public.irat;
DROP TRIGGER IF EXISTS fts_irat_fajl_trigger ON public.irat_fajl;

-- Attach triggers
CREATE TRIGGER fts_irat_trigger
AFTER INSERT OR UPDATE OF targy, leiras, erkeztetoszam, ugyirat_id, kuldo_partner_id ON public.irat
FOR EACH ROW EXECUTE FUNCTION public.update_irat_fts_vector();

CREATE TRIGGER fts_irat_fajl_trigger
AFTER INSERT OR UPDATE OF ocr_szoveg, irat_id ON public.irat_fajl
FOR EACH ROW EXECUTE FUNCTION public.update_irat_fts_vector();

-- 5. Cascade FTS update when Ugyirat is updated
CREATE OR REPLACE FUNCTION public.cascade_ugyirat_fts_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.irat WHERE ugyirat_id = NEW.id LOOP
        PERFORM public.update_irat_fts_vector();
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fts_ugyirat_cascade_trigger ON public.ugyirat;
CREATE TRIGGER fts_ugyirat_cascade_trigger
AFTER UPDATE OF iktatoszam, ugy_id ON public.ugyirat
FOR EACH ROW EXECUTE FUNCTION public.cascade_ugyirat_fts_update();

-- 6. Hybrid Search RPC (Postgres FTS + pgvector RRF)
-- CRITICAL: SECURITY INVOKER ensures Row Level Security (RLS) is strictly enforced for the calling user!
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
    p_similarity_threshold FLOAT DEFAULT 0.65
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
    v_tsquery_hu tsquery := NULL;
    v_tsquery_simple tsquery := NULL;
BEGIN
    IF p_query IS NOT NULL AND trim(p_query) <> '' THEN
        v_clean_query := trim(p_query);
        -- Build plain tsqueries for hungarian and simple/unaccent
        v_tsquery_hu := plainto_tsquery('hungarian', v_clean_query);
        v_tsquery_simple := plainto_tsquery('simple', unaccent(v_clean_query));
    END IF;

    RETURN QUERY
    WITH filtered_base AS (
        -- Base set evaluated with caller's RLS policies
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
            (p_minosites IS NULL OR p_minosites = 'all' OR i.minosites::text = p_minosites)
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
            -- FTS rank score
            CASE 
                WHEN v_clean_query IS NOT NULL THEN
                    GREATEST(
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_hu), 0.0),
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_simple), 0.0)
                    )
                ELSE 0.0
            END AS calc_fts_score,
            -- Vector cosine similarity
            CASE 
                WHEN p_embedding IS NOT NULL AND fb.embedding IS NOT NULL THEN
                    1.0 - (fb.embedding <=> p_embedding)
                ELSE 0.0
            END AS calc_vector_sim,
            -- Check direct ILIKE as a safety net
            CASE
                WHEN v_clean_query IS NOT NULL AND (
                    fb.targy ILIKE '%' || v_clean_query || '%' OR
                    fb.leiras ILIKE '%' || v_clean_query || '%' OR
                    fb.erkeztetoszam ILIKE '%' || v_clean_query || '%' OR
                    fb.iktatoszam ILIKE '%' || v_clean_query || '%' OR
                    fb.partner_nev ILIKE '%' || v_clean_query || '%'
                ) THEN true
                ELSE false
            END AS is_ilike_match
        FROM filtered_base fb
    ),
    ranked AS (
        SELECT 
            s.*,
            -- RRF (Reciprocal Rank Fusion) ranking or combined score
            CASE 
                -- Both matched
                WHEN s.calc_fts_score > 0.01 AND s.calc_vector_sim >= p_similarity_threshold THEN
                    (s.calc_fts_score * 0.5) + (s.calc_vector_sim * 0.5)
                -- FTS only
                WHEN s.calc_fts_score > 0.01 OR s.is_ilike_match THEN
                    GREATEST(s.calc_fts_score, 0.45)
                -- Semantic only
                WHEN s.calc_vector_sim >= p_similarity_threshold THEN
                    s.calc_vector_sim * 0.75
                -- No query supplied (just filtering)
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
        -- Generate headline snippet
        CASE 
            WHEN v_clean_query IS NOT NULL AND coalesce(r.full_ocr_text, '') <> '' THEN
                ts_headline(
                    'hungarian',
                    r.full_ocr_text,
                    COALESCE(v_tsquery_hu, v_tsquery_simple),
                    'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false'
                )
            WHEN v_clean_query IS NOT NULL AND coalesce(r.leiras, '') <> '' THEN
                ts_headline(
                    'hungarian',
                    r.leiras,
                    COALESCE(v_tsquery_hu, v_tsquery_simple),
                    'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false'
                )
            ELSE 
                substring(coalesce(r.leiras, r.full_ocr_text, '') from 1 for 180)
        END AS snippet
    FROM ranked r
    WHERE (v_clean_query IS NULL AND p_embedding IS NULL) OR r.final_score > 0.0
    ORDER BY r.final_score DESC, r.erkezes_datuma DESC
    LIMIT p_match_count;
END;
$$;

-- 7. Populate / Re-index existing iratok FTS vector
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.irat LOOP
        -- Trigger update for each irat to populate new dual vector
        UPDATE public.irat 
        SET kereso_vektor = kereso_vektor 
        WHERE id = r.id;
    END LOOP;
END;
$$;

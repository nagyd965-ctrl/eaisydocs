-- ============================================================================
-- Migration: 20260920000005_fix_hungarian_accent_search.sql
-- Description: Ensure 100% accent-insensitive search in Postgres FTS and ILIKE
-- ============================================================================

-- 1. Ensure update_irat_fts_vector() stems both accented and unaccented forms with hungarian dictionary
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
    IF TG_TABLE_NAME = 'irat' THEN
        v_irat_id := NEW.id;
    ELSIF TG_TABLE_NAME = 'irat_fajl' THEN
        v_irat_id := NEW.irat_id;
    ELSIF TG_TABLE_NAME = 'ugyirat' THEN
        v_irat_id := NULL;
    ELSIF TG_TABLE_NAME = 'ugyirat_megjegyzes' THEN
        v_irat_id := NULL;
    END IF;

    IF v_irat_id IS NOT NULL THEN
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

        SELECT string_agg(COALESCE(ocr_szoveg, ''), ' ') INTO v_ocr_szoveg
        FROM irat_fajl
        WHERE irat_id = v_irat_id;

        SELECT string_agg(COALESCE(szoveg, ''), ' ') INTO v_megjegyzesek
        FROM ugyirat_megjegyzes um
        JOIN irat i ON i.ugyirat_id = um.ugyirat_id
        WHERE i.id = v_irat_id;

        v_text_a := concat_ws(' ', v_targy, v_iktatoszam, v_erkeztetoszam);
        v_text_b := concat_ws(' ', v_partner_nev, v_partner_adoszam, v_ugy_targy, v_leiras);
        v_text_c := COALESCE(v_megjegyzesek, '');
        v_text_d := COALESCE(v_ocr_szoveg, '');

        -- Compute Dual Vector: Hungarian original + Hungarian unaccented + Simple unaccented
        UPDATE irat
        SET kereso_vektor = 
            setweight(to_tsvector('hungarian', v_text_a) || to_tsvector('hungarian', unaccent(v_text_a)) || to_tsvector('simple', unaccent(v_text_a)), 'A') ||
            setweight(to_tsvector('hungarian', v_text_b) || to_tsvector('hungarian', unaccent(v_text_b)) || to_tsvector('simple', unaccent(v_text_b)), 'B') ||
            setweight(to_tsvector('hungarian', v_text_c) || to_tsvector('hungarian', unaccent(v_text_c)) || to_tsvector('simple', unaccent(v_text_c)), 'C') ||
            setweight(to_tsvector('hungarian', v_text_d) || to_tsvector('hungarian', unaccent(v_text_d)) || to_tsvector('simple', unaccent(v_text_d)), 'D')
        WHERE id = v_irat_id;
    END IF;

    RETURN NULL;
END;
$$;

-- 2. Update search_iratok_hybrid function with dual stemming and unaccented matching
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
            -- FTS rank score evaluated against all variations
            CASE 
                WHEN v_clean_query IS NOT NULL THEN
                    GREATEST(
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_hu), 0.0),
                        COALESCE(ts_rank_cd(fb.kereso_vektor, v_tsquery_hu_unaccent), 0.0),
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
            -- Unaccent-aware ILIKE match across metadata and subjects
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

-- 3. Re-index all existing documents with dual stemming
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.irat LOOP
        -- Trigger update for each irat
        UPDATE public.irat SET kereso_vektor = kereso_vektor WHERE id = r.id;
    END LOOP;
END;
$$;

-- Create GIN index on irat.kereso_vektor
CREATE INDEX IF NOT EXISTS irat_kereso_vektor_idx ON irat USING GIN (kereso_vektor);

-- Function to update kereso_vektor on irat
CREATE OR REPLACE FUNCTION update_irat_fts_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_irat_id UUID;
    v_targy TEXT;
    v_leiras TEXT;
    v_ocr_szoveg TEXT;
BEGIN
    -- Determine which table caused the trigger and get the irat_id
    IF TG_TABLE_NAME = 'irat' THEN
        v_irat_id := NEW.id;
        v_targy := NEW.targy;
        v_leiras := COALESCE(NEW.leiras, '');
        
        -- Get aggregated ocr_szoveg from irat_fajl
        SELECT string_agg(COALESCE(ocr_szoveg, ''), ' ') INTO v_ocr_szoveg
        FROM irat_fajl
        WHERE irat_id = v_irat_id;
        
    ELSIF TG_TABLE_NAME = 'irat_fajl' THEN
        v_irat_id := NEW.irat_id;
        
        -- Get targy and leiras from irat
        SELECT targy, COALESCE(leiras, '') INTO v_targy, v_leiras
        FROM irat
        WHERE id = v_irat_id;
        
        -- Get aggregated ocr_szoveg from all files for this irat (including the NEW one since it's an AFTER trigger)
        SELECT string_agg(COALESCE(ocr_szoveg, ''), ' ') INTO v_ocr_szoveg
        FROM irat_fajl
        WHERE irat_id = v_irat_id;
    END IF;

    -- Compute and update the vector (using hungarian dictionary)
    UPDATE irat
    SET kereso_vektor = 
        setweight(to_tsvector('hungarian', COALESCE(v_targy, '')), 'A') ||
        setweight(to_tsvector('hungarian', COALESCE(v_leiras, '')), 'B') ||
        setweight(to_tsvector('hungarian', COALESCE(v_ocr_szoveg, '')), 'C')
    WHERE id = v_irat_id;

    RETURN NULL;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS fts_irat_trigger ON irat;
DROP TRIGGER IF EXISTS fts_irat_fajl_trigger ON irat_fajl;

-- Attach AFTER triggers (safe from infinite loop because we only trigger on specific columns for irat)
CREATE TRIGGER fts_irat_trigger
AFTER INSERT OR UPDATE OF targy, leiras ON irat
FOR EACH ROW EXECUTE FUNCTION update_irat_fts_vector();

CREATE TRIGGER fts_irat_fajl_trigger
AFTER INSERT OR UPDATE OF ocr_szoveg ON irat_fajl
FOR EACH ROW EXECUTE FUNCTION update_irat_fts_vector();

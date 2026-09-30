-- Migration: 20260930000001_add_partner_kulfoldi_adoszam.sql
-- MAN-02 / SYS-10 kiegészítés: Magyar adószám és külföldi/EU adóazonosító szétválasztása

-- 1. Külföldi / EU adóazonosító oszlop hozzáadása a partner táblához
ALTER TABLE public.partner 
ADD COLUMN IF NOT EXISTS kulfoldi_adoszam TEXT;

-- 2. Index a külföldi / EU adószám gyors kereséséhez és egyeztetéséhez
CREATE INDEX IF NOT EXISTS idx_partner_clean_kulfoldi_adoszam
ON public.partner (regexp_replace(UPPER(kulfoldi_adoszam), '[-\\s]', '', 'g'))
WHERE kulfoldi_adoszam IS NOT NULL AND TRIM(kulfoldi_adoszam) <> '';

-- 3. Keresővektor trigger frissítése: a külföldi adószám is bekerül az irat keresővektorába (B súllyal)
CREATE OR REPLACE FUNCTION generate_irat_kereso_vektor()
RETURNS TRIGGER AS $$
DECLARE
    v_irat_id UUID;
    v_targy TEXT;
    v_leiras TEXT;
    v_erkeztetoszam TEXT;
    v_iktatoszam TEXT;
    v_ugy_targy TEXT;
    v_partner_nev TEXT;
    v_partner_adoszam TEXT;
    v_partner_kulfoldi_adoszam TEXT;
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
            COALESCE(p.adoszam, ''),
            COALESCE(p.kulfoldi_adoszam, '')
        INTO 
            v_targy,
            v_leiras,
            v_erkeztetoszam,
            v_iktatoszam,
            v_ugy_targy,
            v_partner_nev,
            v_partner_adoszam,
            v_partner_kulfoldi_adoszam
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
        v_text_b := concat_ws(' ', v_partner_nev, v_partner_adoszam, v_partner_kulfoldi_adoszam, v_ugy_targy, v_leiras);
        v_text_c := COALESCE(v_megjegyzesek, '');
        v_text_d := COALESCE(v_ocr_szoveg, '');

        -- Dual Vector: Hungarian original + Hungarian unaccented + Simple unaccented
        UPDATE irat
        SET kereso_vektor = 
            setweight(to_tsvector('hungarian', v_text_a) || to_tsvector('hungarian', unaccent(v_text_a)) || to_tsvector('simple', unaccent(v_text_a)), 'A') ||
            setweight(to_tsvector('hungarian', v_text_b) || to_tsvector('hungarian', unaccent(v_text_b)) || to_tsvector('simple', unaccent(v_text_b)), 'B') ||
            setweight(to_tsvector('hungarian', v_text_c) || to_tsvector('hungarian', unaccent(v_text_c)) || to_tsvector('simple', unaccent(v_text_c)), 'C') ||
            setweight(to_tsvector('hungarian', v_text_d) || to_tsvector('hungarian', unaccent(v_text_d)) || to_tsvector('simple', unaccent(v_text_d)), 'D')
        WHERE id = v_irat_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

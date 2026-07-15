-- Fix Audit Trigger Function to avoid "record OLD has no field statusz"
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_esemeny_tipus esemeny_tipus;
    v_entitas_tipus TEXT;
    v_entitas_id UUID;
    v_elozo JSONB := NULL;
    v_uj JSONB := NULL;
BEGIN
    v_user_id := auth.uid();
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
        
        -- Use JSONB extraction to avoid rigid column checking which fails across different tables
        IF TG_TABLE_NAME = 'ugyirat' AND (v_elozo->>'statusz') IS DISTINCT FROM (v_uj->>'statusz') THEN
            IF (v_uj->>'statusz') = 'szignalt' THEN v_esemeny_tipus := 'szignalva';
            ELSIF (v_uj->>'statusz') = 'elintezett' THEN v_esemeny_tipus := 'elintezve';
            ELSIF (v_uj->>'statusz') = 'lezart' THEN v_esemeny_tipus := 'lezarva';
            ELSIF (v_uj->>'statusz') = 'irattarban' THEN v_esemeny_tipus := 'irattarozva';
            ELSIF (v_uj->>'statusz') = 'selejtezheto' THEN v_esemeny_tipus := 'modositva';
            ELSE v_esemeny_tipus := 'modositva';
            END IF;
        ELSIF TG_TABLE_NAME = 'ugy' AND (v_elozo->>'statusz') IS DISTINCT FROM (v_uj->>'statusz') THEN
            IF (v_uj->>'statusz') = 'lezart' THEN v_esemeny_tipus := 'lezarva';
            ELSIF (v_uj->>'statusz') = 'irattarozott' THEN v_esemeny_tipus := 'irattarozva';
            ELSIF (v_uj->>'statusz') = 'selejtezett' THEN v_esemeny_tipus := 'selejtezve';
            ELSE v_esemeny_tipus := 'modositva';
            END IF;
        ELSE
            v_esemeny_tipus := 'modositva';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_entitas_id := OLD.id;
        v_elozo := to_jsonb(OLD);
        v_esemeny_tipus := 'modositva';
    END IF;

    INSERT INTO esemeny_naplo (
        entitas_tipus,
        entitas_id,
        esemeny_tipus,
        user_id,
        elozo_ertek,
        uj_ertek
    ) VALUES (
        v_entitas_tipus,
        v_entitas_id,
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

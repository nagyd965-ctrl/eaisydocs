-- Audit Trigger Function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- needs to insert into esemeny_naplo even if RLS is strict
AS $$
DECLARE
    v_user_id UUID;
    v_esemeny_tipus esemeny_tipus;
    v_entitas_tipus TEXT;
    v_entitas_id UUID;
    v_elozo JSONB := NULL;
    v_uj JSONB := NULL;
BEGIN
    -- Get current authenticated user ID if available
    v_user_id := auth.uid();
    
    v_entitas_tipus := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        v_entitas_id := NEW.id;
        v_uj := to_jsonb(NEW);
        
        -- Determine event type for INSERT
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
        
        -- Determine event type for UPDATE based on status changes if applicable
        IF TG_TABLE_NAME = 'ugyirat' AND OLD.statusz IS DISTINCT FROM NEW.statusz THEN
            IF NEW.statusz = 'szignalt' THEN v_esemeny_tipus := 'szignalva';
            ELSIF NEW.statusz = 'elintezett' THEN v_esemeny_tipus := 'elintezve';
            ELSIF NEW.statusz = 'lezart' THEN v_esemeny_tipus := 'lezarva';
            ELSIF NEW.statusz = 'irattarban' THEN v_esemeny_tipus := 'irattarozva';
            ELSIF NEW.statusz = 'selejtezheto' THEN v_esemeny_tipus := 'modositva';
            ELSE v_esemeny_tipus := 'modositva';
            END IF;
        ELSIF TG_TABLE_NAME = 'ugy' AND OLD.statusz IS DISTINCT FROM NEW.statusz THEN
            IF NEW.statusz = 'lezart' THEN v_esemeny_tipus := 'lezarva';
            ELSIF NEW.statusz = 'irattarozott' THEN v_esemeny_tipus := 'irattarozva';
            ELSIF NEW.statusz = 'selejtezett' THEN v_esemeny_tipus := 'selejtezve';
            ELSE v_esemeny_tipus := 'modositva';
            END IF;
        ELSE
            v_esemeny_tipus := 'modositva';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_entitas_id := OLD.id;
        v_elozo := to_jsonb(OLD);
        v_esemeny_tipus := 'modositva'; -- We don't have 'torolve' in enum
    END IF;

    -- Insert the audit log entry
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

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS audit_irat_trigger ON irat;
DROP TRIGGER IF EXISTS audit_ugyirat_trigger ON ugyirat;
DROP TRIGGER IF EXISTS audit_ugy_trigger ON ugy;

-- Attach triggers
CREATE TRIGGER audit_irat_trigger
AFTER INSERT OR UPDATE ON irat
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_ugyirat_trigger
AFTER INSERT OR UPDATE ON ugyirat
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_ugy_trigger
AFTER INSERT OR UPDATE ON ugy
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 20260724000002_beosztas_history.sql

-- 1. Add columns to hr_beosztas
ALTER TABLE hr_beosztas
  ADD COLUMN IF NOT EXISTS munkaviszony_tipusa TEXT,
  ADD COLUMN IF NOT EXISTS munkaido_fte NUMERIC,
  ADD COLUMN IF NOT EXISTS munkarend TEXT,
  ADD COLUMN IF NOT EXISTS berkategoria TEXT,
  ADD COLUMN IF NOT EXISTS kozvetlen_vezeto TEXT;

-- 2. Migrate existing data from hr_dolgozo_adatlap to hr_beosztas
-- We assume the latest valid beosztas for the user gets these values
UPDATE hr_beosztas b
SET
  munkaviszony_tipusa = d.munkaviszony_tipusa,
  munkaido_fte = d.munkaido_fte,
  munkarend = d.munkarend,
  berkategoria = d.berkategoria,
  kozvetlen_vezeto = d.kozvetlen_vezeto
FROM hr_jogviszony j
JOIN hr_dolgozo_adatlap d ON d.id = j.dolgozo_id
WHERE b.jogviszony_id = j.id
  AND b.ervenyes_ig IS NULL;

-- 3. Drop columns from hr_dolgozo_adatlap
ALTER TABLE hr_dolgozo_adatlap
  DROP COLUMN IF EXISTS munkaviszony_tipusa,
  DROP COLUMN IF EXISTS munkaido_fte,
  DROP COLUMN IF EXISTS munkarend,
  DROP COLUMN IF EXISTS berkategoria,
  DROP COLUMN IF EXISTS kozvetlen_vezeto;

-- 4. Create the update history RPC
CREATE OR REPLACE FUNCTION update_hr_beosztas_history(
    p_dolgozo_id UUID,
    p_ervenyes_tol DATE,
    p_munkakor_id UUID,
    p_munkaviszony_tipusa TEXT,
    p_munkaido_fte NUMERIC,
    p_munkarend TEXT,
    p_berkategoria TEXT,
    p_kozvetlen_vezeto TEXT,
    p_belepes_datuma DATE -- Option to update jogviszony
)
RETURNS UUID AS $$
DECLARE
    v_jogviszony_id UUID;
    v_current_beosztas hr_beosztas%ROWTYPE;
    v_new_beosztas_id UUID;
BEGIN
    -- 1. Find or create active jogviszony
    SELECT id INTO v_jogviszony_id
    FROM hr_jogviszony
    WHERE dolgozo_id = p_dolgozo_id AND kilepes_datuma IS NULL
    ORDER BY belepes_datuma DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- If no active employment, create one (this shouldn't normally happen if they are active)
        INSERT INTO hr_jogviszony (dolgozo_id, belepes_datuma)
        VALUES (p_dolgozo_id, COALESCE(p_belepes_datuma, CURRENT_DATE))
        RETURNING id INTO v_jogviszony_id;
    ELSE
        -- Update belepes_datuma if provided
        IF p_belepes_datuma IS NOT NULL THEN
            UPDATE hr_jogviszony SET belepes_datuma = p_belepes_datuma WHERE id = v_jogviszony_id;
        END IF;
    END IF;

    -- 2. Find the current active beosztas
    SELECT * INTO v_current_beosztas
    FROM hr_beosztas
    WHERE jogviszony_id = v_jogviszony_id AND (ervenyes_ig IS NULL OR ervenyes_ig >= p_ervenyes_tol)
    ORDER BY ervenyes_tol DESC
    LIMIT 1;

    -- 3. If there is a current one, close it
    IF FOUND THEN
        -- If the new change is exactly on the same day as the current one started, just update it
        IF v_current_beosztas.ervenyes_tol = p_ervenyes_tol THEN
            UPDATE hr_beosztas
            SET
                munkakor_id = COALESCE(p_munkakor_id, munkakor_id),
                munkaviszony_tipusa = p_munkaviszony_tipusa,
                munkaido_fte = p_munkaido_fte,
                munkarend = p_munkarend,
                berkategoria = p_berkategoria,
                kozvetlen_vezeto = p_kozvetlen_vezeto,
                fte = COALESCE(p_munkaido_fte, fte)
            WHERE id = v_current_beosztas.id
            RETURNING id INTO v_new_beosztas_id;
            
            RETURN v_new_beosztas_id;
        ELSE
            -- Close the previous one
            UPDATE hr_beosztas
            SET ervenyes_ig = p_ervenyes_tol - INTERVAL '1 day'
            WHERE id = v_current_beosztas.id;
        END IF;
    END IF;

    -- 4. Insert the new beosztas row
    -- Find fallback munkakor if both are null
    IF p_munkakor_id IS NULL AND (v_current_beosztas.munkakor_id IS NULL) THEN
        SELECT id INTO p_munkakor_id FROM hr_munkakor LIMIT 1;
        
        -- If still null (table is empty), create a default one
        IF p_munkakor_id IS NULL THEN
            INSERT INTO hr_munkakor (megnevezes, leiras)
            VALUES ('Alapértelmezett Munkakör', 'Rendszer által generált automatikus munkakör.')
            RETURNING id INTO p_munkakor_id;
        END IF;
    END IF;

    INSERT INTO hr_beosztas (
        jogviszony_id,
        munkakor_id,
        ervenyes_tol,
        munkaviszony_tipusa,
        munkaido_fte,
        munkarend,
        berkategoria,
        kozvetlen_vezeto,
        fte
    ) VALUES (
        v_jogviszony_id,
        COALESCE(p_munkakor_id, v_current_beosztas.munkakor_id), -- fallback to previous
        p_ervenyes_tol,
        p_munkaviszony_tipusa,
        p_munkaido_fte,
        p_munkarend,
        p_berkategoria,
        p_kozvetlen_vezeto,
        COALESCE(p_munkaido_fte, 1.0)
    ) RETURNING id INTO v_new_beosztas_id;

    RETURN v_new_beosztas_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

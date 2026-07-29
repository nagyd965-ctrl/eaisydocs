-- 20260729000001_hr_add_probaido_to_rpc.sql

-- Replace the update history RPC to accept probaido_vege
CREATE OR REPLACE FUNCTION update_hr_beosztas_history(
    p_dolgozo_id UUID,
    p_ervenyes_tol DATE,
    p_munkakor_id UUID,
    p_munkaviszony_tipusa TEXT,
    p_munkaido_fte NUMERIC,
    p_munkarend TEXT,
    p_berkategoria TEXT,
    p_kozvetlen_vezeto TEXT,
    p_belepes_datuma DATE,
    p_probaido_vege DATE DEFAULT NULL
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
        -- If no active employment, create one
        INSERT INTO hr_jogviszony (dolgozo_id, belepes_datuma, probaido_vege)
        VALUES (p_dolgozo_id, COALESCE(p_belepes_datuma, CURRENT_DATE), p_probaido_vege)
        RETURNING id INTO v_jogviszony_id;
    ELSE
        -- Update belepes_datuma and probaido_vege if provided
        UPDATE hr_jogviszony 
        SET 
            belepes_datuma = COALESCE(p_belepes_datuma, belepes_datuma),
            probaido_vege = COALESCE(p_probaido_vege, probaido_vege)
        WHERE id = v_jogviszony_id;
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

    -- 4. Create the new beosztas
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
        COALESCE(p_munkakor_id, v_current_beosztas.munkakor_id),
        p_ervenyes_tol,
        p_munkaviszony_tipusa,
        p_munkaido_fte,
        p_munkarend,
        p_berkategoria,
        p_kozvetlen_vezeto,
        COALESCE(p_munkaido_fte, v_current_beosztas.fte, 1.00)
    )
    RETURNING id INTO v_new_beosztas_id;

    RETURN v_new_beosztas_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

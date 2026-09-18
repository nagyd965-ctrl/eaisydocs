-- ============================================================================
-- Migration: 20260918000001_concurrency_and_ai_queue.sql
-- Description: Concurrency row locking, atomic sub-numbering, and persistent AI Job Queue
-- ============================================================================

-- 1. AI Task Queue Table (ai_feladat_sor)
CREATE TABLE IF NOT EXISTS public.ai_feladat_sor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    irat_id UUID NOT NULL REFERENCES public.irat(id) ON DELETE CASCADE,
    feladat_tipus TEXT NOT NULL CHECK (feladat_tipus IN ('embedding', 'ai_metadata_extraction', 'ocr')),
    statusz TEXT NOT NULL DEFAULT 'fuggoben' CHECK (statusz IN ('fuggoben', 'folyamatban', 'kesz', 'hibas')),
    probalkozasok_szama INT DEFAULT 0,
    utolso_hiba TEXT,
    kovetkezo_futtatas TIMESTAMPTZ DEFAULT NOW(),
    eredmeny JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(irat_id, feladat_tipus)
);

CREATE INDEX IF NOT EXISTS idx_ai_feladat_sor_statusz_futtatas 
ON public.ai_feladat_sor (statusz, kovetkezo_futtatas);

CREATE INDEX IF NOT EXISTS idx_ai_feladat_sor_irat_id 
ON public.ai_feladat_sor (irat_id);

ALTER TABLE public.ai_feladat_sor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_feladat_sor_select_auth" ON public.ai_feladat_sor;
CREATE POLICY "ai_feladat_sor_select_auth" ON public.ai_feladat_sor
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ai_feladat_sor_all_auth" ON public.ai_feladat_sor;
CREATE POLICY "ai_feladat_sor_all_auth" ON public.ai_feladat_sor
    FOR ALL USING (auth.role() = 'authenticated');

-- 2. RPC to Claim Tasks from Queue with SKIP LOCKED (for multi-worker safety)
CREATE OR REPLACE FUNCTION public.claim_ai_tasks(p_limit INT DEFAULT 5)
RETURNS TABLE (
    task_id UUID,
    task_irat_id UUID,
    task_tipus TEXT,
    task_probalkozasok INT,
    task_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH locked_rows AS (
        SELECT s.id
        FROM public.ai_feladat_sor s
        WHERE s.statusz = 'fuggoben'
          AND s.kovetkezo_futtatas <= NOW()
        ORDER BY s.created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.ai_feladat_sor u
    SET statusz = 'folyamatban',
        probalkozasok_szama = u.probalkozasok_szama + 1,
        updated_at = NOW()
    FROM locked_rows lr
    WHERE u.id = lr.id
    RETURNING u.id, u.irat_id, u.feladat_tipus, u.probalkozasok_szama, u.created_at;
END;
$$;

-- 3. Atomic Dossier Attachment RPC with Row-level Lock (Eliminates Race Conditions)
CREATE OR REPLACE FUNCTION public.attach_irat_to_dossier_atomic(
    p_irat_id UUID,
    p_ugyirat_id UUID,
    p_user_id UUID,
    p_indoklas TEXT DEFAULT NULL,
    p_ip_cim TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ugyirat RECORD;
    v_irat RECORD;
    v_next_alszam INT;
BEGIN
    -- 1. Lock ugyirat to serialize concurrent alszam assignments
    SELECT id, iktatoszam, ugy_id 
    INTO v_ugyirat 
    FROM public.ugyirat 
    WHERE id = p_ugyirat_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'A kiválasztott ügyirat nem található.');
    END IF;

    -- 2. Lock irat and ensure it is not already filed
    SELECT id, ugyirat_id, targy
    INTO v_irat
    FROM public.irat
    WHERE id = p_irat_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'A beérkező irat nem található.');
    END IF;

    IF v_irat.ugyirat_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ezt az iratot már egy másik felhasználó vagy folyamat iktatta!');
    END IF;

    -- 3. Calculate next alszam atomically under the ugyirat lock
    SELECT COALESCE(MAX(alszam), 0) + 1 
    INTO v_next_alszam 
    FROM public.irat 
    WHERE ugyirat_id = p_ugyirat_id;

    -- 4. Update irat with the new dossier and sub-number
    UPDATE public.irat
    SET ugyirat_id = p_ugyirat_id,
        alszam = v_next_alszam
    WHERE id = p_irat_id;

    -- 5. Create polymorphic irat_kapcsolat (elozmeny)
    INSERT INTO public.irat_kapcsolat (
        irat_id,
        ugyirat_id,
        entitas_tipus,
        entitas_id,
        entitas_forras,
        kapcsolat_tipusa
    ) VALUES (
        p_irat_id,
        p_ugyirat_id,
        'szerzodes',
        p_ugyirat_id::text,
        'belso',
        'elozmeny'
    );

    -- 6. Insert audit log entry
    INSERT INTO public.esemeny_naplo (
        entitas_tipus,
        entitas_id,
        esemeny_tipus,
        user_id,
        indoklas,
        ip_cim,
        user_agent
    ) VALUES (
        'irat',
        p_irat_id,
        'iktatva',
        p_user_id,
        COALESCE(p_indoklas, concat('Előzmény-összerendeléssel csatolva a(z) ', v_ugyirat.iktatoszam, ' ügyirathoz (', v_next_alszam, '. alszám).')),
        p_ip_cim,
        p_user_agent
    );

    -- 7. Queue AI embedding update in ai_feladat_sor
    INSERT INTO public.ai_feladat_sor (irat_id, feladat_tipus, statusz)
    VALUES (p_irat_id, 'embedding', 'fuggoben')
    ON CONFLICT (irat_id, feladat_tipus)
    DO UPDATE SET statusz = 'fuggoben', kovetkezo_futtatas = NOW(), updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'iktatoszam', v_ugyirat.iktatoszam,
        'alszam', v_next_alszam,
        'ugyirat_id', p_ugyirat_id
    );
END;
$$;

-- 4. Automatic Trigger to Enqueue AI Embedding when Irat is created or content updated
CREATE OR REPLACE FUNCTION public.trigger_enqueue_irat_ai_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_irat_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'irat' THEN
        v_target_irat_id := NEW.id;
    ELSIF TG_TABLE_NAME = 'irat_fajl' THEN
        v_target_irat_id := NEW.irat_id;
    END IF;

    IF v_target_irat_id IS NOT NULL THEN
        INSERT INTO public.ai_feladat_sor (irat_id, feladat_tipus, statusz)
        VALUES (v_target_irat_id, 'embedding', 'fuggoben')
        ON CONFLICT (irat_id, feladat_tipus)
        DO UPDATE SET statusz = 'fuggoben', kovetkezo_futtatas = NOW(), updated_at = NOW()
        WHERE public.ai_feladat_sor.statusz IN ('fuggoben', 'hibas', 'kesz');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_irat_embedding ON public.irat;
CREATE TRIGGER trg_enqueue_irat_embedding
AFTER INSERT OR UPDATE OF targy, leiras, ugyirat_id ON public.irat
FOR EACH ROW EXECUTE FUNCTION public.trigger_enqueue_irat_ai_embedding();

DROP TRIGGER IF EXISTS trg_enqueue_fajl_embedding ON public.irat_fajl;
CREATE TRIGGER trg_enqueue_fajl_embedding
AFTER INSERT OR UPDATE OF ocr_szoveg ON public.irat_fajl
FOR EACH ROW EXECUTE FUNCTION public.trigger_enqueue_irat_ai_embedding();

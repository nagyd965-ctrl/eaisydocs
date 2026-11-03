-- =============================================================================
-- Migration: 20261102000003_separate_hr_and_docs_audit_logs.sql
-- Scope: [Közös] / [Docs] / [HR]
-- Purpose:
--   1. Ensure strict modular separation between eaisyDocs (`public.esemeny_naplo`)
--      and eaisyHR (`public.hr_esemeny_naplo`). When `TG_TABLE_NAME LIKE 'hr_%'`,
--      `log_audit_event()` routes the entry into `public.hr_esemeny_naplo`.
--   2. Strip technical index/vector columns (`embedding`, `kereso_vektor`) from
--      `elozo_ertek` and `uj_ertek` so 1536-float vectors and tsvector lexemes
--      never pollute audit payloads.
--   3. Skip pure technical no-op `UPDATE` events where only `embedding`,
--      `kereso_vektor`, `updated_at`, or `company_id` changed.
--   4. Fall back to `rogzito_user_id` / `felelos_user_id` when `auth.uid()` is
--      NULL (e.g., server actions using service_role).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_esemeny_tipus esemeny_tipus;
    v_hr_esemeny_tipus TEXT;
    v_entitas_tipus TEXT;
    v_entitas_id UUID;
    v_company_id UUID := NULL;
    v_elozo JSONB := NULL;
    v_uj JSONB := NULL;
BEGIN
    v_user_id := auth.uid();

    v_entitas_tipus := TG_TABLE_NAME;

    IF TG_OP = 'INSERT' THEN
        v_entitas_id := NEW.id;
        v_uj := to_jsonb(NEW) - 'embedding' - 'kereso_vektor';
    ELSIF TG_OP = 'UPDATE' THEN
        v_entitas_id := NEW.id;
        v_elozo := to_jsonb(OLD) - 'embedding' - 'kereso_vektor';
        v_uj := to_jsonb(NEW) - 'embedding' - 'kereso_vektor';

        -- Skip pure technical updates (e.g. AI embedding vector, FTS kereso_vektor, updated_at, company_id backfill)
        IF (v_elozo - 'updated_at' - 'company_id') IS NOT DISTINCT FROM (v_uj - 'updated_at' - 'company_id') THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_entitas_id := OLD.id;
        v_elozo := to_jsonb(OLD) - 'embedding' - 'kereso_vektor';
    END IF;

    -- Fallback user_id resolution when triggered via service_role client
    IF v_user_id IS NULL AND v_uj IS NOT NULL THEN
        IF (v_uj ? 'rogzito_user_id') AND (v_uj->>'rogzito_user_id') IS NOT NULL THEN
            BEGIN
                v_user_id := (v_uj->>'rogzito_user_id')::UUID;
            EXCEPTION WHEN OTHERS THEN
                v_user_id := NULL;
            END;
        ELSIF (v_uj ? 'felelos_user_id') AND (v_uj->>'felelos_user_id') IS NOT NULL THEN
            BEGIN
                v_user_id := (v_uj->>'felelos_user_id')::UUID;
            EXCEPTION WHEN OTHERS THEN
                v_user_id := NULL;
            END;
        END IF;
    END IF;

    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    END IF;

    -- Resolve company_id from NEW / OLD if present
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

    -- =========================================================================
    -- 1. HR tables (`hr_%`): route strictly to `public.hr_esemeny_naplo`
    --    Never pollute `public.esemeny_naplo` (eaisyDocs central audit log)!
    -- =========================================================================
    IF TG_TABLE_NAME LIKE 'hr_%' THEN
        IF TG_OP = 'INSERT' THEN
            v_hr_esemeny_tipus := 'adat_letrehozas';
        ELSIF TG_OP = 'DELETE' THEN
            v_hr_esemeny_tipus := 'adat_torles';
        ELSE
            v_hr_esemeny_tipus := 'adat_modositas';
        END IF;

        INSERT INTO public.hr_esemeny_naplo (
            felhasznalo_id,
            esemeny_tipus,
            entitas_tipus,
            entitas_id,
            regi_adat,
            uj_adat,
            company_id
        ) VALUES (
            v_user_id,
            v_hr_esemeny_tipus,
            v_entitas_tipus,
            v_entitas_id,
            v_elozo,
            v_uj,
            v_company_id
        );

        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- =========================================================================
    -- 2. eaisyDocs tables (`irat`, `ugyirat`, `ugy`, etc.): write to `esemeny_naplo`
    -- =========================================================================
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'irat' THEN
            v_esemeny_tipus := 'erkeztetve';
        ELSIF TG_TABLE_NAME = 'ugyirat' THEN
            v_esemeny_tipus := 'iktatva';
        ELSE
            v_esemeny_tipus := 'modositva';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
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
        v_esemeny_tipus := 'modositva';
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
$function$;

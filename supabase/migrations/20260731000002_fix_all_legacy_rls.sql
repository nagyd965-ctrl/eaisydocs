-- Biztonságos RLS frissítés script
-- Automatikusan megkeresi azokat az RLS policy-kat, amelyek még a 'legacy_szerepkor' oszlopra hivatkoznak,
-- és újraalkotja őket a tábla típusától függően (docs_szerepkor vagy hr_szerepkor)

DO $$ 
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    cmd TEXT;
BEGIN
    FOR pol IN (
        SELECT 
            n.nspname AS schemaname,
            c.relname AS tablename,
            p.polname AS policyname,
            pg_get_expr(p.polqual, p.polrelid) AS qual,
            pg_get_expr(p.polwithcheck, p.polrelid) AS with_check,
            p.polcmd AS cmd_type
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND (
               pg_get_expr(p.polqual, p.polrelid) LIKE '%legacy_szerepkor%' 
            OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%legacy_szerepkor%'
          )
    ) LOOP
        -- Döntés: docs vagy hr (Minden, ami nem hr_ és nem munkakor, az a docs-ba megy alapból)
        IF pol.tablename LIKE 'hr_%' OR pol.tablename IN ('munkakor', 'ertekelo_urlap', 'cafeteria_keret') THEN
            new_qual := REPLACE(pol.qual, 'legacy_szerepkor', 'hr_szerepkor');
            new_with_check := REPLACE(pol.with_check, 'legacy_szerepkor', 'hr_szerepkor');
        ELSE
            -- irat, ugyirat, ugy, irat_kapcsolat, szignalas, kolcsonzes, szervezeti_egyseg
            IF pol.tablename = 'szervezeti_egyseg' THEN
                -- Szervezeti egységnél mindkét jogosultság jó az adminhoz
                new_qual := REPLACE(pol.qual, 'legacy_szerepkor = ''admin''', '(hr_szerepkor = ''admin'' OR docs_szerepkor = ''admin'')');
                new_qual := REPLACE(new_qual, 'legacy_szerepkor = ''rendszergazda''', '(hr_szerepkor = ''rendszergazda'' OR docs_szerepkor = ''rendszergazda'')');
                new_with_check := REPLACE(pol.with_check, 'legacy_szerepkor = ''admin''', '(hr_szerepkor = ''admin'' OR docs_szerepkor = ''admin'')');
                new_with_check := REPLACE(new_with_check, 'legacy_szerepkor = ''rendszergazda''', '(hr_szerepkor = ''rendszergazda'' OR docs_szerepkor = ''rendszergazda'')');
                
                -- Ha van IN ('admin', 'rendszergazda') - egyszerű csere hr és docs -ra
                new_qual := REPLACE(new_qual, 'legacy_szerepkor', 'hr_szerepkor');
                new_with_check := REPLACE(new_with_check, 'legacy_szerepkor', 'hr_szerepkor');
            ELSE
                new_qual := REPLACE(pol.qual, 'legacy_szerepkor', 'docs_szerepkor');
                new_with_check := REPLACE(pol.with_check, 'legacy_szerepkor', 'docs_szerepkor');
            END IF;
        END IF;

        -- Először DROP
        cmd := format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE cmd;
        RAISE NOTICE 'Dropped policy: %', cmd;

        -- A CREATE megalkotása
        cmd := format('CREATE POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        
        -- COMMAND TYPE (SELECT, INSERT, UPDATE, DELETE, ALL)
        IF pol.cmd_type = 'r' THEN cmd := cmd || ' FOR SELECT';
        ELSIF pol.cmd_type = 'a' THEN cmd := cmd || ' FOR INSERT';
        ELSIF pol.cmd_type = 'w' THEN cmd := cmd || ' FOR UPDATE';
        ELSIF pol.cmd_type = 'd' THEN cmd := cmd || ' FOR DELETE';
        ELSE cmd := cmd || ' FOR ALL';
        END IF;

        IF new_qual IS NOT NULL THEN
            cmd := cmd || format(' USING (%s)', new_qual);
        END IF;

        IF new_with_check IS NOT NULL THEN
            cmd := cmd || format(' WITH CHECK (%s)', new_with_check);
        END IF;
        
        cmd := cmd || ';';
        
        -- Futtatás
        EXECUTE cmd;
        RAISE NOTICE 'Created policy: %', cmd;

    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 20260721000006_hr_toborzas_teljesitmeny_rls.sql

-- HR Toborzás Policy-k
CREATE POLICY "hr_toborzas_select" ON hr_toborzas FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
    )
);

CREATE POLICY "hr_toborzas_insert" ON hr_toborzas FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
    )
);

CREATE POLICY "hr_toborzas_update" ON hr_toborzas FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
    )
);

CREATE POLICY "hr_toborzas_delete" ON hr_toborzas FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto')
    )
);

-- HR Teljesítmény Policy-k
CREATE POLICY "hr_teljesitmeny_select" ON hr_teljesitmeny FOR SELECT 
USING (
    -- Bárki láthatja a sajátját
    dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid())
    OR
    -- Vezetők láthatják a beosztottaikét
    dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id IN (SELECT get_hr_subordinates(auth.uid())))
    OR
    -- HR és Admin mindent lát
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
    )
);

CREATE POLICY "hr_teljesitmeny_insert" ON hr_teljesitmeny FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
    )
);

CREATE POLICY "hr_teljesitmeny_update" ON hr_teljesitmeny FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil 
        WHERE id = auth.uid() 
        AND szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')
    )
);

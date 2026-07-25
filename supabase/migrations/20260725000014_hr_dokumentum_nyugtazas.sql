-- 20260725000014_hr_dokumentum_nyugtazas.sql

CREATE TABLE hr_ceges_dokumentum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cim TEXT NOT NULL,
    leiras TEXT,
    fajl_path TEXT, -- URL or storage path
    kotelezo_mindenkinek BOOLEAN DEFAULT true,
    aktiv BOOLEAN DEFAULT true,
    feltolto_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_ceges_dokumentum_nyugtazas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dokumentum_id UUID NOT NULL REFERENCES hr_ceges_dokumentum(id) ON DELETE CASCADE,
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    nyugtazva_mikor TIMESTAMPTZ DEFAULT NOW(),
    ip_cim TEXT, -- For audit purposes
    UNIQUE(dokumentum_id, dolgozo_id)
);

ALTER TABLE hr_ceges_dokumentum ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_ceges_dokumentum_nyugtazas ENABLE ROW LEVEL SECURITY;

-- Policies for hr_ceges_dokumentum
CREATE POLICY "Mindenki olvashatja az aktiv dokumentumokat" ON hr_ceges_dokumentum FOR SELECT TO authenticated USING (aktiv = true);
CREATE POLICY "HR kezelheti a dokumentumokat" ON hr_ceges_dokumentum FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
);

-- Policies for hr_ceges_dokumentum_nyugtazas
CREATE POLICY "Dolgozo olvashatja a sajat nyugtazasait" ON hr_ceges_dokumentum_nyugtazas FOR SELECT TO authenticated USING (dolgozo_id = auth.uid());
CREATE POLICY "HR olvashatja az osszes nyugtazast" ON hr_ceges_dokumentum_nyugtazas FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
);
CREATE POLICY "Dolgozo letrehozhat sajat nyugtazast" ON hr_ceges_dokumentum_nyugtazas FOR INSERT TO authenticated WITH CHECK (dolgozo_id = auth.uid());

-- Trigger for logging the acknowledgement to the event log
CREATE OR REPLACE FUNCTION log_dokumentum_nyugtazas()
RETURNS TRIGGER AS $$
DECLARE
    v_dok_cim TEXT;
BEGIN
    SELECT cim INTO v_dok_cim FROM hr_ceges_dokumentum WHERE id = NEW.dokumentum_id;
    
    INSERT INTO hr_esemeny_naplo (
        felhasznalo_id,
        esemeny_tipus,
        entitas_tipus,
        entitas_id,
        megjegyzes
    ) VALUES (
        NEW.dolgozo_id,
        'dokumentum_nyugtazas',
        'hr_ceges_dokumentum',
        NEW.dokumentum_id,
        'Dokumentum megismerve és elektronikusan nyugtázva: ' || v_dok_cim
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_dokumentum_nyugtazas
  AFTER INSERT ON hr_ceges_dokumentum_nyugtazas
  FOR EACH ROW EXECUTE FUNCTION log_dokumentum_nyugtazas();

-- Insert dummy documents
INSERT INTO hr_ceges_dokumentum (cim, leiras, fajl_path, kotelezo_mindenkinek) VALUES
('Munkavédelmi Szabályzat 2026', 'Éves kötelező tűz- és munkavédelmi oktatási anyag.', '#', true),
('GDPR Tájékoztató Munkavállalóknak', 'Adatkezelési tájékoztató az eaisyHR rendszer használatához.', '#', true),
('Gépjármű Használati Szabályzat', 'Céges autó használatának feltételei.', '#', false);

-- Törvényi kötelezettségek - Bevallás Archívum

CREATE TABLE hr_bevallas_archivum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipus TEXT NOT NULL, -- NAV, KSH, Bérszámfejtés, Egyéb
    idoszak TEXT NOT NULL, -- pl. 2026-07
    fajl_utvonal TEXT NOT NULL, -- Storage path
    fajl_nev TEXT NOT NULL,
    bekuldes_datuma TIMESTAMPTZ DEFAULT NOW(),
    feltolto_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hr_reports', 'hr_reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE hr_bevallas_archivum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hr munkatarsak olvashatjak az archivumot" 
ON hr_bevallas_archivum FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
);

CREATE POLICY "Hr munkatarsak feltolthetnek az archivumba" 
ON hr_bevallas_archivum FOR ALL TO authenticated
USING (
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

-- Storage RLS
CREATE POLICY "Hr munkatarsak olvashatjak a reportokat"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'hr_reports' AND
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
);

CREATE POLICY "Hr munkatarsak feltolthetnek reportokat"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'hr_reports' AND
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
);

CREATE POLICY "Hr munkatarsak modosithatjak a reportokat"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'hr_reports' AND
    EXISTS (
        SELECT 1 FROM felhasznalo_profil
        WHERE id = auth.uid() AND hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
);

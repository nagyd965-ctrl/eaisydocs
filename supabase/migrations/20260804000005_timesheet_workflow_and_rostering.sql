-- Create monthly timesheet closing workflow table
CREATE TABLE IF NOT EXISTS hr_havi_jelenlet_zaras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    ev INTEGER NOT NULL,
    honap INTEGER NOT NULL,
    statusz TEXT NOT NULL DEFAULT 'nyitott', -- 'nyitott', 'jovahagyasra_var', 'jovahagyva'
    bekuldve_at TIMESTAMPTZ,
    jovahagyva_at TIMESTAMPTZ,
    jovahagyo_vezeto_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dolgozo_id, ev, honap)
);

ALTER TABLE hr_havi_jelenlet_zaras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dolgozó látja a saját zárását" ON hr_havi_jelenlet_zaras 
FOR SELECT TO authenticated 
USING (dolgozo_id = auth.uid() OR (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

CREATE POLICY "Dolgozó beküldheti a saját zárását" ON hr_havi_jelenlet_zaras 
FOR INSERT TO authenticated 
WITH CHECK (dolgozo_id = auth.uid());

CREATE POLICY "Dolgozó frissítheti a saját nyitott zárását" ON hr_havi_jelenlet_zaras 
FOR UPDATE TO authenticated 
USING (dolgozo_id = auth.uid() AND statusz = 'nyitott');

CREATE POLICY "HR és Admin kezelheti a zárásokat" ON hr_havi_jelenlet_zaras 
FOR ALL TO authenticated 
USING ((SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

-- Add planned shifts to hr_jelenlet for overrides (optional)
ALTER TABLE hr_jelenlet 
  ADD COLUMN IF NOT EXISTS tervezett_kezdes TIME,
  ADD COLUMN IF NOT EXISTS tervezett_veges TIME;

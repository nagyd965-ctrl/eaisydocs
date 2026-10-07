-- 20261007000003_fix_hr_jelenlet_rls.sql
-- HR és közvetlen vezető rögzíthet és módosíthat jelenlétet a dolgozók számára

DROP POLICY IF EXISTS "HR és Vezető rögzíthet jelenlétet" ON hr_jelenlet;
CREATE POLICY "HR és Vezető rögzíthet jelenlétet" ON hr_jelenlet
FOR INSERT TO authenticated
WITH CHECK (
  dolgozo_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil p
    WHERE p.id = auth.uid() AND (p.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin') OR p.szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin'))
  ) OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR és Vezető frissítheti a jelenlétet" ON hr_jelenlet;
CREATE POLICY "HR és Vezető frissítheti a jelenlétet" ON hr_jelenlet
FOR UPDATE TO authenticated
USING (
  dolgozo_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil p
    WHERE p.id = auth.uid() AND (p.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin') OR p.szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin'))
  ) OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Dolgozó látja saját jelenlétét" ON hr_jelenlet;
CREATE POLICY "Dolgozó látja saját jelenlétét" ON hr_jelenlet
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil p
    WHERE p.id = auth.uid() AND (p.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin') OR p.szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin'))
  ) OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);

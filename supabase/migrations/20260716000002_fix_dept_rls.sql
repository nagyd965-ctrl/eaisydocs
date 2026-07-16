-- 20260716000002_fix_dept_rls.sql

DROP POLICY IF EXISTS "Szervezeti egysegek kezelese" ON szervezeti_egyseg;

CREATE POLICY "Szervezeti egysegek kezelese" ON szervezeti_egyseg
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid() AND (fp.szerepkor::text = 'admin' OR fp.szerepkor::text = 'rendszergazda')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid() AND (fp.szerepkor::text = 'admin' OR fp.szerepkor::text = 'rendszergazda')
  )
);

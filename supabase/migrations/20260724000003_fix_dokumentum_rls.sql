-- 20260724000003_fix_dokumentum_rls.sql

-- Drop the old policies
DROP POLICY IF EXISTS "Dolgozó látja saját dokumentumait" ON hr_dokumentum;
DROP POLICY IF EXISTS "HR szerkeszti a dokumentumokat" ON hr_dokumentum;

-- Create the new policies using hr_szerepkor
CREATE POLICY "Dolgozó látja saját dokumentumait" ON hr_dokumentum 
FOR SELECT TO authenticated 
USING (
  dolgozo_id = auth.uid() 
  OR (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

-- HR and Admin can create/edit/delete documents
CREATE POLICY "HR szerkeszti a dokumentumokat" ON hr_dokumentum 
FOR ALL TO authenticated 
USING (
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

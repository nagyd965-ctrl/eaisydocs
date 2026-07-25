-- Fix missing RLS policies for hr_munkakor
-- HR workers and Admins should be able to create, update, and delete job roles

CREATE POLICY "HR es Admin hozhat letre munkakort" ON hr_munkakor 
FOR INSERT TO authenticated 
WITH CHECK (
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

CREATE POLICY "HR es Admin modocsithat munkakort" ON hr_munkakor 
FOR UPDATE TO authenticated 
USING (
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

CREATE POLICY "HR es Admin torolhet munkakort" ON hr_munkakor 
FOR DELETE TO authenticated 
USING (
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

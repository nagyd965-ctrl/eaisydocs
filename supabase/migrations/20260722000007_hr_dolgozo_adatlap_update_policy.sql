-- Add UPDATE policy for hr_dolgozo_adatlap so HR and the employee can edit general personal info

CREATE POLICY "Sajat maga vagy HR szerkesztheti az adatlapjat" ON hr_dolgozo_adatlap 
FOR UPDATE TO authenticated
USING (
  id = auth.uid() OR 
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
)
WITH CHECK (
  id = auth.uid() OR 
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

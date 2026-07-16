-- 20260716000001_department_management.sql

DROP POLICY IF EXISTS "Szervezeti egysegek kezelese" ON szervezeti_egyseg;

CREATE POLICY "Szervezeti egysegek kezelese" ON szervezeti_egyseg
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid() AND fp.szerepkor IN ('admin', 'rendszergazda')
  )
);

-- Drop old RPC to recreate it with the new parameter
DROP FUNCTION IF EXISTS admin_update_user_profile(UUID, user_szerepkor, irat_minosites);
DROP FUNCTION IF EXISTS admin_update_user_profile(UUID, user_szerepkor, irat_minosites, UUID);

CREATE OR REPLACE FUNCTION admin_update_user_profile(target_user_id UUID, new_role user_szerepkor, new_minosites irat_minosites, new_department_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin or rendszergazda
  IF NOT EXISTS (
    SELECT 1 FROM felhasznalo_profil
    WHERE id = auth.uid() AND (szerepkor = 'rendszergazda' OR szerepkor::text = 'admin')
  ) THEN
    RAISE EXCEPTION 'Csak rendszergazda módosíthat jogosultságokat!';
  END IF;

  UPDATE felhasznalo_profil 
  SET 
    szerepkor = new_role, 
    max_minosites = new_minosites,
    szervezeti_egyseg_id = new_department_id
  WHERE id = target_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

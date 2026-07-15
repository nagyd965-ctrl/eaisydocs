CREATE OR REPLACE FUNCTION admin_update_user_role(target_user_id UUID, new_role user_szerepkor, new_minosites irat_minosites)
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
  SET szerepkor = new_role, max_minosites = new_minosites
  WHERE id = target_user_id;
END;
$$;

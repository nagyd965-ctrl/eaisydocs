-- Prevent admin self-demotion in RPCs to avoid system lockout

CREATE OR REPLACE FUNCTION admin_update_user_role(target_user_id UUID, new_role user_szerepkor, new_minosites irat_minosites)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin or rendszergazda
  IF NOT EXISTS (
    SELECT 1 FROM felhasznalo_profil
    WHERE id = auth.uid() AND (
      szerepkor::text IN ('rendszergazda', 'admin') OR
      docs_szerepkor::text IN ('rendszergazda', 'admin') OR
      hr_szerepkor::text IN ('rendszergazda', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Csak rendszergazda módosíthat jogosultságokat!';
  END IF;

  -- Prevent self-demotion if caller is demoting themselves from admin/rendszergazda
  IF target_user_id = auth.uid() AND new_role::text NOT IN ('rendszergazda', 'admin') THEN
    RAISE EXCEPTION 'Saját adminisztrátori jogosultságodat nem csökkentheted a rendszerből való kizáródás megelőzése érdekében!';
  END IF;

  UPDATE felhasznalo_profil 
  SET 
    szerepkor = new_role,
    docs_szerepkor = new_role::text::docs_szerepkor_enum,
    max_minosites = new_minosites
  WHERE id = target_user_id;
END;
$$;


CREATE OR REPLACE FUNCTION admin_update_user_profile(target_user_id UUID, new_role user_szerepkor, new_minosites irat_minosites, new_department_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin or rendszergazda
  IF NOT EXISTS (
    SELECT 1 FROM felhasznalo_profil
    WHERE id = auth.uid() AND (
      szerepkor::text IN ('rendszergazda', 'admin') OR
      docs_szerepkor::text IN ('rendszergazda', 'admin') OR
      hr_szerepkor::text IN ('rendszergazda', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Csak rendszergazda módosíthat jogosultságokat!';
  END IF;

  -- Prevent self-demotion if caller is demoting themselves from admin/rendszergazda
  IF target_user_id = auth.uid() AND new_role::text NOT IN ('rendszergazda', 'admin') THEN
    RAISE EXCEPTION 'Saját adminisztrátori jogosultságodat nem csökkentheted a rendszerből való kizáródás megelőzése érdekében!';
  END IF;

  UPDATE felhasznalo_profil 
  SET 
    szerepkor = new_role, 
    docs_szerepkor = new_role::text::docs_szerepkor_enum,
    max_minosites = new_minosites,
    szervezeti_egyseg_id = new_department_id
  WHERE id = target_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

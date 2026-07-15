CREATE OR REPLACE FUNCTION update_own_profile(
  p_nev TEXT DEFAULT NULL,
  p_pozicio TEXT DEFAULT NULL,
  p_ceg_neve TEXT DEFAULT NULL,
  p_munkamenet_idotullepes INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE felhasznalo_profil 
  SET 
    nev = COALESCE(p_nev, nev),
    pozicio = COALESCE(p_pozicio, pozicio),
    ceg_neve = COALESCE(p_ceg_neve, ceg_neve),
    munkamenet_idotullepes = COALESCE(p_munkamenet_idotullepes, munkamenet_idotullepes)
  WHERE id = auth.uid();
END;
$$;

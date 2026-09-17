-- Add vezeto_id column to szervezeti_egyseg
ALTER TABLE szervezeti_egyseg ADD COLUMN IF NOT EXISTS vezeto_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_szervezeti_egyseg_vezeto_id ON szervezeti_egyseg(vezeto_id);

-- Optional: If Nagy Dániel is in Pénzügy, set as initial leader for testing
DO $$
DECLARE
  v_daniel_id UUID;
  v_penzugy_id UUID;
BEGIN
  SELECT id INTO v_daniel_id FROM felhasznalo_profil WHERE nev = 'Nagy Dániel' LIMIT 1;
  SELECT id INTO v_penzugy_id FROM szervezeti_egyseg WHERE nev = 'Pénzügy' LIMIT 1;
  
  IF v_daniel_id IS NOT NULL AND v_penzugy_id IS NOT NULL THEN
    UPDATE szervezeti_egyseg SET vezeto_id = v_daniel_id WHERE id = v_penzugy_id AND vezeto_id IS NULL;
  END IF;
END $$;

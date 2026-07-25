-- 20260725000001_module_separation.sql
-- Separating the HR module's organizational structure from Docs module

CREATE TABLE hr_szervezeti_egyseg (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nev TEXT NOT NULL,
    szulo_id UUID REFERENCES hr_szervezeti_egyseg(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_szervezeti_egyseg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mindenki latja a HR szervezeti egyseget akinek van HR modulja" ON hr_szervezeti_egyseg 
FOR SELECT TO authenticated 
USING ( (SELECT elerheto_modulok FROM felhasznalo_profil WHERE id = auth.uid()) @> '{hr}'::text[] );

-- Drop constraint from hr_munkakor, change to new table, and wipe old ones because they pointed to wrong table
ALTER TABLE hr_munkakor DROP CONSTRAINT IF EXISTS hr_munkakor_szervezeti_egyseg_id_fkey;
UPDATE hr_munkakor SET szervezeti_egyseg_id = NULL; -- Clear it out as IDs won't match anymore
ALTER TABLE hr_munkakor 
  ADD CONSTRAINT hr_munkakor_szervezeti_egyseg_id_fkey 
  FOREIGN KEY (szervezeti_egyseg_id) 
  REFERENCES hr_szervezeti_egyseg(id) ON DELETE RESTRICT;

-- Add hr_szervezeti_egyseg_id to felhasznalo_profil
ALTER TABLE felhasznalo_profil ADD COLUMN hr_szervezeti_egyseg_id UUID REFERENCES hr_szervezeti_egyseg(id) ON DELETE SET NULL;

-- Recreate the get_hr_subordinates RPC to use hr_szervezeti_egyseg
CREATE OR REPLACE FUNCTION get_hr_subordinates(p_manager_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    SELECT id, szulo_id FROM hr_szervezeti_egyseg 
    WHERE id = (SELECT hr_szervezeti_egyseg_id FROM felhasznalo_profil WHERE id = p_manager_id)
    UNION
    SELECT se.id, se.szulo_id FROM hr_szervezeti_egyseg se
    INNER JOIN subordinates s ON se.szulo_id = s.id
  )
  SELECT fp.id FROM felhasznalo_profil fp
  WHERE fp.hr_szervezeti_egyseg_id IN (SELECT id FROM subordinates);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

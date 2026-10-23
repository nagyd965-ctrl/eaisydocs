-- 20261023000001_idp_revamp_columns.sql
-- IDP (Egyéni Fejlesztési Terv) modul felújítás: mentor_id, képző intézmény, költség, finanszírozás és tanúsítvány csatolmány mezők

ALTER TABLE hr_fejlesztesi_cel
  ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intezmeny TEXT,
  ADD COLUMN IF NOT EXISTS koltseg NUMERIC,
  ADD COLUMN IF NOT EXISTS finanszirozas TEXT DEFAULT 'ceg',
  ADD COLUMN IF NOT EXISTS tanusitvany_url TEXT,
  ADD COLUMN IF NOT EXISTS tanusitvany_nev TEXT,
  ADD COLUMN IF NOT EXISTS tanusitvany_feltoltve_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS elutasitas_indoklas TEXT;

-- Index a mentor_id kereséshez
CREATE INDEX IF NOT EXISTS idx_hr_fejlesztesi_cel_mentor_id ON hr_fejlesztesi_cel(mentor_id);

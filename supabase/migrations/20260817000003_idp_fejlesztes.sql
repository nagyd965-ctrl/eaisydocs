-- 20260817000003_idp_fejlesztes.sql
-- IDP modul bővítések: prioritás, mentor, haladási megjegyzések

-- Prioritás és mentor mező a célkitűzésekhez
ALTER TABLE hr_fejlesztesi_cel
  ADD COLUMN IF NOT EXISTS prioritas TEXT DEFAULT 'kozepes'
    CHECK (prioritas IN ('magas', 'kozepes', 'alacsony')),
  ADD COLUMN IF NOT EXISTS mentor TEXT,
  ADD COLUMN IF NOT EXISTS teljesites_datuma DATE;

-- Haladási megjegyzések tábla (goal-szintű napló)
CREATE TABLE IF NOT EXISTS hr_idp_megjegyzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cel_id      UUID NOT NULL REFERENCES hr_fejlesztesi_cel(id) ON DELETE CASCADE,
  szoveg      TEXT NOT NULL,
  iro_id      UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_idp_megjegyzes ENABLE ROW LEVEL SECURITY;

-- HR és az érintett dolgozó is láthatja/írhatja
CREATE POLICY "IDP megjegyzes lathato" ON hr_idp_megjegyzes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM felhasznalo_profil
      WHERE id = auth.uid()
        AND hr_szerepkor IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM hr_fejlesztesi_cel c
      WHERE c.id = cel_id AND c.dolgozo_id = auth.uid()
    )
  );

CREATE POLICY "IDP megjegyzes rogzitheto" ON hr_idp_megjegyzes
  FOR INSERT TO authenticated
  WITH CHECK (iro_id = auth.uid());

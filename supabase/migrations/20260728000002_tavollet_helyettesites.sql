-- 1. A távollét tábla kiegészítése az aktuális jóváhagyóval
ALTER TABLE hr_tavollet
ADD COLUMN IF NOT EXISTS aktualis_jovahagyo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL;

-- 2. Helyettesítések táblája (időszakos)
CREATE TABLE IF NOT EXISTS hr_helyettesites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vezeto_id UUID NOT NULL REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    helyettes_id UUID NOT NULL REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    kezdet_datuma DATE NOT NULL,
    veg_datuma DATE NOT NULL,
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_helyettesites_datumok CHECK (veg_datuma >= kezdet_datuma)
);

-- RLS a hr_helyettesites táblára
ALTER TABLE hr_helyettesites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mindenki láthatja a helyettesítéseket"
  ON hr_helyettesites
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "A vezető és a HR kezelheti a saját helyettesítéseit"
  ON hr_helyettesites
  FOR ALL TO authenticated
  USING (
    auth.uid() = vezeto_id OR 
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
  )
  WITH CHECK (
    auth.uid() = vezeto_id OR 
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
  );

-- Trigger az audit naplóhoz
CREATE TRIGGER audit_hr_helyettesites
  AFTER INSERT OR UPDATE OR DELETE ON hr_helyettesites
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

-- 3. RLS Policy frissítése hr_tavollet táblára (Hogy az aktuális jóváhagyó is lássa)
DROP POLICY IF EXISTS "Vezetők és HR láthatják a beosztottjaik távolléteit" ON hr_tavollet;

CREATE POLICY "Vezetők, helyettesek és HR láthatják a beosztottjaik távolléteit"
  ON hr_tavollet
  FOR SELECT TO authenticated
  USING (
    dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid()) -- Saját maga
    OR aktualis_jovahagyo_id = auth.uid() -- Akinek ki van szignálva (Vezető VAGY helyettes)
    OR jovahagyo_id = auth.uid() -- Aki korábban jóváhagyta
    OR (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin') -- HR
  );

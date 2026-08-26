-- 20260826000002_tulora.sql
-- Túlóra-egyenleg és túlóra-felhasználás kezelése az eaisyHR rendszerben.
-- Automatikus számlálás: a kicsekkölés után egy trigger számolja a napi 8h * FTE feletti időt.

-- 1. Túlóra egyenleg tábla (összesített, per-dolgozó)
CREATE TABLE IF NOT EXISTS hr_tulora_egyenleg (
  dolgozo_id  UUID PRIMARY KEY REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
  perc        INTEGER NOT NULL DEFAULT 0,  -- pozitív = többlet, negatív = hiány
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hr_tulora_egyenleg IS
  'Összesített túlóra egyenleg per dolgozó (percben). Automatikusan frissül trigger által.';

ALTER TABLE hr_tulora_egyenleg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dolgozó látja saját egyenlegét"
  ON hr_tulora_egyenleg FOR SELECT TO authenticated
  USING (dolgozo_id = auth.uid()
    OR (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid())
       IN ('hr_munkatars', 'hr_vezeto', 'admin'));

CREATE POLICY "HR és rendszer módosíthatja"
  ON hr_tulora_egyenleg FOR ALL TO authenticated
  USING (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid())
    IN ('hr_munkatars', 'hr_vezeto', 'admin')
  );

-- 2. Túlóra felhasználási kérelmek táblája
CREATE TABLE IF NOT EXISTS hr_tulora_felhasznalás (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dolgozo_id    UUID NOT NULL REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
  tipus         TEXT NOT NULL CHECK (tipus IN ('kiveszi_szabinak', 'kifizetteti')),
  perc          INTEGER NOT NULL CHECK (perc > 0),
  statusz       TEXT NOT NULL DEFAULT 'jovahagyasra_var'
                  CHECK (statusz IN ('jovahagyasra_var', 'jovahagyva', 'elutasitva')),
  jovahagyo_id  UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
  jovahagyva_at TIMESTAMPTZ,
  megjegyzes    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hr_tulora_felhasznalás IS
  'Túlóra felhasználási kérelmek (szabiként kiveszi vagy kifizetési igény).';

ALTER TABLE hr_tulora_felhasznalás ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dolgozó látja és létrehozhatja saját kérelmét"
  ON hr_tulora_felhasznalás FOR ALL TO authenticated
  USING (dolgozo_id = auth.uid())
  WITH CHECK (dolgozo_id = auth.uid() AND statusz = 'jovahagyasra_var');

CREATE POLICY "HR és vezető látja és kezelheti"
  ON hr_tulora_felhasznalás FOR ALL TO authenticated
  USING (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid())
    IN ('hr_munkatars', 'hr_vezeto', 'admin')
    OR EXISTS (
      SELECT 1 FROM felhasznalo_profil
      WHERE id = dolgozo_id AND kozvetlen_vezeto_id = auth.uid()
    )
  );

-- Audit trigger
CREATE TRIGGER audit_hr_tulora_felhasznalás
  AFTER INSERT OR UPDATE OR DELETE ON hr_tulora_felhasznalás
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

-- 3. Automatikus túlóra számítás trigger a hr_jelenlet táblán
--    Akkor fut le, ha a kicsekkolas_ideje kitöltésre kerül (NULL → érték).
CREATE OR REPLACE FUNCTION calculate_tulora_on_checkout()
RETURNS TRIGGER AS $$
DECLARE
  v_munkaido_perc  INTEGER;
  v_fte            NUMERIC;
  v_elvaart_perc   INTEGER;
  v_delta_perc     INTEGER;
  v_jogviszony_id  UUID;
BEGIN
  -- Csak akkor futunk, ha a kicsekkolas_ideje most lett kitöltve (NULL-ból kapott értéket)
  IF NEW.kicsekkolas_ideje IS NULL OR OLD.kicsekkolas_ideje IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Ledolgozott percek számítása
  v_munkaido_perc := EXTRACT(EPOCH FROM (NEW.kicsekkolas_ideje - NEW.becsekkolas_ideje)) / 60;

  -- FTE lekérése az aktív jogviszonyból
  SELECT b.munkaido_fte
  INTO v_fte
  FROM hr_jogviszony j
  JOIN hr_beosztas b ON b.jogviszony_id = j.id
  WHERE j.dolgozo_id = NEW.dolgozo_id
    AND j.kilepes_datuma IS NULL
    AND (b.ervenyes_ig IS NULL OR b.ervenyes_ig >= CURRENT_DATE)
  ORDER BY b.ervenyes_tol DESC
  LIMIT 1;

  -- Ha nincs FTE adat, alapértelmezetten 1.0 (teljes munkaidő = 480 perc/nap)
  v_fte := COALESCE(v_fte, 1.0);
  v_elvaart_perc := (v_fte * 480)::INTEGER;

  -- Delta: ledolgozott - elvárt (lehet negatív is!)
  v_delta_perc := v_munkaido_perc - v_elvaart_perc;

  -- Egyenleg frissítése (UPSERT)
  INSERT INTO hr_tulora_egyenleg (dolgozo_id, perc, updated_at)
    VALUES (NEW.dolgozo_id, v_delta_perc, NOW())
    ON CONFLICT (dolgozo_id) DO UPDATE
      SET perc = hr_tulora_egyenleg.perc + v_delta_perc,
          updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger létrehozása / frissítése
DROP TRIGGER IF EXISTS tulora_szamitas ON hr_jelenlet;
CREATE TRIGGER tulora_szamitas
  AFTER UPDATE ON hr_jelenlet
  FOR EACH ROW EXECUTE FUNCTION calculate_tulora_on_checkout();

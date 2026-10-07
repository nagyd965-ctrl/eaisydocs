-- 20261007000001_overtime_workflow_enhancements.sql
-- Túlóra-felhasználás és csúsztatás (szabadnap túlóra terhére) teljeskörű munkafolyamat támogatása

-- 1. Új típus hozzáadása a távolléti típusokhoz
ALTER TYPE hr_tavollet_tipus ADD VALUE IF NOT EXISTS 'csusztatas';

-- 2. Dátum és kapcsolt távollét mezők hozzáadása a hr_tulora_felhasznalás táblához
ALTER TABLE "hr_tulora_felhasznalás" 
  ADD COLUMN IF NOT EXISTS datum DATE,
  ADD COLUMN IF NOT EXISTS tavollet_id UUID REFERENCES hr_tavollet(id) ON DELETE SET NULL;

-- 3. Ékezetmentes nézet létrehozása a kompatibilitás megőrzése érdekében
CREATE OR REPLACE VIEW hr_tulora_felhasznalas AS 
  SELECT * FROM "hr_tulora_felhasznalás";

-- 4. Trigger funkció: Túlóra felhasználás jóváhagyásakor egyenleg levonás és távollét szinkron
CREATE OR REPLACE FUNCTION handle_tulora_felhasznalas_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Jóváhagyás esetén: egyenleg levonása
  IF OLD.statusz = 'jovahagyasra_var' AND NEW.statusz = 'jovahagyva' THEN
    UPDATE hr_tulora_egyenleg
    SET perc = hr_tulora_egyenleg.perc - NEW.perc,
        updated_at = NOW()
    WHERE dolgozo_id = NEW.dolgozo_id;

    -- Ha van kapcsolt távollét, annak jóváhagyása
    IF NEW.tavollet_id IS NOT NULL THEN
      UPDATE hr_tavollet
      SET statusz = 'jovahagyva',
          jovahagyo_id = COALESCE(NEW.jovahagyo_id, jovahagyo_id)
      WHERE id = NEW.tavollet_id AND statusz != 'jovahagyva';
    END IF;
  END IF;

  -- Elutasítás esetén: kapcsolt távollét elutasítása
  IF OLD.statusz = 'jovahagyasra_var' AND NEW.statusz = 'elutasitva' THEN
    IF NEW.tavollet_id IS NOT NULL THEN
      UPDATE hr_tavollet
      SET statusz = 'elutasitva',
          jovahagyo_id = COALESCE(NEW.jovahagyo_id, jovahagyo_id)
      WHERE id = NEW.tavollet_id AND statusz != 'elutasitva';
    END IF;
  END IF;

  -- Korábban jóváhagyott kérelem visszavonása/elutasítása esetén: percek visszaadása
  IF OLD.statusz = 'jovahagyva' AND NEW.statusz = 'elutasitva' THEN
    UPDATE hr_tulora_egyenleg
    SET perc = hr_tulora_egyenleg.perc + NEW.perc,
        updated_at = NOW()
    WHERE dolgozo_id = NEW.dolgozo_id;

    IF NEW.tavollet_id IS NOT NULL THEN
      UPDATE hr_tavollet
      SET statusz = 'elutasitva',
          jovahagyo_id = COALESCE(NEW.jovahagyo_id, jovahagyo_id)
      WHERE id = NEW.tavollet_id AND statusz != 'elutasitva';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tulora_felhasznalas_approval ON "hr_tulora_felhasznalás";
CREATE TRIGGER trg_tulora_felhasznalas_approval
  AFTER UPDATE OF statusz ON "hr_tulora_felhasznalás"
  FOR EACH ROW
  EXECUTE FUNCTION handle_tulora_felhasznalas_approval();

-- 5. Trigger funkció: Ha a vezető a hr_tavollet táblában hagyja jóvá a csúsztatást
CREATE OR REPLACE FUNCTION handle_tavollet_csusztatas_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipus = 'csusztatas' AND OLD.statusz != NEW.statusz THEN
    IF NEW.statusz = 'jovahagyva' THEN
      UPDATE "hr_tulora_felhasznalás"
      SET statusz = 'jovahagyva',
          jovahagyo_id = COALESCE(NEW.jovahagyo_id, jovahagyo_id),
          jovahagyva_at = NOW()
      WHERE tavollet_id = NEW.id AND statusz != 'jovahagyva';
    ELSIF NEW.statusz = 'elutasitva' THEN
      UPDATE "hr_tulora_felhasznalás"
      SET statusz = 'elutasitva',
          jovahagyo_id = COALESCE(NEW.jovahagyo_id, jovahagyo_id)
      WHERE tavollet_id = NEW.id AND statusz != 'elutasitva';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tavollet_csusztatas_sync ON hr_tavollet;
CREATE TRIGGER trg_tavollet_csusztatas_sync
  AFTER UPDATE OF statusz ON hr_tavollet
  FOR EACH ROW
  EXECUTE FUNCTION handle_tavollet_csusztatas_sync();

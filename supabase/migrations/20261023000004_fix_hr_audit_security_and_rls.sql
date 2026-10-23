-- Migration: 20261023000004_fix_hr_audit_security_and_rls.sql
-- Cél: eaisyHR biztonsági audit javítások (helyettesítés jóváhagyási jog, orvosi és fegyelmi RLS szigorítás)
-- Megjegyzés: Kizárólag eaisyHR táblákat érint, az eaisyDocs iratkezelő rendszert nem módosítja.

-- 1. hr_tavollet UPDATE Policy javítása (Helyettesítők és pontos hr_szerepkor támogatása)
DROP POLICY IF EXISTS "Vezető jóváhagyhatja a beosztott szabadságát" ON hr_tavollet;
DROP POLICY IF EXISTS "Vezető, helyettes vagy HR jóváhagyhatja a szabadságot" ON hr_tavollet;

CREATE POLICY "Vezető, helyettes vagy HR jóváhagyhatja a szabadságot" ON hr_tavollet
FOR UPDATE TO authenticated
USING (
  dolgozo_id IN (SELECT get_hr_subordinates(auth.uid())) OR
  aktualis_jovahagyo_id = auth.uid() OR
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda') OR
  (SELECT docs_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('admin', 'rendszergazda')
);

-- 2. hr_orvosi_vizsgalat RLS szigorítása (GDPR 9. cikk szerinti egészségügyi adatok védelme)
DROP POLICY IF EXISTS "Orvosi olvasas" ON hr_orvosi_vizsgalat;
DROP POLICY IF EXISTS "Orvosi iras" ON hr_orvosi_vizsgalat;
DROP POLICY IF EXISTS "Dolgozo vagy HR lathatja az orvosi adatokat" ON hr_orvosi_vizsgalat;
DROP POLICY IF EXISTS "Csak HR vagy munkavedelmi irhat orvosi adatokat" ON hr_orvosi_vizsgalat;

CREATE POLICY "Dolgozo vagy HR lathatja az orvosi adatokat" ON hr_orvosi_vizsgalat
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR
  dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid()) OR
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'munkavedelmi', 'auditor', 'rendszergazda')
);

CREATE POLICY "Csak HR vagy munkavedelmi irhat orvosi adatokat" ON hr_orvosi_vizsgalat
FOR ALL TO authenticated
USING (
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'munkavedelmi', 'rendszergazda')
)
WITH CHECK (
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'munkavedelmi', 'rendszergazda')
);

-- 3. hr_fegyelmi RLS szigorítása (Fegyelmi határozatok illetéktelen megtekintésének kizárása)
DROP POLICY IF EXISTS "Fegyelmi olvasas" ON hr_fegyelmi;
DROP POLICY IF EXISTS "Fegyelmi iras" ON hr_fegyelmi;
DROP POLICY IF EXISTS "Dolgozo vagy HR lathatja a fegyelmi ugyeket" ON hr_fegyelmi;
DROP POLICY IF EXISTS "Csak HR vagy Admin kezelheti a fegyelmi ugyeket" ON hr_fegyelmi;

CREATE POLICY "Dolgozo vagy HR lathatja a fegyelmi ugyeket" ON hr_fegyelmi
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR
  dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid()) OR
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'auditor', 'rendszergazda')
);

CREATE POLICY "Csak HR vagy Admin kezelheti a fegyelmi ugyeket" ON hr_fegyelmi
FOR ALL TO authenticated
USING (
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda')
)
WITH CHECK (
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda')
);

-- 4. hr_elozo_munkahely RLS szigorítása (Saját és HR hozzáférés biztosítása)
DROP POLICY IF EXISTS "Munkahely olvasas" ON hr_elozo_munkahely;
DROP POLICY IF EXISTS "Munkahely iras" ON hr_elozo_munkahely;
DROP POLICY IF EXISTS "Dolgozo vagy HR lathatja az elozo munkahelyeket" ON hr_elozo_munkahely;
DROP POLICY IF EXISTS "Dolgozo sajatjat vagy HR kezelheti az elozo munkahelyeket" ON hr_elozo_munkahely;

CREATE POLICY "Dolgozo vagy HR lathatja az elozo munkahelyeket" ON hr_elozo_munkahely
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR
  dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid()) OR
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda')
);

CREATE POLICY "Dolgozo sajatjat vagy HR kezelheti az elozo munkahelyeket" ON hr_elozo_munkahely
FOR ALL TO authenticated
USING (
  dolgozo_id = auth.uid() OR
  dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid()) OR
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda')
)
WITH CHECK (
  dolgozo_id = auth.uid() OR
  dolgozo_id IN (SELECT id FROM hr_dolgozo_adatlap WHERE id = auth.uid()) OR
  (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin', 'rendszergazda')
);

-- 5. hr_munkakor_leiras_verzio egyedi verzioszám kényszer (Párhuzamos duplikáció megelőzése)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hr_munkakor_leiras_verzio_munkakor_id_verzio_szam_key'
  ) THEN
    ALTER TABLE hr_munkakor_leiras_verzio ADD CONSTRAINT hr_munkakor_leiras_verzio_munkakor_id_verzio_szam_key UNIQUE (munkakor_id, verzio_szam);
  END IF;
END $$;

-- 6. Túlóra egyenleg negatívba futásának megakadályozása a jóváhagyási triggerben
CREATE OR REPLACE FUNCTION handle_tulora_felhasznalas_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Jóváhagyás esetén: egyenleg levonása (nem mehet 0 alá)
  IF OLD.statusz = 'jovahagyasra_var' AND NEW.statusz = 'jovahagyva' THEN
    UPDATE hr_tulora_egyenleg
    SET perc = GREATEST(0, hr_tulora_egyenleg.perc - NEW.perc),
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

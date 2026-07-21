-- ==========================================
-- 6.5 Szignálás, Kölcsönzés és Helyettesítés
-- ==========================================

-- 1. Helyettesítés Tábla
CREATE TABLE IF NOT EXISTS helyettesites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kilepo_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    helyettesito_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mettol TIMESTAMPTZ NOT NULL,
    meddig TIMESTAMPTZ NOT NULL,
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT helyettesites_check_dates CHECK (meddig > mettol)
);

ALTER TABLE helyettesites ENABLE ROW LEVEL SECURITY;
-- Mindenki láthatja a helyettesítéseket
DROP POLICY IF EXISTS "Helyettesites lathato mindenkinel" ON helyettesites;
CREATE POLICY "Helyettesites lathato mindenkinel" ON helyettesites FOR SELECT TO authenticated USING (true);
-- Magának mindenki beállíthat helyettest
DROP POLICY IF EXISTS "Sajat helyettesites beallitasa" ON helyettesites;
CREATE POLICY "Sajat helyettesites beallitasa" ON helyettesites FOR ALL TO authenticated USING (kilepo_user_id = auth.uid()) WITH CHECK (kilepo_user_id = auth.uid());


-- 2. Irat Fizikai Hely Tábla
CREATE TABLE IF NOT EXISTS irat_fizikai_hely (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    irat_id UUID NOT NULL REFERENCES irat(id) ON DELETE CASCADE UNIQUE,
    doboz VARCHAR(100),
    polc VARCHAR(100),
    megjegyzes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE irat_fizikai_hely ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fizikai hely megtekintese" ON irat_fizikai_hely;
CREATE POLICY "Fizikai hely megtekintese" ON irat_fizikai_hely FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Fizikai hely szerkesztese" ON irat_fizikai_hely;
CREATE POLICY "Fizikai hely szerkesztese" ON irat_fizikai_hely FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND szerepkor IN ('iktato', 'admin', 'rendszergazda'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND szerepkor IN ('iktato', 'admin', 'rendszergazda'))
);


-- 3. Irat Kölcsönzés Napló Tábla
DO $$ BEGIN
    CREATE TYPE kolcsonzes_statusz AS ENUM ('kikolcsonozve', 'visszahozva');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS irat_kolcsonzes_naplo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    irat_id UUID NOT NULL REFERENCES irat(id) ON DELETE CASCADE,
    kinek_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kiadta_user_id UUID NOT NULL REFERENCES auth.users(id),
    mikor_kiadva TIMESTAMPTZ DEFAULT NOW(),
    varhato_visszahozatal TIMESTAMPTZ NOT NULL,
    tenyleges_visszahozatal TIMESTAMPTZ,
    statusz kolcsonzes_statusz DEFAULT 'kikolcsonozve',
    megjegyzes TEXT
);

ALTER TABLE irat_kolcsonzes_naplo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kolcsonzes lathato mindenkinel" ON irat_kolcsonzes_naplo;
CREATE POLICY "Kolcsonzes lathato mindenkinel" ON irat_kolcsonzes_naplo FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Kolcsonzesek szerkesztese" ON irat_kolcsonzes_naplo;
CREATE POLICY "Kolcsonzesek szerkesztese" ON irat_kolcsonzes_naplo FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND szerepkor IN ('iktato', 'admin', 'rendszergazda'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND szerepkor IN ('iktato', 'admin', 'rendszergazda'))
);


-- 4. RLS Kiterjesztés Helyettesítésre (Ugyirat Select)
-- Ezzel a helyettesítő hozzáfér az ügyirathoz is
DROP POLICY IF EXISTS "Ugyirat megtekintes ABAC alapjan" ON ugyirat;

CREATE POLICY "Ugyirat megtekintes ABAC alapjan" ON ugyirat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      fp.szerepkor IN ('admin', 'iktato') OR
      ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
      EXISTS (
        SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
      ) OR
      -- Helyettesítési logika:
      EXISTS (
        SELECT 1 FROM helyettesites h
        JOIN ugyirat_hozzaferes uh2 ON uh2.user_id = h.kilepo_user_id
        WHERE h.helyettesito_user_id = auth.uid() 
          AND h.aktiv = true
          AND NOW() BETWEEN h.mettol AND h.meddig
          AND uh2.ugyirat_id = ugyirat.id
      )
    )
  )
);

-- Task 6.1: Szervezeti Egység és Profil táblák

CREATE TYPE user_szerepkor AS ENUM ('admin', 'iktato', 'ugyintezo');

CREATE TABLE szervezeti_egyseg (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nev TEXT NOT NULL,
    szulo_id UUID REFERENCES szervezeti_egyseg(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE felhasznalo_profil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nev TEXT NOT NULL,
    szerepkor user_szerepkor NOT NULL DEFAULT 'ugyintezo',
    szervezeti_egyseg_id UUID REFERENCES szervezeti_egyseg(id),
    max_minosites irat_minosites NOT NULL DEFAULT 'nyilt',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing users as admins so we don't lock ourselves out!
INSERT INTO felhasznalo_profil (id, nev, szerepkor, max_minosites)
SELECT id, email, 'admin', 'szigoruan_bizalmas' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Trigger to automatically create profile for new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.felhasznalo_profil (id, nev, szerepkor, max_minosites)
  VALUES (new.id, new.email, 'ugyintezo', 'nyilt');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Ügyirathoz szervezeti egység hozzárendelés (Department)
ALTER TABLE ugyirat ADD COLUMN szervezeti_egyseg_id UUID REFERENCES szervezeti_egyseg(id);

-- Ügyirat Explicit Hozzáférés (Explicit assignment)
CREATE TABLE ugyirat_hozzaferes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ugyirat_id UUID REFERENCES ugyirat(id) ON DELETE CASCADE,
    user_id UUID REFERENCES felhasznalo_profil(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ugyirat_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE szervezeti_egyseg ENABLE ROW LEVEL SECURITY;
ALTER TABLE felhasznalo_profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugyirat_hozzaferes ENABLE ROW LEVEL SECURITY;

-- Basic read policies for the new tables
CREATE POLICY "Szervezeti egyseget mindenki latja" ON szervezeti_egyseg FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profilokat mindenki latja" ON felhasznalo_profil FOR SELECT TO authenticated USING (true);
CREATE POLICY "Hozzafereseket mindenki latja" ON ugyirat_hozzaferes FOR SELECT TO authenticated USING (true);

-- Drop old unsafe policies for ugyirat and irat
DROP POLICY IF EXISTS "Minden autentikált felhasználó láthat minden ügyiratot" ON ugyirat;
DROP POLICY IF EXISTS "Minden autentikált felhasználó szerkeszthet minden ügyiratot" ON ugyirat;
DROP POLICY IF EXISTS "Minden autentikált felhasználó láthat minden iratot" ON irat;
DROP POLICY IF EXISTS "Minden autentikált felhasználó szerkeszthet minden iratot" ON irat;

-- Task 6.2: 4-dimenziós RLS Policy-k írása

-- Ugyirat Select Policy (Szerepkör OR Szervezeti egység OR Explicit)
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
      )
    )
  )
);

-- Irat Select Policy (Minősítés AND (Szerepkör OR Szervezeti egység OR Explicit))
CREATE POLICY "Irat megtekintes ABAC alapjan" ON irat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND irat.minosites <= fp.max_minosites
    AND (
      fp.szerepkor IN ('admin', 'iktato') OR
      EXISTS (
        SELECT 1 FROM ugyirat u
        WHERE u.id = irat.ugyirat_id
        AND (
          u.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
          EXISTS (
            SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = u.id AND uh.user_id = fp.id
          )
        )
      )
    )
  )
);

-- Kényelmi szabály: Iktatni/Szerkeszteni mindenki tud, amihez amúgy hozzáfér
CREATE POLICY "Ugyirat szerkesztes ABAC alapjan" ON ugyirat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND (
      fp.szerepkor IN ('admin', 'iktato') OR
      ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
      EXISTS (
        SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = ugyirat.id AND uh.user_id = fp.id
      )
    )
  )
);

CREATE POLICY "Irat szerkesztes ABAC alapjan" ON irat
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    AND irat.minosites <= fp.max_minosites
    AND (
      fp.szerepkor IN ('admin', 'iktato') OR
      EXISTS (
        SELECT 1 FROM ugyirat u
        WHERE u.id = irat.ugyirat_id
        AND (
          u.szervezeti_egyseg_id = fp.szervezeti_egyseg_id OR
          EXISTS (
            SELECT 1 FROM ugyirat_hozzaferes uh WHERE uh.ugyirat_id = u.id AND uh.user_id = fp.id
          )
        )
      )
    )
  )
);

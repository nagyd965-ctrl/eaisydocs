-- 20260817000002_kilepes_interju.sql
-- Kilépési interjú tábla az offboarding modulhoz

CREATE TABLE hr_kilepes_interju (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id            UUID NOT NULL REFERENCES hr_offboarding(id) ON DELETE CASCADE,

  -- Kilépés kategória és szabad szöveges oka
  kilepes_kategoria         TEXT,  -- 'jobb_ajanlat' | 'magnaleti' | 'elonletes' | 'vezeto' | 'munkakornyezet' | 'egyeb'
  kilepes_oka               TEXT,

  -- 1–5-ös értékelések
  altalanos_elegedettseg    INTEGER CHECK (altalanos_elegedettseg BETWEEN 1 AND 5),
  vezeto_kapcsolat          INTEGER CHECK (vezeto_kapcsolat BETWEEN 1 AND 5),
  munkakornyezet_ertekeles  INTEGER CHECK (munkakornyezet_ertekeles BETWEEN 1 AND 5),
  csapat_ertekeles          INTEGER CHECK (csapat_ertekeles BETWEEN 1 AND 5),

  -- Szabad szöveges kérdések
  mi_tetszett               TEXT,
  mit_valtoztatna           TEXT,

  -- Ajánlaná-e a céget?
  ajanlana                  BOOLEAN,

  -- Hova megy a dolgozó?
  kovetkezo_allomashely     TEXT,  -- 'versenyzo_ceg' | 'mas_ipar' | 'tanulas' | 'nyugdij' | 'vallalkozas' | 'nem_mondja_meg'

  rogzito_id                UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Egy offboardinghoz csak egy interjú tartozhat
CREATE UNIQUE INDEX hr_kilepes_interju_offboarding_idx ON hr_kilepes_interju(offboarding_id);

-- RLS
ALTER TABLE hr_kilepes_interju ENABLE ROW LEVEL SECURITY;

-- Csak HR szerepkör olvashatja és írhatja
CREATE POLICY "HR olvashat kilepes_interju" ON hr_kilepes_interju
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM felhasznalo_profil
      WHERE id = auth.uid()
        AND hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
  );

CREATE POLICY "HR irhat kilepes_interju" ON hr_kilepes_interju
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM felhasznalo_profil
      WHERE id = auth.uid()
        AND hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM felhasznalo_profil
      WHERE id = auth.uid()
        AND hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin')
    )
  );

-- updated_at automatikus frissítése
CREATE OR REPLACE FUNCTION update_kilepes_interju_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kilepes_interju_updated_at
  BEFORE UPDATE ON hr_kilepes_interju
  FOR EACH ROW EXECUTE FUNCTION update_kilepes_interju_updated_at();

-- 1. Védőeszköz-igény mező hozzáadása a munkakör táblához
ALTER TABLE hr_munkakor 
ADD COLUMN IF NOT EXISTS vedoeszkoz_igeny TEXT;

-- 2. Verzionált munkaköri leírás tábla
CREATE TABLE IF NOT EXISTS hr_munkakor_leiras_verzio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    munkakor_id UUID NOT NULL REFERENCES hr_munkakor(id) ON DELETE CASCADE,
    verzio_szam INTEGER NOT NULL DEFAULT 1,
    kiadas_datum DATE NOT NULL DEFAULT CURRENT_DATE,
    fajl_path TEXT NOT NULL,
    fajl_nev TEXT NOT NULL,
    feltolto_id UUID REFERENCES auth.users(id),
    megjegyzes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE hr_munkakor_leiras_verzio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR modulhoz tartozo felhasznalok latjak a munkakori leirasokat"
  ON hr_munkakor_leiras_verzio
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM felhasznalo_profil 
      WHERE id = auth.uid() 
      AND 'hr' = ANY(elerheto_modulok)
    )
  );

CREATE POLICY "HR es Admin kezelheti a munkakori leirasokat"
  ON hr_munkakor_leiras_verzio
  FOR ALL TO authenticated
  USING (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
  )
  WITH CHECK (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
  );

-- Audit trigger
CREATE TRIGGER audit_hr_munkakor_leiras_verzio
  AFTER INSERT OR UPDATE OR DELETE ON hr_munkakor_leiras_verzio
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

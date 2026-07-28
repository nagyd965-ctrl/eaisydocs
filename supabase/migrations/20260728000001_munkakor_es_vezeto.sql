-- Közvetlen vezető (önhivatkozó kulcs) hozzáadása a felhasználói profilhoz
ALTER TABLE felhasznalo_profil 
ADD COLUMN IF NOT EXISTS kozvetlen_vezeto_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL;

-- hr_munkakor tábla bővítése strukturált adatokkal és orvosi vizsg. adatokkal
ALTER TABLE hr_munkakor
ADD COLUMN IF NOT EXISTS feladatok_es_hataskorok JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS elvart_kompetenciak JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS orvosi_vizsgalat_tipus TEXT,
ADD COLUMN IF NOT EXISTS orvosi_vizsgalat_gyakorisag_ho INTEGER;

-- Új tábla a munkaköri leírások megismerésének nyugtázására
CREATE TABLE IF NOT EXISTS hr_munkakor_nyugtazas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    munkakor_id UUID NOT NULL REFERENCES hr_munkakor(id) ON DELETE CASCADE,
    nyugtazva_mikor TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS a hr_munkakor_nyugtazas táblára
ALTER TABLE hr_munkakor_nyugtazas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Felhasználók láthatják és létrehozhatják a saját nyugtázásaikat"
  ON hr_munkakor_nyugtazas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "HR láthatja mindenki nyugtázását"
  ON hr_munkakor_nyugtazas
  FOR SELECT TO authenticated
  USING (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
  );

-- Trigger az audit naplóhoz a hr_munkakor_nyugtazas táblára
CREATE TRIGGER audit_hr_munkakor_nyugtazas
  AFTER INSERT OR UPDATE OR DELETE ON hr_munkakor_nyugtazas
  FOR EACH ROW EXECUTE PROCEDURE log_audit_event();

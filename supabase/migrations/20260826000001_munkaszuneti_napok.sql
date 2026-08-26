-- 20260826000001_munkaszuneti_napok.sql
-- Magyar munkaszüneti napok és áthelyezett munkanapok nyilvántartása.
-- Az adatok évente frissítendők (admin felületen vagy migrációval).

CREATE TABLE IF NOT EXISTS hr_munkaszuneti_nap (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum      DATE NOT NULL UNIQUE,
  megnevezes TEXT NOT NULL,
  -- true = ez a nap nem munkaszüneti, hanem LEDOLGOZANDÓ (áthelyezett munkanap)
  -- pl. 2025-ben aug. 2. szombat ledolgozandó az aug. 20. (sze) helyett
  athelye_munkanap BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hr_munkaszuneti_nap IS
  'Magyar törvényes munkaszüneti napok és áthelyezett munkanapok. Évente karbantartandó.';

ALTER TABLE hr_munkaszuneti_nap ENABLE ROW LEVEL SECURITY;

-- Mindenki olvashatja (szükséges a szabadságkalkulátorhoz és timesheethez)
CREATE POLICY "Mindenki olvashatja a munkaszüneti napokat"
  ON hr_munkaszuneti_nap FOR SELECT TO authenticated USING (true);

-- Csak HR/Admin módosíthat
CREATE POLICY "HR kezeli a munkaszüneti napokat"
  ON hr_munkaszuneti_nap FOR ALL TO authenticated
  USING (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid())
    IN ('hr_munkatars', 'hr_vezeto', 'admin')
  )
  WITH CHECK (
    (SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid())
    IN ('hr_munkatars', 'hr_vezeto', 'admin')
  );

-- ─── 2025 ────────────────────────────────────────────────────────────────────
INSERT INTO hr_munkaszuneti_nap (datum, megnevezes, athelye_munkanap) VALUES
  ('2025-01-01', 'Újév napja', false),
  ('2025-03-15', 'Nemzeti ünnep', false),
  ('2025-04-18', 'Nagypéntek', false),
  ('2025-04-21', 'Húsvét hétfő', false),
  ('2025-05-01', 'A munka ünnepe', false),
  ('2025-06-09', 'Pünkösd hétfő', false),
  ('2025-08-20', 'Az államalapítás ünnepe', false),
  ('2025-10-23', 'Az 1956-os forradalom ünnepe', false),
  ('2025-11-01', 'Mindenszentek napja', false),
  ('2025-12-25', 'Karácsony első napja', false),
  ('2025-12-26', 'Karácsony második napja', false)
ON CONFLICT (datum) DO NOTHING;

-- ─── 2026 ────────────────────────────────────────────────────────────────────
INSERT INTO hr_munkaszuneti_nap (datum, megnevezes, athelye_munkanap) VALUES
  ('2026-01-01', 'Újév napja', false),
  ('2026-03-15', 'Nemzeti ünnep', false),
  ('2026-04-03', 'Nagypéntek', false),
  ('2026-04-06', 'Húsvét hétfő', false),
  ('2026-05-01', 'A munka ünnepe', false),
  ('2026-05-25', 'Pünkösd hétfő', false),
  ('2026-08-20', 'Az államalapítás ünnepe', false),
  ('2026-10-23', 'Az 1956-os forradalom ünnepe', false),
  ('2026-11-01', 'Mindenszentek napja', false),
  ('2026-12-25', 'Karácsony első napja', false),
  ('2026-12-26', 'Karácsony második napja', false)
ON CONFLICT (datum) DO NOTHING;

-- ─── 2027 ────────────────────────────────────────────────────────────────────
INSERT INTO hr_munkaszuneti_nap (datum, megnevezes, athelye_munkanap) VALUES
  ('2027-01-01', 'Újév napja', false),
  ('2027-03-15', 'Nemzeti ünnep', false),
  ('2027-03-26', 'Nagypéntek', false),
  ('2027-03-29', 'Húsvét hétfő', false),
  ('2027-05-01', 'A munka ünnepe', false),
  ('2027-05-17', 'Pünkösd hétfő', false),
  ('2027-08-20', 'Az államalapítás ünnepe', false),
  ('2027-10-23', 'Az 1956-os forradalom ünnepe', false),
  ('2027-11-01', 'Mindenszentek napja', false),
  ('2027-12-25', 'Karácsony első napja', false),
  ('2027-12-26', 'Karácsony második napja', false)
ON CONFLICT (datum) DO NOTHING;

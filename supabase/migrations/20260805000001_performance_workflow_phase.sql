-- Teljesítményértékelés workflow fázis mező hozzáadása
-- A jelenlegi rendszerben nincs explicit workflow fázis, csak az önértékelés/értékelés szöveg jelenlétéből
-- lehet kikövetkeztetni, hogy hol tart a folyamat. Ez a mező expliciten kezeli az 5 lépéses workflow-t.

ALTER TABLE hr_teljesitmeny 
ADD COLUMN IF NOT EXISTS workflow_fazis TEXT DEFAULT 'celkituzes';

-- Meglévő rekordok workflow fázisának beállítása a meglévő adatok alapján
UPDATE hr_teljesitmeny 
SET workflow_fazis = CASE 
  WHEN ertekeles_lezarva_datum IS NOT NULL THEN 'lezart'
  WHEN ertekeles_szovege IS NOT NULL THEN 'vezetoi_ertekeles'
  WHEN onertekeles_szovege IS NOT NULL THEN 'onertekeles'
  ELSE 'celkituzes'
END
WHERE workflow_fazis IS NULL OR workflow_fazis = 'celkituzes';

-- Megbeszélés dátuma mező
ALTER TABLE hr_teljesitmeny 
ADD COLUMN IF NOT EXISTS megbeszeles_datum TIMESTAMPTZ;

-- Megbeszélés jegyzőkönyv (opcionális szöveges mező)
ALTER TABLE hr_teljesitmeny 
ADD COLUMN IF NOT EXISTS megbeszeles_megjegyzes TEXT;

-- Önértékelés mező hozzáadása a KPI táblához
ALTER TABLE hr_teljesitmeny
ADD COLUMN IF NOT EXISTS onertekeles_szovege TEXT;

-- Vezetői értékelés dátuma a KPI táblához (opcionális, de jó ha van)
ALTER TABLE hr_teljesitmeny
ADD COLUMN IF NOT EXISTS ertekeles_lezarva_datum TIMESTAMPTZ;

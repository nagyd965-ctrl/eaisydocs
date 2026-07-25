-- Teljesítményértékelés tábla kiegészítése a KPI-ok jobb követéséhez

-- Mivel a tábla már létezik, ALTER TABLE-t használunk.
ALTER TABLE hr_teljesitmeny
ADD COLUMN IF NOT EXISTS celkituzes TEXT,
ADD COLUMN IF NOT EXISTS hatarido DATE;

-- Mivel az ertekeles_datuma eddig NOT NULL volt, és KPI felvételekor még nincs értékelve, 
-- érdemes lehet eltávolítani a NOT NULL megszorítást, vagy defaultot adni.
ALTER TABLE hr_teljesitmeny
ALTER COLUMN ertekeles_datuma DROP NOT NULL;

-- Bővíthetjük a státusz enum-ot ha szükséges, de egyelőre jó lesz a meglévő is (vagy text alapúra cseréljük)
-- kpi_statusz enum: 'aktiv', 'teljesitve', 'nem_teljesult', 'felfuggesztve'

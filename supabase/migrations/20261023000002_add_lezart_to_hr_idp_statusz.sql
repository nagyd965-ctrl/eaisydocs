-- 20261023000002_add_lezart_to_hr_idp_statusz.sql
-- Hozzáadjuk a 'lezart' értéket a hr_idp_statusz enum típushoz a tervek lezárhatóságához

ALTER TYPE hr_idp_statusz ADD VALUE IF NOT EXISTS 'lezart';

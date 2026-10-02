-- Migration: hr_t1041_bejelentes kiegészítése változás bejelentési adatokkal (V)
-- NAV T1041 13-as pótlap 7. rovat (Változás időpontja) és a változás jellege (munkaidő, munkakör, szünetelés)

ALTER TABLE public.hr_t1041_bejelentes
    ADD COLUMN IF NOT EXISTS valtozas_datuma DATE,
    ADD COLUMN IF NOT EXISTS valtozas_jellege TEXT;

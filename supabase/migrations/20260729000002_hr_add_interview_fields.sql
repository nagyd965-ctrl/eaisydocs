-- Migráció: Interjú adatok hozzáadása a toborzáshoz
-- Fájl: 20260729000002_hr_add_interview_fields.sql

ALTER TABLE public.hr_toborzas
ADD COLUMN IF NOT EXISTS interju_idopont TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interju_helyszin TEXT,
ADD COLUMN IF NOT EXISTS sms_emlekezteto_kerve BOOLEAN DEFAULT false;

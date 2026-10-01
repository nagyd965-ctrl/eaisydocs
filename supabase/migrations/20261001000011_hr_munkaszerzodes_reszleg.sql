-- Migration: Add reszleg to hr_munkaszerzodes
-- Enables storing the associated organizational unit alongside the job title
ALTER TABLE public.hr_munkaszerzodes
ADD COLUMN IF NOT EXISTS reszleg TEXT;

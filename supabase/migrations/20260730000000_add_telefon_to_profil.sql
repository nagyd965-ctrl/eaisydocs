-- 20260730000000_add_telefon_to_profil.sql

ALTER TABLE public.felhasznalo_profil
ADD COLUMN IF NOT EXISTS telefon TEXT;

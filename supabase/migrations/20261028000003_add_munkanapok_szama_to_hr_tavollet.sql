-- Add munkanapok_szama and megjegyzes to hr_tavollet
ALTER TABLE public.hr_tavollet
  ADD COLUMN IF NOT EXISTS munkanapok_szama integer,
  ADD COLUMN IF NOT EXISTS megjegyzes text;

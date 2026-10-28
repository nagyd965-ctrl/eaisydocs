-- Add elutasitas_oka to hr_tavollet and hr_tulora_felhasznalás and backfill from hr_esemeny_naplo
ALTER TABLE public.hr_tavollet
  ADD COLUMN IF NOT EXISTS elutasitas_oka TEXT;

ALTER TABLE public."hr_tulora_felhasznalás"
  ADD COLUMN IF NOT EXISTS elutasitas_oka TEXT;

CREATE OR REPLACE VIEW public.hr_tulora_felhasznalas AS
  SELECT * FROM public."hr_tulora_felhasznalás";

-- Backfill existing rejected leave reasons from hr_esemeny_naplo if available
UPDATE public.hr_tavollet t
SET elutasitas_oka = SUBSTRING(n.megjegyzes FROM 'Indoklás:\s*(.+)$')
FROM public.hr_esemeny_naplo n
WHERE n.entitas_tipus = 'hr_tavollet'
  AND n.entitas_id::text = t.id::text
  AND t.statusz = 'elutasitva'
  AND t.elutasitas_oka IS NULL
  AND n.megjegyzes LIKE '%Indoklás:%';

-- Backfill existing rejected overtime reasons from hr_esemeny_naplo if available
UPDATE public."hr_tulora_felhasznalás" o
SET elutasitas_oka = SUBSTRING(n.megjegyzes FROM 'Indoklás:\s*(.+)$')
FROM public.hr_esemeny_naplo n
WHERE n.entitas_tipus = 'hr_tulora_felhasznalás'
  AND n.entitas_id::text = o.id::text
  AND o.statusz = 'elutasitva'
  AND o.elutasitas_oka IS NULL
  AND n.megjegyzes LIKE '%Indoklás:%';

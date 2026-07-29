-- Új csatorna oszlop hozzáadása, ha még nincs
ALTER TABLE public.ertesitesi_szabaly ADD COLUMN IF NOT EXISTS csatorna text[] DEFAULT ARRAY['in_app', 'email']::text[];

-- Új esemény típusok és kinek párosítások beszúrása
INSERT INTO public.ertesitesi_szabaly (esemeny_tipus, kinek, aktiv, csatorna) VALUES
('orvosi_vizsgalat_lejarat', 'HR, Érintett', true, ARRAY['in_app', 'email']::text[]),
('tanulmanyi_szerzodes_lejarat', 'HR', true, ARRAY['in_app', 'email']::text[]),
('hatarozott_szerzodes_lejarat', 'HR, Vezető', false, ARRAY['in_app', 'email']::text[]),
('probaido_lejarat', 'HR, Vezető', true, ARRAY['in_app']::text[]),
('t1041_bejelentes', 'HR', true, ARRAY['in_app', 'email']::text[]),
('szabadsag_jovahagyas', 'Közvetlen Vezető', true, ARRAY['in_app', 'email']::text[]),
('teljesitmeny_ertekeles', 'Érintett, Vezető', true, ARRAY['in_app', 'email']::text[])
ON CONFLICT (esemeny_tipus, kinek) DO UPDATE 
SET csatorna = EXCLUDED.csatorna;

-- Migration: hr_offboarding bővítése hivatalos megszüntetési adatokkal és eszköz visszavétellel
-- Mt. 64–85. § szerinti munkaviszony-megszüntetés és Mt. 179. § eszköz elszámolás

ALTER TABLE public.hr_offboarding
    ADD COLUMN IF NOT EXISTS megszunes_modja TEXT DEFAULT 'kozos_megegyezes',
    ADD COLUMN IF NOT EXISTS indoklas TEXT,
    ADD COLUMN IF NOT EXISTS utolso_munkaban_toltott_nap TEXT,
    ADD COLUMN IF NOT EXISTS felmentesi_ido_nap INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS megvaltott_szabadsag_nap NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vegkielegites_osszeg NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reszleg TEXT,
    ADD COLUMN IF NOT EXISTS munkakor TEXT,
    ADD COLUMN IF NOT EXISTS szerzodes_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS eszkoz_elszamolas_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS t1041_nyugta_url TEXT;

-- Munkahelyi eszközök kapcsolása offboardinghoz
ALTER TABLE public.hr_munkahelyi_eszkoz
    ADD COLUMN IF NOT EXISTS offboarding_id UUID REFERENCES public.hr_offboarding(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_eszkoz_offboarding ON public.hr_munkahelyi_eszkoz(offboarding_id);

-- T1041 kapcsolása offboardinghoz
ALTER TABLE public.hr_t1041_bejelentes
    ADD COLUMN IF NOT EXISTS offboarding_id UUID REFERENCES public.hr_offboarding(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS jogviszony_vege DATE;

CREATE INDEX IF NOT EXISTS idx_hr_t1041_offboarding_id ON public.hr_t1041_bejelentes(offboarding_id);

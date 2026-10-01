-- 20261001000004_hr_fegyelmi_filing.sql
-- Mt. 56. § (fegyelmi intézkedések) és Mt. 179. § (kártérítés) határozatok dokumentumkezelése és eaisyDocs iktatása

ALTER TABLE public.hr_fegyelmi
  ADD COLUMN IF NOT EXISTS hatarozat_szam TEXT,
  ADD COLUMN IF NOT EXISTS kar_osszeg NUMERIC,
  ADD COLUMN IF NOT EXISTS reszletfizetes_leiras TEXT,
  ADD COLUMN IF NOT EXISTS jogorvoslat_hatarido DATE,
  ADD COLUMN IF NOT EXISTS atvetel_datuma DATE,
  ADD COLUMN IF NOT EXISTS dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_fegyelmi_dokumentum_id ON public.hr_fegyelmi(dokumentum_id);
CREATE INDEX IF NOT EXISTS idx_hr_fegyelmi_iktatoszam ON public.hr_fegyelmi(iktatoszam);
CREATE INDEX IF NOT EXISTS idx_hr_fegyelmi_ugyirat_id ON public.hr_fegyelmi(ugyirat_id);

COMMENT ON COLUMN public.hr_fegyelmi.hatarozat_szam IS 'Hivatalos munkáltatói határozatszám (pl. FEGY-2026/001)';
COMMENT ON COLUMN public.hr_fegyelmi.kar_osszeg IS 'Munkavállaló által okozott és megfizetendő kár összege (Mt. 179. §)';
COMMENT ON COLUMN public.hr_fegyelmi.reszletfizetes_leiras IS 'Kártérítés levonási vagy részletfizetési megállapodásának leírása';
COMMENT ON COLUMN public.hr_fegyelmi.jogorvoslat_hatarido IS 'Mt. 285. § szerinti 30 napos bírósági felülvizsgálati jogorvoslat határideje';
COMMENT ON COLUMN public.hr_fegyelmi.atvetel_datuma IS 'A munkáltatói határozat munkavállaló általi személyes vagy postai átvételének napja';
COMMENT ON COLUMN public.hr_fegyelmi.dokumentum_id IS 'Kapcsolódó HR dokumentum hivatkozás';
COMMENT ON COLUMN public.hr_fegyelmi.fajl_url IS 'Generált vagy feltöltött munkáltatói fegyelmi határozat PDF tárolási útvonala (irat_files)';
COMMENT ON COLUMN public.hr_fegyelmi.iktatoszam IS 'Hivatalos eaisyDocs gap-mentes iktatószám a személyi dossziéban';

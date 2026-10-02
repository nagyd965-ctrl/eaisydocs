-- Migration: hr_offboarding bővítése kilépő igazolással (Mt. 80. §)
-- Munkáltatói igazolás a munkaviszony megszűnésekor és kilépő iratok átadás-átvételi jegyzőkönyve

ALTER TABLE public.hr_offboarding
    ADD COLUMN IF NOT EXISTS kilepo_igazolas_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS kilepo_igazolas_adatok JSONB DEFAULT '{}'::jsonb;

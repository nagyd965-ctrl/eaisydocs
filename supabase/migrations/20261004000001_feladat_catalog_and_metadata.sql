-- ====================================================================
-- EAISYDOCS MIGRATION: Feladatkatalógus sablonok és feladat metaadatok
-- Backlog: 8.1, 8.2 | ADR: A-031 | PRD: P-046
-- ====================================================================

-- 1. Bővítjük a feladat_allapot enumot 'varakozik' értékkel (ha még nem szerepel)
DO $$
BEGIN
    ALTER TYPE public.feladat_allapot ADD VALUE IF NOT EXISTS 'varakozik';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Metaadat oszlopok hozzáadása a feladat táblához
ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS kategoria TEXT;
ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS prioritas TEXT DEFAULT 'normal';
ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS indoklas TEXT;
ALTER TABLE public.feladat ADD COLUMN IF NOT EXISTS reszletek TEXT;

-- Index a kategóriára és prioritásra a gyors lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_feladat_kategoria ON public.feladat(kategoria);
CREATE INDEX IF NOT EXISTS idx_feladat_prioritas ON public.feladat(prioritas);

-- 3. Rendszerbeállítások biztosítása az egyéni feladatsablonok tárolásához
INSERT INTO public.rendszer_beallitas (kulcs, ertek, leiras)
VALUES (
    'feladat_sablonok',
    '[]'::jsonb,
    'Egyéni és vállalati feladatsablonok a feladatkatalógushoz (Backlog 8.1, 8.2).'
)
ON CONFLICT (kulcs) DO NOTHING;

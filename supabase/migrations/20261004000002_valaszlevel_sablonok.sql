-- ====================================================================
-- EAISYDOCS MIGRATION: Válaszlevél és kimenő irat sablonok katalógusa
-- Backlog: Expediálás | ADR: A-031 | PRD: P-048
-- ====================================================================

-- Rendszerbeállítások biztosítása az egyéni válaszlevél-sablonok tárolásához
INSERT INTO public.rendszer_beallitas (kulcs, ertek, leiras)
VALUES (
    'valaszlevel_sablonok',
    '[]'::jsonb,
    'Egyéni és vállalati válaszlevél- és iratsablonok az expediálási modulhoz.'
)
ON CONFLICT (kulcs) DO NOTHING;

-- Migration: 20261009000002_simplify_prompt_rules_categories.sql
-- Description: Leegyszerűsíti a szabály kategóriákat a 3 valós iratkezelési csoportra:
-- 1. iktatas (Iktatás és Besorolás)
-- 2. felelos (Felelős és Részleg)
-- 3. penzugy (Pénzügyi megjegyzés)
-- + altalanos (Általános szabály)

-- 1. Régi értékek migrálása
UPDATE public.company_prompt_rules 
SET category = 'penzugy' 
WHERE category IN ('konyveles', 'afa', 'szamla');

UPDATE public.company_prompt_rules 
SET category = 'felelos' 
WHERE category IN ('koltseghely', 'szolgaltatas');

UPDATE public.company_prompt_rules 
SET category = 'iktatas' 
WHERE category IN ('hatosag', 'eszkoz');

-- 2. Régi CHECK constraint eltávolítása és új hozzáadása
ALTER TABLE public.company_prompt_rules 
DROP CONSTRAINT IF EXISTS company_prompt_rules_category_check;

ALTER TABLE public.company_prompt_rules 
ADD CONSTRAINT company_prompt_rules_category_check 
CHECK (category IN ('iktatas', 'felelos', 'penzugy', 'altalanos'));

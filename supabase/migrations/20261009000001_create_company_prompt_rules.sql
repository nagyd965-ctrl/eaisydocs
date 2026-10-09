-- Migration: 20261009000001_create_company_prompt_rules.sql
-- Description: Create company_prompt_rules table for company-specific AI accounting and filing rules with multi-tenant RLS isolation.

CREATE TABLE IF NOT EXISTS public.company_prompt_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_prompt TEXT NOT NULL,
    category TEXT DEFAULT 'szamla',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexek a gyors lekérdezésekhez és vállalati szűrésekhez
CREATE INDEX IF NOT EXISTS idx_company_prompt_rules_company_active 
    ON public.company_prompt_rules(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_company_prompt_rules_created_at 
    ON public.company_prompt_rules(created_at DESC);

-- RLS (Row Level Security) bekapcsolása
ALTER TABLE public.company_prompt_rules ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE multi-tenancy szűrés (adatbázis szintű adatelkülönítés a user_has_company_access függvénnyel)
DROP POLICY IF EXISTS "tenant_isolation_restrictive" ON public.company_prompt_rules;
CREATE POLICY "tenant_isolation_restrictive" ON public.company_prompt_rules
    AS RESTRICTIVE 
    USING (public.user_has_company_access(company_id));

-- Permissive házirend a hitelesített felhasználóknak (ha van jogosultságuk a céghez)
DROP POLICY IF EXISTS "company_prompt_rules_auth_all" ON public.company_prompt_rules;
CREATE POLICY "company_prompt_rules_auth_all" ON public.company_prompt_rules
    FOR ALL 
    TO authenticated 
    USING (public.user_has_company_access(company_id))
    WITH CHECK (public.user_has_company_access(company_id));

-- Service role teljes körű hozzáférés (háttér workerekhez és cron feladatokhoz)
DROP POLICY IF EXISTS "company_prompt_rules_service_role_all" ON public.company_prompt_rules;
CREATE POLICY "company_prompt_rules_service_role_all" ON public.company_prompt_rules
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

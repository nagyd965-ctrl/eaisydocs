-- Migration: 20261009000003_create_company_filing_rules.sql
-- Description: Létrehozza a determinisztikus számla- és iratiktatási szabályok tábláját (company_filing_rules)
-- Visibill-mintára az eaisyDocs mezőihez illesztve: Cél Szervezeti Egység, Cél Irattári Tétel, Cél Típus, Tárgy előtag.

CREATE TABLE IF NOT EXISTS public.company_filing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    search_pattern TEXT,
    partner_name TEXT,
    partner_tax_number TEXT,
    match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains', 'exact', 'starts_with')),
    target_department_id UUID REFERENCES public.szervezeti_egyseg(id) ON DELETE SET NULL,
    target_irattari_tetel_id UUID REFERENCES public.irattari_terv(id) ON DELETE SET NULL,
    target_document_type TEXT,
    target_subject_prefix TEXT,
    scope TEXT NOT NULL DEFAULT 'company' CHECK (scope IN ('company', 'all')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_company_filing_rules_company_id ON public.company_filing_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_company_filing_rules_is_active ON public.company_filing_rules(is_active);

-- RLS engedélyezése
ALTER TABLE public.company_filing_rules ENABLE ROW LEVEL SECURITY;

-- 1. Restrictive izolációs policy
DROP POLICY IF EXISTS tenant_isolation_filing_rules_restrictive ON public.company_filing_rules;
CREATE POLICY tenant_isolation_filing_rules_restrictive ON public.company_filing_rules
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (
        public.user_has_company_access(company_id)
        OR scope = 'all'
    )
    WITH CHECK (
        public.user_has_company_access(company_id)
    );

-- 2. Permissive CRUD policy
DROP POLICY IF EXISTS tenant_filing_rules_access_permissive ON public.company_filing_rules;
CREATE POLICY tenant_filing_rules_access_permissive ON public.company_filing_rules
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

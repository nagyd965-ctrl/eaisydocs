-- Migration: 20261008000004_company_logo_and_filing_prefix.sql
-- Description: Céglogó URL és cég-specifikus iktatókönyv előtag (filing_prefix) hozzáadása a companies táblához.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS filing_prefix TEXT DEFAULT 'DOCS';

-- Meglévő cégek default prefixének biztosítása
UPDATE public.companies 
SET filing_prefix = 'DOCS' 
WHERE filing_prefix IS NULL OR TRIM(filing_prefix) = '';

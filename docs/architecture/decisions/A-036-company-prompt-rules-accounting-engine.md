# A-036: Céges Iktatási és Könyvelési Szabálymotor (Filing & Prompt Rules Engine)

**Dátum:** 2026-10-09  
**Hatókör:** `[Docs]` (eaisyDocs)  
**Státusz:** Decided  

## 1. Döntési Kontextus és Követelmények
A felhasználók számára a többcéges működés (Multi-Tenancy) keretében két szintű szabályozási mechanizmust biztosítunk a beérkező iratok és számlák automatizálására:
1. **Determinisztikus (kőbe vésett) számla- és iratiktatási szabályok (Visibill minta alapján):** Pontos szövegminta vagy partner/adószám egyezés esetén 100%-os biztonsággal és azonnal (AI tokenfogyasztás nélkül) hozzárendeli a cél Szervezeti Egységet (Osztályt), Irattári tételszámot (megőrzési időt), Dokumentumtípust és Tárgy előtagot.
2. **AI Prompt könyvtár (Gemini 2.5 Flash):** Természetes nyelven megfogalmazott intelligens direktívák az összetett, nem sablonos iratok és határozatok automatikus osztályozásához.

## 2. Technikai Megoldás és Architektúra

### Adatbázis Séma és Táblák
1. `public.company_filing_rules` (Determinisztikus szabályok):
```sql
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
```

2. `public.company_prompt_rules` (AI Prompt direktívák):
```sql
CREATE TABLE IF NOT EXISTS public.company_prompt_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_prompt TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'altalanos' CHECK (category IN ('iktatas', 'felelos', 'penzugy', 'altalanos')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### RLS és Multi-Tenant Izoláció
- Mindkét táblára szigorú Restrictive RLS került (`tenant_isolation_filing_rules_restrictive`, `tenant_isolation_restrictive`), amely a meglévő `public.user_has_company_access(company_id)` biztonsági függvénnyel és a globális `scope = 'all'` vizsgálattal biztosítja az adatszeparációt.

### Iktatási Kiértékelési Sorrend (Prioritási Lánc)
Az `executeAiMetadataExtraction` (`src/app/inbox/filing-actions.ts`) folyamatában:
1. **1. szint:** A `company_filing_rules` determinisztikus szabálymotorja (`matchFilingRules` a `src/utils/filing-rules-engine.ts`-ből) megvizsgálja az irat szövegét, az azonosított partnert és adószámot. Ha talál aktív szabályt, azonnal érvényesíti az osztályt, irattári tételszámot, típust és tárgy előtagot.
2. **2. szint:** Ha a szabályok valamely mezőt nem határoztak meg, a Gemini 2.5 Flash az aktív céges `company_prompt_rules` instrukciók alapján pótolja a hiányzó metaadatokat.

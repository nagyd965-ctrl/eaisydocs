# A-105: [Docs] eaisyDocs 2. Csomag — Több-Céges Egyediségi Megszorítások (`UNIQUE (company_id, ...)`), `esemeny_naplo` Automatikus Cégfeloldó Trigger és Alkalmazásszintű `company_id` Izoláció

- **Dátum:** 2026-11-02
- **Hatókör:** `[Docs]`
- **Státusz:** `Decided`
- **Kapcsolódó döntések és fájlok:**
  - [P-134](../../product/decisions/P-134-docs-multicompany-search-inbox-filing-and-contract-template-isolation-ux.md)
  - `supabase/migrations/20261102000001_docs_multicompany_unique_constraints_and_audit_company.sql`
  - `src/app/search/actions.ts`
  - `src/app/dossiers/[id]/actions.ts`
  - `src/app/dossiers/[id]/template-actions.ts`
  - `src/app/inbox/[id]/page.tsx`
  - `src/app/inbox/filing-actions.ts`
  - `src/utils/antecedent-matcher.ts`
  - `src/app/rules/page.tsx`
  - `src/app/partners/contract-actions.ts`
  - `src/app/archive/disposal-actions.ts`

## 1. Kontextus és Problémafelvetés

Az `eaisyDocs` 2026. november 2-i rendszerszintű mélyelemzése (`docs/eaisydocs-deep-analysis-20261102.md`) 6 olyan, a többcéges (`multi-company`) napi használatot közvetlenül érintő hibát tárt fel (2. Csomag: Task 2.1 – 2.6), amelyek a felületen azonnal reprodukálhatóak voltak:

1. **Globális `UNIQUE` megszorítások (`irattari_terv`, `ugy`, `ugyirat`, `partner`):** Az alapadatbázis-séma globális egyediséget követelt meg az `irattari_terv (tetelszam)`, `ugy (ugyszam)`, `ugyirat (iktatoszam)` és a tisztított adószámon (`idx_partner_clean_adoszam`). Emiatt két külön cég nem vehetett fel azonos tételszámot (pl. `1.1`) és nem rögzíthette ugyanazt a szállítót azonos adószámmal (`23505 duplicate key`).
2. **Statikus `DEFAULT` `company_id` az `esemeny_naplo` táblán:** A `20261008000001_multitenancy_companies.sql` migráció statikus `DEFAULT` értéket (`Think AI Kft.`) állított be az `esemeny_naplo.company_id` oszlopra. Következésképpen minden olyan `esemeny_naplo` beszúrás, amely nem adott meg explicit `company_id`-t (beleértve a `log_audit_event()` adatbázis-triggert is), a második vagy harmadik cég eseményeit is a `Think AI Kft.` naplójába írta.
3. **Kimenő iratok és válaszlevelek hiányzó `company_id`-ja:** Az `uploadReply`, `generateAndExpediteReply` és `generateFromTemplate` műveletek `company_id` megadása nélkül szúrták be az új kimenő `irat` rekordokat.
4. **Kereső (`/search`), gyorskereső (`Ctrl+K`), `/inbox/[id]`, AI metaadat-kinyerő, előzmény-párosító és `/rules` hiányzó cégszűrése:** A `search_iratok_hybrid` RPC és a keresési actionök, a bejövő iktatópanel törzsadat-lekérdezései (`szervezeti_egyseg`, `partner`), az AI prompt-összeállító (`executeAiMetadataExtraction`) és az előzmény-kereső (`findAntecedentSuggestion`) nem szűrtek a dokumentum ill. az aktív munkamenet `company_id`-jára.
5. **Globális szerződéssablon-kulcs és selejtezési csomag `company_id`:** Az egyéni üzleti szerződéssablonok globális `"szerzodes_sablonok"` kulcs alatt tárolódtak a `rendszer_beallitas` táblában, a `approveDisposal` pedig részleges vagy új csomag létrehozásakor kihagyta a `company_id` mezőt.

## 2. Architektúra Döntés

### 2.1. Cég-specifikus egyediségi megszorítások (`20261102000001`)
- `irattari_terv`: A globális `irattari_terv_tetelszam_key` helyére a `UNIQUE (company_id, tetelszam)` (`irattari_terv_company_tetelszam_key`) megszorítás lépett.
- `ugy`: A globális `ugy_ugyszam_key` helyére a `UNIQUE (company_id, ugyszam)` (`ugy_company_ugyszam_key`) megszorítás lépett.
- `ugyirat`: A globális `ugyirat_iktatoszam_key` helyére a `UNIQUE (company_id, iktatoszam)` (`ugyirat_company_iktatoszam_key`) megszorítás lépett.
- `partner`: A globális `idx_partner_clean_adoszam` index helyére a `(company_id, regexp_replace(adoszam, '[-\s]', '', 'g'))` cég-specifikus egyedi index lépett.

### 2.2. Dinamikus `esemeny_naplo.company_id` feloldó trigger és visszamenőleges szinkronizáció
- Eltávolítottuk az `esemeny_naplo.company_id` statikus `DEFAULT` értékét (`ALTER TABLE public.esemeny_naplo ALTER COLUMN company_id DROP DEFAULT`).
- Létrehoztuk a `public.resolve_esemeny_naplo_company_id()` `BEFORE INSERT` triggert, amely minden beszúrásnál:
  1. Feloldja a célentitás (`ugyirat`, `irat`, `ugy`, `partner`, `feladat`, `selejtezes_csomag`, `irattari_terv`, `szervezeti_egyseg`) tényleges `company_id`-ját az `entitas_id` alapján.
  2. Ha az entitás már nem érhető el (pl. törlés), kiolvassa az `uj_ertek` vagy `elozo_ertek` JSONB mezőből a `company_id`-t.
  3. Végső fallbackként a felhasználó elsődleges cégtagságát (`company_members`) használja.
- Frissítettük a `public.log_audit_event()` triggert is, és visszamenőlegesen (`UPDATE ... FROM`) összehangoltuk a meglévő `esemeny_naplo` sorok `company_id` értékét a célentitásokkal.

### 2.3. Kereső, Kimenő irat, Iktatópanel, AI kinyerő és Szerződéssablonok cégszűrése
- A `public.search_iratok_hybrid` RPC opcionális `p_company_id UUID DEFAULT NULL` paramétert kapott, a `cascade_ugyirat_fts_update()` trigger pedig közvetlen `PERFORM update_irat_fts_vector()` helyett `UPDATE public.irat SET targy = targy WHERE ugyirat_id = NEW.id` utasítással frissíti a keresővektorokat.
- Az `uploadReply`, `generateAndExpediteReply` és `generateFromTemplate` átörökíti a szülő `ugyirat.company_id` értékét az új kimenő `irat` rekordba.
- Az `/inbox/[id]`, `/rules`, `executeAiMetadataExtraction` és `findAntecedentSuggestion` minden `szervezeti_egyseg`, `irattari_terv`, `partner` és `ugyirat` lekérdezést a dokumentum ill. az aktív cég `company_id`-jára szűr.
- A `contract-actions.ts` az egyéni szerződéssablonokat a `szerzodes_sablonok:${activeCompanyId}` kulcs alatt tárolja (visszaolvasási fallbackkel a globális `"szerzodes_sablonok"` kulcsra).

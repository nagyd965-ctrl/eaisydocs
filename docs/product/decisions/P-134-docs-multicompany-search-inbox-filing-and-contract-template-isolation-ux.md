# P-134: [Docs] Többcéges Kereső, Bejövő Iktatópanel (`/inbox/[id]`), Kimenő Válaszlevelek és Egyéni Szerződéssablonok Cég-Izolációja UX

- **Dátum:** 2026-11-02
- **Hatókör:** `[Docs]`
- **Kategória:** `Docs / Multi-Company Search, Inbox Filing, Dossiers & Contract Templates UX`
- **Kapcsolódó döntések és fájlok:**
  - [A-105](../../architecture/decisions/A-105-docs-multicompany-unique-constraints-audit-company-trigger-and-package2-isolation.md)
  - `src/app/search/actions.ts`
  - `src/app/inbox/[id]/page.tsx`
  - `src/app/inbox/filing-actions.ts`
  - `src/utils/antecedent-matcher.ts`
  - `src/app/rules/page.tsx`
  - `src/app/dossiers/[id]/actions.ts`
  - `src/app/dossiers/[id]/template-actions.ts`
  - `src/app/partners/contract-actions.ts`
  - `src/app/archive/disposal-actions.ts`

## 1. Felhasználói Élmény és Üzleti Követelmények

Többcéges (`multi-company`) felhasználók esetén a bal felső cégválasztóban kiválasztott aktív cég (`activeCompanyId`) határozza meg a teljes `eaisyDocs` munkaterület kontextusát. A 2. Csomag (Task 2.1 – 2.6) biztosítja, hogy cégváltás után minden keresési, iktatási, sablonkezelési és naplózási felület kizárólag az aktív cég adataival dolgozzon:

1. **Kereső (`/search`), Gyorskereső (`Ctrl+K`) és Mentett keresések:**
   - A részletes kereső és a fejlécbeli gyorskereső (`Ctrl+K`) kizárólag az aktív cég iratait és ügyiratait jeleníti meg.
   - A mentett keresések cég-specifikusak: minden cégben csak az adott céghez elmentett keresési profilok és riasztások látszanak.
2. **Azonos szállítók és tételszámok rögzíthetősége több cégben:**
   - Két külön cég fennakadás nélkül rögzítheti ugyanazt a partnert (azonos adószámmal, pl. Magyar Telekom Nyrt.) és használhat azonos irattári tételszámokat (`1.1`, `3.1`) vagy iktatószám-formátumokat.
3. **Bejövő irat iktatópanel (`/inbox/[id]`), AI javaslatok és Szabályok (`/rules`):**
   - Az iktatópanel és a Szabályok oldal legördülő listái (Szervezeti egységek, Irattári terv tételek, Partnerek, Meglévő ügyiratok) kizárólag az aktív cég törzsadatait kínálják fel, az AI metaadat-kinyerő és az előzmény-ügyirat javaslattevő pedig nem keveri bele más cégek ügyiratait.
4. **Kimenő iratok, Eseménynapló (`/audit`) és Egyéni szerződéssablonok:**
   - Az ügyiratban feltöltött vagy sablonból generált kimenő válaszlevelek automatikusan az ügyirat cégéhez kerülnek, így az adott cégben láthatóak maradnak.
   - Az Eseménynapló (`/audit`) minden cégben pontosan az adott cég iratain és ügyiratain végzett műveleteket mutatja.
   - A Partnerek modulban létrehozott egyéni szerződéssablonok csak abban a cégben jelennek meg, amelyikben létrehozták őket.

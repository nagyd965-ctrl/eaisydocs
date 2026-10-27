# P-118: [HR] Többcéges Karrierportál, 5-Lépéses AI „Cégünkről” Prezentáció Varázsló és Pályázatkövető UX

**Status:** Decided  
**Date:** 2026-10-27  
**Scope:** [HR]  
**Category:** HR / Recruitment, Employer Branding & Public Career Portal UX  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-086](../../architecture/decisions/A-086-multi-company-career-portal-and-ai-employer-branding-architecture.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó Kód:** `src/components/hr/company-presentation-editor.tsx`, `src/components/hr/company-presentation-viewer.tsx`, `src/components/hr/career-portal-client.tsx`, `src/app/karrier/page.tsx`, `src/app/karrier/[id]/page.tsx`, `src/app/karrier/[id]/application-form.tsx`, `src/components/hr/manage-posting-dialog.tsx`, `src/components/hr/job-postings-list.tsx`

---

## 1. Question / Problémafelvetés

1. A publikus `/karrier` oldal korábban túlságosan egyszerű volt, és többcéges környezetben zavaró volt, ha a cégválasztás több helyen (a fejlécben és a „Cégünkről” fül alatt is) megjelent.
2. A HR-esek számára a belső `/hr/recruitment` oldalon szükség volt egy átlátható, teljes szélességű, lépésről lépésre vezetett felületre, ahol rögzíthetik a vállalat alapadatait, feltölthetnek saját fotókat, és az AI segítségével egy vizuálisan prémium „Cégünkről” prezentációt készíthetnek és publikálhatnak a Karrieroldalra.

## 2. Decision (A Meghozott Döntés)

### 2.1. Belépő Vállalatválasztó Képernyő és Egycéges Fókusz a `/karrier` oldalon (`CareerPortalClient`)
- **Belépő Vállalatválasztó (`/karrier` alapállapot):** Amikor a pályázó megnyitja a `/karrier` oldalt, elsőként kiválasztja, melyik vállalat (`Think AI Kft.`, `SANDBOX`, `Teszt Kft.`) karrieroldalát szeretné megtekinteni. A kártyákon megjelenik a vállalat borítóképe, címe, rövid bemutatkozója, a nyitott pozíciók száma jelvényként, valamint a **`Nyitott pozíciók megtekintése`** (zárójeles darabszám nélkül) és a **`„Cégünkről” prezentáció`** gomb.
- **Egyetlen vállalatra fókuszáló karrieroldal (kiválasztás után):**
  - Miután a pályázó kiválasztotta a vállalatot (vagy közvetlen `?company=` linkkel érkezett), a teljes oldal kizárólag az adott vállalathoz tartozik; kikerültek a redundáns belső cégválasztó sávok.
  - A felső navigációs sávban a **`Másik vállalat választása`** gombbal bármikor visszaléphet a nyitó cégválasztóhoz.
  - A 4 KPI kártya (`Nyitott pozíciók`, `Meghirdető részlegek`, `Munkavégzési modell`, `Átlagos visszajelzés`) egységes, statikus kísérőszövegeket használ (*„Aktív szakmai területek és csapatok”*).
  - A fő tartalom tetején egyetlen letisztult szekcióváltó található (duplikáció nélkül): **`Nyitott pozíciók`** és **`Cégünkről — Vállalati Prezentáció`**.

### 2.2. Interaktív 5 Fejezetes „Cégünkről” Prezentáció Megjelenítő (`CompanyPresentationViewer`)
- **Felső vezérlősáv:** Kizárólag a **`Prezentáció` | `Összes fejezet`** nézetváltó jelenik meg a jobb felső sarokban (a felső fejezetgombok és felső nyilak eltávolításra kerültek).
- **Alsó fejezetléptetés:** A diák (`01 Kik vagyunk & Küldetés`, `02 Kultúra & Értékek`, `03 Munkakörnyezet & Galéria`, `04 Juttatások & Karrierút`, `05 Csatlakozz hozzánk`) közötti váltás a dia alján lévő **`Előző fejezet`**, fejezet-indikátor pontok és **`Következő: ...`** gombokkal történik.

### 2.3. Teljes Szélességű, 5 Lépéses „Cégünkről (AI Prezentáció)” Varázsló a `/hr/recruitment` oldalon (`CompanyPresentationEditor`)
- A belső `/hr/recruitment` oldal **`Cégünkről (AI Prezentáció)`** füle teljes szélességben (`w-full`) jelenik meg, egy 5 lépéses vízszintes Stepper vezérlővel:
  1. **`01. LÉPÉS — Alapadatok & Küldetés`:** Iparág, alapítás éve, csapatméret, munkavégzési modell, küldetésnyilatkozat és a 4 megjelenő kulcsmutató kártya élő előnézete.
  2. **`02. LÉPÉS — Kultúra & Juttatások`:** Csapatkultúra, értékek, juttatási csomag és a záró vezetői üzenet aláírója.
  3. **`03. LÉPÉS — Fotóvilág & Saját képek`:** 4 kurált fotóvilág sablonkártya (*Modern Tech & AI Iroda*, *Kreatív Stúdió & Termékdesign*, *Üzleti Operáció & Flottakezelés*, *Prémium Vállalati Központ*) és saját fotók feltöltése (Borítókép, Kultúra fotó, 3 db Galéria fotó). Az alján egyetlen egyértelmű **`Tovább a 4. lépésre: AI Generálás és Szövegek`** gomb szerepel.
  4. **`04. LÉPÉS — AI Generálás & Szövegek`:** AI szöveggenerálás (`Szövegek újragenerálása AI-val`) és az 5 fejezet szövegeinek tételes szerkesztése.
  5. **`05. LÉPÉS — Előnézet & Publikálás`:** Teljes szélességű interaktív előnézet és **`Mentés és publikálás a Karrieroldalra`** gomb.

## 3. Rationale (Indoklás)

A belépő vállalatválasztó képernyő megszünteti a többszörös cégválasztó sávokból adódó vizuális zajt a publikus karrieroldalon, a belső 5 lépéses, teljes szélességű varázsló pedig átlátható, fókuszált munkafolyamatot biztosít a HR csapat számára a vállalati bemutatkozó prezentáció összeállításához.

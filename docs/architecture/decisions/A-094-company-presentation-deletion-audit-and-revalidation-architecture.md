# A-094: [HR] Vállalati „Cégünkről” Prezentáció Végleges Törlési Architektúrája, Audit Naplózás és Karrieroldal Revalidáció

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[HR]`  
**Author:** OpenCode  
**Kapcsolódó PRD:** [P-127](../../product/decisions/P-127-company-presentation-deletion-dialog-and-tab-rename-ux.md)  
**Kapcsolódó Kód:** `src/app/hr/recruitment/company-presentation-actions.ts`, `src/components/hr/company-presentation-editor.tsx`, `src/app/hr/recruitment/recruitment-tabs.tsx`

---

## 1. Context (Kontextus)

A többcéges karrierportál „Cégünkről” AI-prezentációja ([A-086](./A-086-multi-company-career-portal-and-ai-employer-branding-architecture.md)) a `companies.career_presentation` JSONB oszlopban, vállalatonként egyetlen példányban él. A Toborzás modulban a mentett prezentáció eddig kizárólag a `Prezentáció szerkesztése` művelettel volt kezelhető: **törölni nem lehetett**, így egy elavult vagy véletlenül generált bemutatkozó anyag csak felülírással volt semlegesíthető, a publikus Karrieroldalról pedig sosem tűnhetett el.

## 2. Decision (A Meghozott Döntés)

### 2.1. `deleteCompanyPresentationAction` szerver action (`company-presentation-actions.ts`)
- Új `deleteCompanyPresentationAction()` a meglévő `verifyPresentationAccess()` kapun keresztül (cég-admin vagy `hr_munkatars` / `hr_vezeto` / `admin` / `toborzo` szerepkör), az aktív `company_id` kontextusban.
- A törlés **mező-nullázásként** történik: `companies.career_presentation = NULL` — a vállalati rekord és az összes többi mező (logó, iktató prefix, tagságok) érintetlen marad.
- Az action **audit naplóz**: `hr_esemeny_naplo` bejegyzés `esemeny_tipus: "adat_torles"`, `modul: "toborzas"`, `entitas_tipus: "companies"` rekorddal, a kódbázis-wide törlési konvenciónak megfelelően.
- `revalidatePath("/hr/recruitment")` és `revalidatePath("/karrier")` biztosítja, hogy a prezentáció **azonnal eltűnjön a publikus Karrieroldalról** is, nem csak a belső nézetből.

### 2.2. Kliensoldali állapotvisszaállítás (`company-presentation-editor.tsx`)
- Sikeres törlés után a `CompanyPresentationEditor` a helyi állapotot alaphelyzetbe állítja: `presentation` és `briefing` vissza a `buildDefaultCompanyPresentation` alapértékekre, `hasSavedPresentation = false`, `isEditing = true`, `currentStep = 1`, előnézet zárva.
- Így a felület **visszavált az 5 lépéses létrehozó varázslóra**, a prezentáció bármikor újból létrehozható.
- Az `AlertDialog` megerősítő ablak Base UI `render` / kontrollált `open` mintát követ (`AlertDialogTrigger` nélkül, `onOpenChange` vezérléssel), hiba esetén a dialógus nyitva marad.

### 2.3. Fül-elnevezés konzisztencia (`recruitment-tabs.tsx`)
- A Toborzás fülsáv címkéje „Cégünkről (AI Prezentáció)” helyett **„Cégünkről prezentáció”** lett — a fül tartalmát (varázsló, szerkesztés, törlés) az AI csak az egyik előállítási módként kezeli, nem a funkciónév részeként.

## 3. Consequences (Következmények)

**Pozitív:**
- A elavult prezentációk egy kattintással, auditnyomonnal eltávolíthatók; a Karrieroldal nem mutat többé törölt tartalmat.
- A törlés reverzibilis a gyakorlatban (a varázslóval újból létrehozható), miközben az audit napló megőrzi a művelet nyomát.

**Kockázat / Kompromisszum:**
- A törlés **végleges** (nincs lomtár vagy verzióelőzmény a `career_presentation` mezőhöz); a megerősítő dialógus és a „varázslóval újból létrehozható” figyelmeztetés kompenzálja.
- A prezentációhoz korábban feltöltött saját fotók (`avatars` bucket, `companies/<id>/career_*` útvonalak) a Storage-ben megmaradnak árva objektumként — jelenlegi döntés szerint nem törlődnek (későbbi takarító cron tárgya lehet).

# P-127: „Cégünkről” Prezentáció Törlés Megerősítő Dialógussal és Fülátnevezés UX

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[HR]`  
**Category:** HR / Recruitment, Employer Branding & Career Presentation UX  
**Author:** OpenCode  
**Kapcsolódó ADR:** [A-094](../../architecture/decisions/A-094-company-presentation-deletion-audit-and-revalidation-architecture.md)  
**Kapcsolódó Kód:** `src/components/hr/company-presentation-editor.tsx`, `src/app/hr/recruitment/company-presentation-actions.ts`, `src/app/hr/recruitment/recruitment-tabs.tsx`

---

## 1. Question / Problémafelvetés

A Toborzás → „Cégünkről” fülön egy már mentett prezentáció esetén a felhasználó csak szerkeszteni tudta az anyagot (`Prezentáció szerkesztése` gomb). Végleges törlés nem állt rendelkezésre, így egy elavult vagy véletlenül generált bemutatkozó csak felülírással volt semlegesíthető, és a publikus Karrieroldalon továbbra is megjelent. Emellett a fül neve („Cégünkről (AI Prezentáció)”) a technológiai megoldást (AI) emelte a funkcionévbe.

## 2. Decision (A Meghozott Döntés)

### Törlés gomb megerősítő dialógussal
- A mentett prezentáció összecsukható kártyáján a `Prezentáció szerkesztése` gomb mellett megjelenik egy **`Törlés`** gomb (kuka ikon, destruktív piros körvonal és szöveg, `outline` variáns), kizárólag írási jogosultsággal (`!isReadOnly`) és csak mentett prezentáció mellett.
- A gomb **`AlertDialog` megerősítést** nyit: „Biztosan törölni szeretnéd a(z) {cégnév} vállalati bemutatkozó prezentációját?” — `Mégsem` és `Végleges törlés` (destruktív) gombokkal, törlés közbeni `Törlés folyamatban...` állapottal.
- A kártya címe (`role="button"`) az előnézetet nyitja/csukja; a műveletgombok `stopPropagation` védelemmel nem váltanak előnézetet.

### Törlés utáni állapot
- Sikeres törlés után a felület **visszavált az 5 lépéses létrehozó varázsló alapállapotába** (1. lépés, alapértelmezett briefing és prezentáció), siker-toast üzenettel („…a varázslóval bármikor létrehozhatod újra.”).
- A prezentáció a törlés pillanatában eltűnik a publikus Karrieroldalról (`revalidatePath("/karrier")`).

### Fülátnevezés
- A Toborzás fülsáv címkéje: **„Cégünkről (AI Prezentáció)” → „Cégünkről prezentáció”**.

## 3. Rationale (Indoklás)

- A törlés destruktív, nem visszavonható művelet, ezért kötelező a explicit megerősítő dialógus a projektkonvenció szerinti `bg-destructive` múködési mintával (A-029 / P-043 egységes komponenshasználat).
- A törlés után azonnali varázsló-visszaállás biztosítja, hogy a „nincs prezentáció” állapot gördülékenyen kezelhető legyen anélkül, hogy a felhasználó oldalfrissítésre kényszerülne.
- Az új fülnév a funkciót nevezi meg, nem az előállítási módot; az AI-generálás a varázsló 4. lépésében továbbra is jól látható.

# [Közös] A-029: Rendszerszintű UI/UX Egységesség és Kanonikus Komponens Használati Szabályzat

**Státusz:** Decided  
**Dátum:** 2026-10-02  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kapcsolódó PRD:** [P-043](../../product/decisions/P-043-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó Kód:** `src/components/table-toolbar/table-toolbar.tsx`, `src/components/document-viewer.tsx`, `src/components/status-badge.tsx`, `src/components/partner-documents-table.tsx`

---

## 1. Kontextus és Problémafelvetés

Az eaisyDocs és eaisyHR platform gyors ütemű fejlődése során a különböző aloldalakon és modulokon (Iktatókönyv, Bejövő sor, Partnertörzs, Dolgozói adatlapok, Irattár, HR modulok) megjelent annak a kockázata, hogy egyes képernyők eltérő szűrési mechanizmusokat, egyedi keresőmezőket vagy nem szabványos gombelrendezéseket kapnak.

A felhasználói élmény (UX), a szoftver prémium minősége és a hosszú távú karbantarthatóság érdekében megkerülhetetlen követelmény, hogy **a program minden egyes részén azonos szerkezeti és vizuális minták (kanonikus komponensek)** működjenek.

---

## 2. Végleges Építészeti Döntés

Elfogadásra kerül a **Globális UI/UX Egységességi Szabályzat (Global UI Consistency Directive)**, amely minden jövőbeli fejlesztésnél, fejlesztő és AI asszisztens számára szigorúan kötelező:

### 2.1. Táblázatok és Listázó Képernyők: `TableToolbar` Mandátum
- Minden táblázat vagy listázó nézet felett kötelező a központi `TableToolbar` (`src/components/table-toolbar/table-toolbar.tsx`) alkalmazása.
- **Elrendezési standard:**
  - **Bal oldalon:** Teljes szélességű, reszponzív keresőmező (`Search` ikonnal, valós idejű szűréssel és gyors `X` törlő gombbal).
  - **Jobb oldalon:**
    - Opcionális Oszlopválasztó Popover (`Columns3` ikon) az oszlopok dinamikus ki/bekapcsolásához.
    - Szabványos, teal/brand színű **`Szűrés` Popover Gomb**, amely a felugró panelben strukturáltan tartalmazza:
      - Dátum intervallum szűrőt (`Dátum tól` / `Dátum ig`),
      - Tematikus checkbox szűrőcsoportokat (`FilterGroup`),
      - Aktív szűrők számláló jelvényét (Badge),
      - "Szűrők törlése" reset gombot.
- **Szigorúan tilos:** Különálló, ad-hoc szűrő pill-eket vagy eltérő gombelrendezésű keresősávokat fejleszteni azokon a helyeken, ahol táblázatos adatsorok jelennek meg.

### 2.2. Dokumentum és Ügyirat Gyors Betekintés (Quick View Mandátum)
- Minden olyan nézetben, ahol iratok vagy ügyiratok listázódnak (főlisták, partner adatlap, dolgozói személyi dosszié, csatolt ügyek), kötelező biztosítani az in-place gyors megtekintést:
  - **Csatolt fájlok (PDF/kép):** A kanonikus `DocumentViewer` (`src/components/document-viewer.tsx`) modál használata a jogosultságellenőrzéssel és auditnaplózással.
  - **Irat metaadatok:** Fájl nélküli irat esetén szabványos Irat Részletek modál.
  - **Ügyiratok:** Ügyirat betekintő gomb, amely felugró modálban összegzi az ügyirat iktatási és felelősségi adatait.

### 2.3. Statisztikai Kártyák (Linear Flat KPI Grid)
- A statisztikai kártyák felépítése egységesen Linear-inspirált flat dizájnt követ:
  - Nincs vastag bal oldali szegély (`border-l-4` kivezetve),
  - Felül kisméretű uppercase felirat + tabular-nums kiemelt számérték,
  - Jobb oldalon kerekített ikon-konténer diszkrét háttérrel (`rounded-lg bg-...`).

### 2.4. Státuszok és Szemantikus Tokenek
- Minden entitás állapotmegjelenítésére a központi `StatusBadge` és a globális HSL változók (`success`, `warning`, `info`, `destructive`, `primary`) használandók.

---

## 3. Következmények és Előnyök

- **Megbízható Tanulhatóság:** A felhasználó a program bármely képernyőjén jár, azonnal tudja, hol kereshet, hogyan szűrhet és hogyan tekinthet meg iratokat.
- **Nulla Kódduplikáció:** Az új képernyők nem hoznak létre új szűrőlogikát, hanem a meglévő `TableToolbar` és `DocumentViewer` komponenseket hasznosítják újra.
- **Konzisztens Design Integritás:** Megszűnnek a design eltérések az eaisyDocs és eaisyHR modulok között.

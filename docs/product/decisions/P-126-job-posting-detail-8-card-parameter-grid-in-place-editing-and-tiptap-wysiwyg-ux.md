# P-126: [HR] Álláshirdetés Részletes Adatlap (`/hr/recruitment/posting/[id]`) 8-Kártyás Felső Paramétersáv, Kétfülű Elrendezés, Helyben Szerkesztés (In-Place Editing) és Tiptap WYSIWYG Szerkesztő UX

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[HR]`  
**Category:** `HR / Recruitment, Job Posting Detail & WYSIWYG Editor UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-093](../../architecture/decisions/A-093-tiptap-prosemirror-rich-text-editor-and-in-place-posting-editing-architecture.md)  
**Kapcsolódó Kód:** `src/app/hr/recruitment/posting/[id]/posting-detail-client.tsx`, `src/components/rich-text-editor.tsx`, `src/components/rich-text-content.tsx`, `src/lib/sanitize-html.ts`, `src/components/hr/job-postings-list.tsx`

---

## 1. Question / Problémafelvetés

Az álláshirdetés részletes adatlapján (`/hr/recruitment/posting/[id]`) négy felhasználói élménybeli probléma merült fel:
1. A fejlécben a cím alatti zsúfolt adatsor és a felső KPI kártyák helyett a pozíció paramétereinek különálló, áttekinthető kártyákban kellett megjelenniük az oldal felső részén.
2. Az oldal tartalmát két tiszta fülre (`Jelentkezők` és `Álláshirdetés tartalma és leírása`) kellett bontani, a hirdetés szövegét pedig nyers HTML címkék helyett tisztán formázott dokumentumként kellett megjeleníteni.
3. A szövegszerkesztőben egy kiemelt (`Kiemelés`) szövegrészre újra rákattintva a kiemelést nem lehetett visszavonni, hanem újra kiemelte (egymásba ágyazta) a blokkot.
4. A `Hirdetés szerkesztése` gombra kattintva az új hirdetés létrehozására szolgáló 3-lépéses varázsló pop-up (`Hogyan szeretnéd elkészíteni az álláshirdetést?`) jelent meg ahelyett, hogy a meglévő hirdetés adatait közvetlenül lehetett volna módosítani.

## 2. Decision (A Meghozott Döntés)

### 2.1. Letisztult Fejléc és 8-Kártyás Felső Pozíció-paraméter Rács (`4×2` Grid)
- **Fejléc:** Breadcrumb (`Toborzás > Álláshirdetések > {Pozíció címe}`), vissza gomb, a pozíció címe + státusz badge (`Publikus`, `Belső hirdetés`, `Piszkozat`, `Inaktív`), alatta tömör alcím (`Belső munkakör: {Munkakör link} • Közzétéve: {Dátum}`), jobb oldalon pedig az `Aktív` / `Publikus` / `Belső` kapcsolók, a `Hirdetés szerkesztése` és a `Megtekintés karrieroldalon` gomb.
- **8 Pozíció-paraméter Kártya (a felső sávban, KPI kártyák helyett):**
  1. `Szakmai részleg`
  2. `Belső munkakör` (közvetlen linkkel a `/hr/job/[id]` munkaköri törzslapra)
  3. `Munkavégzés módja`
  4. `Foglalkoztatás`
  5. `Tapasztalati szint`
  6. `Munkavégzés helye`
  7. `Bruttó havi bérsáv` (Fintech Teal kiemeléssel + `Publikus a karrieroldalon` / `Belső referenciasáv` jelzéssel)
  8. `Jelentkezési határidő`

### 2.2. Kétfülű Elrendezés (`Jelentkezők` | `Álláshirdetés tartalma és leírása`)
- **1. fül — `Jelentkezők ({darabszám})`:** Kanonikus `TableToolbar` keresővel, oszlopválasztóval és toborzási szakasz szűrővel, bérigény vs. bérsáv összevetéssel, inline státuszváltással és `DocumentViewer` CV megtekintéssel.
- **2. fül — `Álláshirdetés tartalma és leírása`:** Formázott megjelenítés (`RichTextContent`) a rövid összefoglalóval és a részletes pozícióleírással, valamint helyben elérhető `Szöveg szerkesztése` gombbal.

### 2.3. Helyben Történő (In-Place) Hirdetés- és Paraméter-szerkesztés
- A `Hirdetés szerkesztése` gombra kattintva (vagy az álláshirdetések listájában a `Szerkesztés` ikonról `/hr/recruitment/posting/[id]?edit=true` útvonalon érkezve) **nem jelenik meg a létrehozó varázsló pop-up**.
- Ehelyett közvetlenül az adatlapon szerkeszthetővé válik:
  - A hirdetés nyilvános címe a fejlécben,
  - Mind a 8 felső paraméterkártya (inline szövegmezőkkel, legördülő választókkal, minimum/maximum bér mezőkkel, publikus kapcsolóval és dátumválasztóval),
  - Valamint a rövid összefoglaló és a részletes pozícióleírás.
- A fejlécben a `Mégsem` és `Módosítások mentése` gombokkal egyetlen kattintással elmenthetők vagy elvethetők a változtatások.

### 2.4. Tiptap WYSIWYG Szerkesztő Valódi Toggle és Undo/Redo Működéssel
- A `RichTextEditor` eszköztára: `Címsor`, `Alcím`, `Bekezdés`, `Félkövér`, `Dőlt`, `Aláhúzott`, `Felsorolás`, `Számozott lista`, `Kiemelés`, `Formázás törlése`, valamint `Visszavonás` és `Újra`.
- Aktív formázásnál a gomb Fintech Teal kiemelést kap, és ismételt kattintásra (beleértve a `Kiemelés` blokkot is) tisztán visszavonja a formázást.

## 3. Rationale (Indoklás)

Az álláshirdetés adatlap így egyszerre biztosít strukturált vezetői áttekintést a pozíció feltételeiről (8 paraméterkártya), dedikált munkaterületet a jelentkezők szűrésére és a hirdetésszöveg olvasására (2 fül), valamint azonnali, pop-up mentes helyben szerkesztést.

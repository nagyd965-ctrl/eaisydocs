# A-093: [HR] [Közös] Tiptap ProseMirror Rich Text Szerkesztő, HTML Sanitizer Normalizáció és Helyben Történő (In-Place) Álláshirdetés-szerkesztési Architektúra

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[HR]` `[Közös]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-126](../../product/decisions/P-126-job-posting-detail-8-card-parameter-grid-in-place-editing-and-tiptap-wysiwyg-ux.md)  
**Kapcsolódó Kód:** `src/components/rich-text-editor.tsx`, `src/components/rich-text-content.tsx`, `src/lib/sanitize-html.ts`, `src/app/hr/recruitment/posting/[id]/posting-detail-client.tsx`, `src/components/hr/job-postings-list.tsx`, `src/components/hr/manage-posting-dialog.tsx`

---

## 1. Context (Kontextus)

Az álláshirdetések szövegszerkesztése és megjelenítése során három technikai probléma merült fel:
1. **Böngésző-natív `document.execCommand` korlátai:** A `formatBlock` alapú `BLOCKQUOTE` parancs nem valódi toggle műveletként működött: ha a kijelölt szöveg már kiemelésben (`<blockquote>`) vagy kiemelésen belüli listában (`<blockquote><ul><li>...</li></ul></blockquote>`) volt, az ismételt kattintás nem vonta vissza a kiemelést, hanem újabb `<blockquote>` réteget ágyazott egymásba.
2. **Legacy inline stílusok és entitás-kódolt HTML:** A korábban elmentett vagy AI által generált hirdetésszövegek esetenként inline `style="..."` attribútumokat (pl. `border-left: 4px solid #00b4d8; background: #f9f9f9`), egymásba ágyazott `<blockquote>` elemeket vagy HTML-entitásként (`&lt;h3&gt;...`) tárolt címkéket tartalmaztak, amelyek nyers HTML-kódként vagy inkonzisztens stílussal jelentek meg.
3. **Létrehozási varázsló vs. meglévő hirdetés módosítása:** Meglévő álláshirdetés szerkesztésekor (`Hirdetés szerkesztése` gomb az adatlapon vagy `Szerkesztés` ikon a listában) ugyanaz a 3-lépéses létrehozó varázsló modál (`1. Módválasztás: Hogyan szeretnéd elkészíteni az álláshirdetést? Generálás AI-val vs. Saját kezű...`) nyílt meg, amely kizárólag új hirdetés feladásakor releváns.

## 2. Decision (A Meghozott Döntés)

### 2.1. Tiptap / ProseMirror alapú `RichTextEditor` komponens (`src/components/rich-text-editor.tsx`)
- Bevezetésre került a `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-underline` és `@tiptap/extension-placeholder` csomagokra épülő `RichTextEditor` komponens (`immediatelyRender: false` SSR-védelemmel).
- A **Kiemelés (`blockquote`)** gomb egyedi ProseMirror tranzakciós csomagolás-feloldó (`lift`) logikát kapott: végigjárja a `$from` pozíció szülő-hierarchiáját (`$from.depth` -> `1`), és ha bármelyik szinten `blockquote` csomópontot talál (akár akkor is, ha a kurzor egy `blockquote`-on belüli `<ul><li>` felsorolásban áll), a `blockRange` és ` target` mélység kiszámításával tisztán kicsomagolja (`tr.lift(range, target)`) a kiemelést.
- A szerkesztő eszköztára valódi aktív állapot-visszajelzést (`editor.isActive(...)`) biztosít minden formázáshoz (`Címsor H3`, `Alcím H4`, `Bekezdés`, `Félkövér`, `Dőlt`, `Aláhúzott`, `Felsorolás`, `Számozott lista`, `Kiemelés`, `Formázás törlése`, `Visszavonás`, `Újra`).

### 2.2. HTML Sanitizer és `RichTextContent` normalizálás (`src/lib/sanitize-html.ts`, `src/components/rich-text-content.tsx`)
- A `sanitizeRichTextHtml` függvény minden HTML címkéről eltávolítja a legacy inline attribútumokat (`style="..."`, `class="..."`), és egy többlépcsős regex-normalizációval kilapítja az egymásba ágyazott `<blockquote>` elemeket.
- A `RichTextContent` komponens automatikusan felismeri és dekódolja a duplán kódolt HTML-entitásokat (`&lt;h3&gt;...`), így a régebbi hirdetések is formázott dokumentumként jelennek meg.

### 2.3. Helyben történő (In-Place) álláshirdetés-szerkesztés (`src/app/hr/recruitment/posting/[id]/posting-detail-client.tsx`, `src/components/hr/job-postings-list.tsx`)
- A `/hr/recruitment/posting/[id]` adatlapon a `Hirdetés szerkesztése` gomb leválasztásra került a `ManagePostingDialog` létrehozó varázslóról, és helyben történő szerkesztő módot (`isEditingPosting`) aktivál.
- Az álláshirdetések listájában (`job-postings-list.tsx`) a kártyás és táblázatos nézet `Szerkesztés` ikonja közvetlenül a `/hr/recruitment/posting/[id]?edit=true` útvonalra navigál, amely megnyitáskor automatikusan belép a helyben szerkesztő módba.
- A `ManagePostingDialog` 3-lépéses AI/manuális varázslója kizárólag új álláshirdetés létrehozására (`Új hirdetés feladása`) szolgál.

## 3. Consequences (Következmények)

- **Pozitív:** A kiemelések (`blockquote`), listák és címsorok bármikor egyetlen kattintással oda-vissza kapcsolhatók vagy visszavonhatók; a meglévő álláshirdetések szerkesztése közvetlenül az adatlapon, kontextusváltás és létrehozó pop-up nélkül történik.
- **Kompromisszum:** A Tiptap / ProseMirror függőségek növelik a kliensoldali szerkesztő bundle méretét, de garantálják a determinisztikus DOM-sémát és a megbízható WYSIWYG működést.

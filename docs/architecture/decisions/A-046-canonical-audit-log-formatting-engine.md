# A-046: Kanonikus Eseménynapló Formázó Motor és Szemantikus Eseményfeloldás [Docs]

> **Státusz:** Decided  
> **Dátum:** 2026-10-10  
> **Hatókör:** `[Docs]` (eaisyDocs elektronikus iratkezelés & audit naplózás)  
> **Kapcsolódó döntések:** [A-006](./A-006-gapless-filing-sequence-allocation.md), [A-008](./A-008-immutable-audit-log-and-hash-verification.md), [A-029](./A-029-global-ui-consistency-and-unified-components.md), [P-043](../../product/decisions/P-043-global-ui-consistency-and-unified-components.md), [P-065](../../product/decisions/P-065-canonical-audit-log-formatting-ux.md)  
> **Érintett komponensek:** `src/utils/audit-log-formatter.ts`, `src/components/timeline.tsx`, `src/app/dossiers/[id]/page.tsx`, `src/app/inbox/view/[id]/page.tsx`, `src/app/dossiers/[id]/lifecycle-export.ts`, `src/app/dossiers/[id]/actions.ts`

---

## 1. Kontextus és Problémafelvetés
Az eaisyDocs rendszerben a relációs adatbázis `esemeny_naplo` táblája egy rögzített enum (`esemeny_tipus`) értékhalmazzal működik (`erkeztetve`, `iktatva`, `szignalva`, `megtekintve`, `modositva`, `letoltve`, `nyomtatva`, `tovabbitva`, `elintezve`, `lezarva`, `irattarozva`, `selejtezve`, `jogosultsag_valtozott`).

A valóságban bekövetkező üzleti események túlnyomó része (új feladat kiírása, feladat lezárása/törlése, válaszlevél előállítása, e-mailes kiküldés, kimenő piszkozat törlése, belső megjegyzések, fájlverziók, ERP kapcsolatok csatolása) az adatbázisban technikai kényszerből az `esemeny_tipus = 'modositva'` rekordként került lementésre, a részletes műveleti leírást pedig az `indoklas` szöveges mező tartalmazta.

A frontend és a PDF exportáló korábbi formázó logikája azonban túlságosan kezdetleges volt:
1. Szinte mindenre a generikus és semmitmondó **„Ügyirat módosítva”** címet jelenítette meg.
2. Megjegyzések esetén a cím és a leírás is redundánsan „Megjegyzés hozzáadva” volt, anélkül, hogy a bejegyzés szövege látszott volna.
3. Az automatikus adatbázis-triggerek által beszúrt technikai frissítések üres leírással, ismeretlen felhasználóval jelentek meg.
4. Az ikonok kizárólag egy statikus szemceruzára (`Pencil`) korlátozódtak.

---

## 2. Döntés és Architektúra

### 2.1. Központi Audit Formázó Motor (`audit-log-formatter.ts`)
Létrehoztunk egy dedikált, központi feldolgozó motort ([src/utils/audit-log-formatter.ts](../../../src/utils/audit-log-formatter.ts)), amely bármely `esemeny_naplo` nyers rekordot pontos, szakmailag hiteles címre, tiszta leírásra és szemantikus vizuális jelölésre fordít:

* **Iktatás és Érkeztetés:** `Ügyirat iktatva` (iktatószámmal), `Irat beiktatva`, `Irat érkeztetve`.
* **Feladatok:** `Új feladat kiírva`, `Feladat törölve`, `Feladat elvégezve` (zöld pipa), `Feladat visszautasítva` (figyelmeztető piros).
* **Válaszlevelek és Expedíció:** `Kimenő válaszlevél előállítva`, `Válaszlevél kiküldve (E-mail)`, `Válaszlevél feladva (Posta)`, `Kimenő piszkozat törölve`.
* **Belső Megjegyzések:** `Belső megjegyzés rögzítve` — a redundáns címduplikáció helyett a megjegyzés valós szövege jelenik meg (korrelálva a meglévő `ugyirat_megjegyzes` rekordokkal is).
* **Életciklus és Státuszok:** `Ügyirat elintézve`, `Ügyirat lezárva`, `Ügyirat irattározva`, `Irat selejtezve`, `Ügyirat állapotváltozás`.
* **Fájlok és Verziók:** `Új fájlverzió feltöltve` (verziószámmal és fájlnévvel), `Dokumentum csatolva`.
* **Megtekintések és Letöltések:** `Dokumentum megtekintve`, `Dokumentum letöltve`.
* **Rendszer / Trigger események:** Az `elozo_ertek` és `uj_ertek` JSON mezők intelligens összehasonlítása alapján megnevezi a változást (pl. `Státusz frissítve`, `Felelős kijelölve / módosítva`, `Határidő módosítva`).

### 2.2. Kibővített Szemantikus Ikonkészlet (`timeline.tsx`)
A `TimelineIconName` és az `ICON_MAP` kibővült a releváns Lucide React ikonokkal:
* `send` (Kiküldés / Expedíció)
* `message-square` (Belső megjegyzések)
* `list-todo` (Ügyirati feladatok)
* `file-text` / `sparkles` (Válaszlevél generálás)
* `shield` (Jogosultságok)
* `upload` / `download` (Fájl műveletek)
* `archive` (Irattározás)
* `link` (Külső rendszerkapcsolatok)
* `refresh-cw` / `clock` (Rendszerfrissítések, határidők)

### 2.3. Ügyirati és Irat Szintű Események Egységes Lekérdezése
Az ügyirat nézetben a napló lekérdezése mostantól nemcsak az `entitas_id = ugyiratId` rekordokat gyűjti össze, hanem az adott ügyirathoz tartozó iratok audit eseményeit is (`or(entitas_id.eq.ugyiratId, entitas_id.in.(iratIds))`), így a csatolt fájlok megtekintése és letöltése is láthatóvá válik az ügyirattörténetben.

### 2.4. Integráció a PDF Életciklus Riporttal
A [src/app/dossiers/[id]/lifecycle-export.ts](../../../src/app/dossiers/[id]/lifecycle-export.ts) által generált hivatalos PDF audit riport szintén átvette a `formatAuditLogEvent` motort, így a nyomtatott / exportált jegyzőkönyvben is a pontos, kifejező megnevezések szerepelnek a technikai „Módosítás” helyett.

---

## 3. Következmények és Előnyök
* **Magas szintű áttekinthetőség:** A felhasználó azonnal látja, hogy ki, mikor, milyen típusú műveletet végzett.
* **0 redundancia:** Megszűnt az egymás alá írt azonos cím és leírás.
* **100% tesztlefedettség:** A `src/utils/__tests__/audit-log-formatter.test.ts` csomag 9/9 tesztesettel igazolja a működést.

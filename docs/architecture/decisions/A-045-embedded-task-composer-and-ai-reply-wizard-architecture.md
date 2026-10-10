# A-045: Beágyazott Feladatkezelő és AI Válaszlevél Varázsló Architektúra [Docs]

> **Státusz:** Decided  
> **Dátum:** 2026-10-10  
> **Hatókör:** `[Docs]` (eaisyDocs elektronikus iratkezelés)  
> **Kapcsolódó döntések:** [A-006](./A-006-gapless-filing-sequence-allocation.md), [A-029](./A-029-global-ui-consistency-and-unified-components.md), [P-043](../../product/decisions/P-043-global-ui-consistency-and-unified-components.md), [P-064](../../product/decisions/P-064-embedded-task-composer-and-ai-reply-wizard-ux.md)  
> **Érintett komponensek:** `src/app/dossiers/[id]/page.tsx`, `src/components/tasks-tab.tsx`, `src/components/outgoing-documents-tab.tsx`, `src/app/dossiers/[id]/ai-reply-actions.ts`

---

## 1. Kontextus és Problémafelvetés
Az ügyirat részletes adatlapján (`/dossiers/[id]`) a korábbi feladatkezelés és válaszlevél-készítés többszörösen egymásba nyíló felugró ablakokba (nested modal / "popup pokol") volt kényszerítve:
1. Feladat rögzítésekor a főoldali modálból (`AddTaskDialog`) nyílt a feladatsablonok katalógusa (`TaskTemplatePicker`), amelyből újabb modálként nyílt meg a sablonszerkesztő űrlap.
2. A válaszleveleknél ugyanez a 3-szintű ablakos hierarchia ismétlődött.
3. A belső feladatok, a kimenő hivatalos válaszlevelek és a csapatmegjegyzések egyetlen zsúfolt kártyán osztoztak, ami ergonómiailag és funkcionálisan is zavaró volt (a válaszlevél valójában kimenő irat, nem belső feladat).

---

## 2. Döntés és Architektúra

### 2.1. Navigációs és Fül Szeparáció
Az ügyirat munkaterületét szétválasztottuk:
* **`Feladatok & Megjegyzések` fül (`TasksTab`):** Kizárólag a belső határidős feladatokra és a csapattagok közötti belső kommunikációra (`@` említések, jegyzetek) fókuszál 2-oszlopos (65% / 35%) arányban.
* **`Válaszlevelek & Expediálás` fül (`OutgoingDocumentsTab`):** Külön dedikált munkaterület a kimenő iratok nyilvántartására, kézbesítési státuszuk követésére (Elküldve, Kézbesítve, Sikertelen) és az új válaszlevelek összeállítására.

### 2.2. In-Place Feladatfelvétel és Gyors Sablonszalag (DOC-TASK-01)
* Megszűnt az `AddTaskDialog` és az összes felugró ablak a feladatképzésnél.
* A feladatok kártyájának tetején egy **Gyors Sablonszalag (Quick Template Ribbon)** és egy kibontható **beágyazott sablonkatalógus** kapott helyet.
* Bármely sablonra kattintva az űrlap mezői azonnal betöltődnek a felületen anélkül, hogy a felhasználó elveszítené a kontextust.

### 2.3. AI Válaszlevél Varázsló (`generateAiReplyAction` + `OutgoingDocumentsTab`)
* A kimenő levelek összeállításához egy 3-lépéses, lineáris Varázsló (Wizard) épült ki:
  1. **Címzett & Csatorna:** Automatikus partner- és e-mail detektálás az előzmény beérkező iratból. Csatorna választás: `E-mail`, `Posta`, `Csak iktatás`.
  2. **Levél összeállítása:** 3 belső füllel működő szerkesztő (modálok nélkül!):
     - `[ 📄 Sablonok ]`: Beépített válaszsablonok kártyás alkalmazása.
     - `[ ✨ AI Varázsló ]`: Google Gemini 2.5 Flash SDK integráció, kommunikációs stílus választóval (*Hivatalos / Jogi*, *Partneri / Közvetlen*, *Tájékoztató / Tömör*, *Felszólító / Határidős*) és 1-mondatos felhasználói instrukcióval.
     - `[ ✏️ Saját szöveg ]`: Formázható levéltörzs szerkesztő.
  3. **Melléklet & Iktatott Küldés:** Külső PDF melléklet csatolása, A4-es fejlécelt PDF generálás, gap-mentes kimenő alszám kiosztása és azonnali kézbesítés.

---

## 3. Következmények és Előnyök
* **Nulla felugró ablak egymásra ágyazódása:** A feladatfelvétel közvetlenül a lapon, a válaszlevél pedig egyetlen tiszta, többlépéses ablakban fut.
* **Erőteljes AI hatékonyságnövelés:** A felhasználó egyetlen mondatból kész, jogilag és nyelvtanilag hibátlan válaszlevelet kaphat.
* **Tiszta kód és típusbiztonság:** 0 TypeScript hiba (`npx tsc --noEmit`), 122/122 sikeres automatizált teszt.

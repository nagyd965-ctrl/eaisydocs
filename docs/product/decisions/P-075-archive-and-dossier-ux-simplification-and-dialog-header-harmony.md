# P-075 [Docs] Irattári Selejtezési Felületek, Ügyirat Fülek és Modál Fejlécek Letisztítása (Archive & Dossier UX Simplification)

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-074](P-074-physical-storage-searchable-combobox-and-custody-action-harmonization.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [A-056](../../architecture/decisions/A-056-base-ui-dialog-close-composition-and-render-prop-pattern.md)

## 1. Felhasználói Igény és Problémafelvetés
- **Irattár és Selejtezés (`/archive`):**
  - A füleken (`Javaslatok`, `Jóváhagyandó`, `Irattárban`) korábban felesleges számláló jelvények (`(X)`) szerepeltek, amelyek redundánsak voltak a közvetlenül felettük lévő Linear-flat KPI kártyákkal.
  - A Javaslatok és a Jóváhagyandó füleken nagyméretű, figyelemelterelő figyelmeztető dobozok (pl. sárga háromszöges „Jóváhagyandó Selejtezések (Szigorú Négy-szem elve)” banner) foglalták a helyet, túlbonyolítva az áttekintést.
  - A 4. („Selejtezett & Jegyzőkönyvek”) fül táblázatai felett díszítő ikonok (`FileText`, `Trash2`) és magyarázó alcímek szerepeltek, amelyek sértették a Linear-flat minimalista elveit.
- **Ügyirat Adatlap (`/dossiers/[id]`):**
  - A navigációs fülek feliratai túlzottan leíró jellegűek voltak: a `Feladatok & Megjegyzések` és a `Válaszlevelek & Expediálás` helyett a felhasználó tömör, direkt megnevezéseket kért (`Feladatok`, `Válaszlevelek`).
- **Modál Fejléc és Bezáró Gomb (`DialogClose`):**
  - Az új válaszlevél varázsló megnyitásakor a jobb felső sarokban lévő bezáró `X` ikon alapállapotban teljesen láthatatlan volt, és csak rámutatáskor (hover) jelent meg egy szürke háttér.
  - Az `Ügyirat: SZERZ/...` felirat közvetlenül ráfolyt a bezáró gomb területére, vizuális átfedést okozva.

## 2. Termék- és UX Döntések

### 2.1 Irattár Eszköztárak és Fejlécek Tisztítása (`src/components/archive-client.tsx`)
- **Fülek egyszerűsítése:** A fülek feliratai tiszták, számláló jelvények nélküliek (`Javaslatok`, `Jóváhagyandó`, `Irattárban`, `Selejtezett & Jegyzőkönyvek`).
- **Jóváhagyandó fül eszköztára:** A sárga háromszöges nagy figyelmeztető banner helyett egy kompakt, egysoros eszköztár került kialakításra:
  - Bal oldal: tiszta ügyiratszám összesítő (`Jóváhagyásra váró ügyiratok: X db`).
  - Jobb oldal: szabványos gombméret (`h-8 text-xs`) a jóváhagyási művelethez (`Selejtezés Jóváhagyása (X)`), illetve ügyintézői szerepkörnél diszkrét jogosultsági jelvény.
- **Selejtezési archívum fejléc minimalizálás:** A 4. fülön a kártyák fejlécei kizárólag a letisztult főcímeket tartalmazzák (`Hivatalos Selejtezési Jegyzőkönyvek Archívuma`, `Megsemmisített Ügyiratok Nyilvántartása`), ikonok, emojik és alcímek nélkül.

### 2.2 Ügyirat Adatlap Fül- és Kártyacímek Frissítése (`src/app/dossiers/[id]/page.tsx`)
- A fülfeliratok tömörek és lényegretörőek:
  - `Feladatok & Megjegyzések` ➔ **`Feladatok`**
  - `Válaszlevelek & Expediálás` ➔ **`Válaszlevelek`**
- A kapcsolódó panelek belső címei (`outgoing-documents-tab.tsx`, `outgoing-documents-panel.tsx`) szintén harmonizálásra kerültek a **`Válaszlevelek`** címre.

### 2.3 Modál Bezáró Gomb és Fejléc Ütközésmentesítés
- Az [A-056](../../architecture/decisions/A-056-base-ui-dialog-close-composition-and-render-prop-pattern.md) architektúra döntés alapján az `X` ikon mostantól minden dialógusban és oldalsó fiókban azonnal, lebegtetés nélkül is tisztán látható.
- A válaszlevél varázsló fejlécének felső sora jobboldali védőtávolságot (`pr-8`) kapott, így a jobb sarokban lévő ügyiratszám és a bezáró `X` között kényelmes, esztétikus térköz marad.

## 3. Minőségi és Üzleti Eredmények
- Csökkentett kognitív terhelés és azonnal áttekinthető irattári státuszok.
- A Linear-flat design szabályok (ikonmentes tiszta fejlécek, egységes eszköztárak) 100%-os érvényesülése.
- Kifogástalan dialógus bezárási élmény és ütközésmentes tipográfia.

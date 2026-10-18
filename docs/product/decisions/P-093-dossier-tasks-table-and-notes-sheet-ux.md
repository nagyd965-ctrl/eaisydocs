# PRD P-093: [Docs] Ügyirati Feladatok Teljes Szélességű Táblázat, Feladat Részletező Panel és Megjegyzések Slide-over

## Státusz
Elfogadva (Decided) - 2026-10-18

## Cél és Felhasználói Érték
A Feladatok fül kétoszlopos elrendezése (feladatkártya + mellette a „Belső megjegyzések” chat) szétcsúszott, szűk volt, és eltért a Válaszlevelek fül letisztult, teljes szélességű kártyájától. A cél egy egységes, átlátható, a rendszer kanonikus komponenseire épülő nézet, ahol a feladatok kapják a teljes teret, a megjegyzések pedig bármelyik fülről elérhetők maradnak.

## Felhasználói Élmény (UX)
1. **Feladatok fül – teljes szélességű kártya (a Válaszlevelek mintájára):**
   - Fejléc `+ Új feladat kiadása` gombbal (a varázsló, lásd [P-092](./P-092-dossier-tasks-wizard-modal-ux.md), változatlan).
   - Üres állapotban szaggatott keretes üres-állapot panel „Feladat kiadása most” gombbal.
   - 4 darab `KpiCard`: Nyitott, Folyamatban, Lejárt (kiemelve), Elvégzett – dekoratív ikonok nélkül.
   - Kanonikus `TableToolbar`: kereső, oszlopválasztó (Kategória alapból rejtett), `Szűrés` popover (állapot, prioritás, határidő-tartomány).
2. **Feladat táblázat:**
   - Gyors „kész” kapcsoló, megnevezés, (opcionális) kategória, felelős avatarral, határidő (lejárt esetén piros), prioritás, állapot badge, `Kész` gomb és `Kezelés` lenyíló menü.
   - Rendezés: elutasított > folyamatban > nyitott > kész, majd határidő szerint.
   - Sorra kattintva **Feladat részletező Sheet** nyílik (tényadatok, leírás, elutasítás indoka, állapotműveletek).
3. **Elvégzett feladatok archívum:**
   - A „Kész” állapotú feladatok az elvégzés után 24 órával automatikusan az összecsukható „Elvégzett feladatok (N)” szekcióba kerülnek, innen `Újranyitás` lehetséges.
4. **Belső megjegyzések – jobb oldali slide-over:**
   - Az ügyirat fejlécében `Megjegyzések (N)` gomb (minden fülről elérhető) nyitja a jobb oldali `Sheet`-et.
   - Nap szerinti elválasztók (Ma / Tegnap / dátum), monogram avatar, saját üzenetek „Te” jelöléssel, @említés kiemelés, `MentionInput` alapú író mező.
   - Az @említés értesítések mélylinkje: `?notes=1` (megnyitja a panelt).
5. **Feladatok fül címke:** `Feladatok (N)` – a nyitott feladatok darabszámával.

## Későbbre halasztva (adatbázis-módosítást igényel)
- Megjegyzés típusok (Általános / Figyelem / Döntés), kitűzés (pin), csatolmányok.
- „Feladat ebből” gomb megjegyzésből, feladatonkénti megjegyzések, egyesített aktivitás idővonal.

## Érintett fájlok
`src/components/tasks-tab.tsx`, `src/components/dossier-notes-sheet.tsx`, `src/app/dossiers/[id]/page.tsx`, `src/app/dossiers/[id]/actions.ts`.

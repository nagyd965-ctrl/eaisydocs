# ADR A-072: [Docs] Tasks Kanban 24-órás Auto-archiválás és Elvégzett Feladatok Lista Architektúra

## Státusz
Elfogadva (Decided) - 2026-10-18

## Kontextus és Problémafelvetés
A Saját feladatok felületen a rád szignált ügyiratok és a hozzáadott al-feladatok bevezetése után a felhasználói tapasztalat rávilágított egy kritikus Kanban problémára:
1. **A „Kész” oszlop túlterhelődése:** Amennyiben a lezárt, elintézett ügyiratok és al-feladatok korlátlanul a Kanban tábla „Kész” oszlopában maradnának, a felület rövid időn belül (több tucat vagy akár 200+ tétel esetén) áttekinthetetlenné válna és ellehetetlenítené a napi munkavégzést.
2. **Fókuszvesztés a felületen:** A fejlécben korábban bevezetett „Összes feladat” vezetői kapcsoló zajt keltett a dedikált „Saját Feladataim” oldalon; a felhasználónak kizárólag a saját tennivalóira van szüksége.

## Döntés
1. **24 órás gördülő ablak a Kanban táblán:**
   - A Kanban tábla „Kész” oszlopában kizárólag a frissen, az elmúlt 24 órában befejezett tételek (`completed_at >= now() - 24 hours`) jelennek meg.
   - Ez biztosítja az azonnali sikerélményt és a téves státuszváltás 24 órán belüli visszavonhatóságát anélkül, hogy a felület felduzzadna.
   - A 24 óránál régebbi tételek nem terhelik a Kanban DOM-ot; az oszlop alján diszkrét jelzés tájékoztat a régebben elvégzett feladatok darabszámáról és átkattintási lehetőséget biztosít a Lista nézetbe.
2. **Kétfülös szeparáció a Lista nézetben:**
   - A Lista nézet kapott egy diszkrét szegmentált kapcsolót: **„Aktív feladatok”** (Nyitott és Folyamatban lévő teendők), **„Elvégzett feladatok”** (Minden lezárt ügyirat és befejezett al-feladat a lezárás dátumával) és **„Összes”**.
   - A Lista nézet a `TableToolbar` keresőjével, szűrőjével és oszlopkezelőjével a teljes archívum kényelmes, gyors áttekintését teszi lehetővé.
3. **„Összes feladat” kapcsoló eltávolítása:**
   - A fejlécből eltávolításra került a nézetváltó kapcsoló; a felület 100%-ban a felhasználó saját, illetve helyettesített tennivalóira fókuszál.

## Érintett Fájlok
- `src/types/tasks.ts`
- `src/app/tasks/page.tsx`
- `src/app/tasks/task-actions.ts`
- `src/app/tasks/kanban-board.tsx`
- `src/app/tasks/task-list.tsx`

## Következmények
- A Kanban tábla mindig letisztult, reszponzív és gyors marad még évek múltán is.
- Az elvégzett munkafolyamatok sosem vesznek el: a Lista nézetben bármikor kereshetők, szűrhetők és auditálhatók.

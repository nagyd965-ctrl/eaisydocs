# PRD P-091: [Docs] Tasks Kanban 24-órás Auto-archiválás és Elvégzett Feladatok Lista UX

## Státusz
Elfogadva (Decided) - 2026-10-18

## Felhasználói Igény és Célkitűzés
A felhasználó igénye alapján a Saját Feladatok oldalon kizárólag a személyes teendőknek kell megjelenniük (az „Összes feladat” kapcsoló zavaró és felesleges). Továbbá elengedhetetlen egy olyan automatizmus, amely a Kanban tábla „Kész” oszlopából 24 óra elteltével elrejti a lezárt tételeket egy külön Elvégzett feladatok listába, megelőzve, hogy több száz tétel esetén a tábla áttekinthetetlenné váljon.

## UX Megvalósítás
1. **Letisztult Fejléc:**
   - Eltávolításra került a fejlécben korábban szereplő kapcsoló. A címsor egyszerűen: `Saját Feladataim`, leírása: `A rád szignált ügyiratok és a hozzád rendelt al-feladatok nyilvántartása.`
2. **24 órás gördülő ablak a Kanban „Kész” oszlopában:**
   - Csak az elmúlt 24 órában befejezett feladatok jelennek meg a kártyák között.
   - Az oszlop láblécében, ha léteznek régebbi tételek: `+{archivedCount} régebben elvégzett feladat | A Lista nézetben megtekinthető`.
3. **Lista Nézet szegmentált vezérlője:**
   - A táblázat felett diszkrét Linear stílusú pill kapcsoló:
     - `Aktív feladatok ({activeCount})` (Nyitott és folyamatban lévő tételek)
     - `Elvégzett feladatok ({completedCount})` (Kész és lezárt tételek lezárási dátummal)
     - `Összes ({allCount})`
   - A `TableToolbar` azonnali keresést, dátumszűrést és oszlopkezelést nyújt mindkét fülön.

## Következmények
- Maximális fókusz a napi operatív munkán.
- Nem alakul ki vizuális túlterheltség, miközben a teljes elvégzett történet azonnal elérhető marad a Lista nézetben.

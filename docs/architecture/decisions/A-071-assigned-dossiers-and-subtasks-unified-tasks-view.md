# ADR A-071: Rám szignált ügyiratok és hozzáadott al-feladatok egységesítése a Saját feladatok felületen [Docs]

- **Dátum:** 2026-10-18
- **Státusz:** `Decided`
- **Hatókör:** `[Docs]`
- **Kapcsolódó PRD:** [P-090](../../product/decisions/P-090-assigned-dossiers-and-subtasks-unified-tasks-view-ux.md)
- **Érintett fájlok:** `src/app/tasks/page.tsx`, `src/app/tasks/task-actions.ts`, `src/app/tasks/kanban-board.tsx`, `src/app/tasks/task-list.tsx`, `src/app/tasks/task-calendar.tsx`, `src/types/tasks.ts`

---

## 1. Kontextus és Problémafelvetés
A felhasználó a „Saját feladataim” (`/tasks`) oldalon azt tapasztalta, hogy míg az Iktatókönyvben (`/dossiers`) számos rá szignált ügyirat található felelősként, a feladatok oldal mindössze a `feladat` tábla 2 db rekordját listázta.
A korábbi implementációban a `/tasks` oldal kizárólag a `feladat` táblából kérdezte le a feladatokat, teljesen figyelmen kívül hagyva az `ugyirat` táblát és a szülő ügyekben tárolt felelős hozzárendeléseket (`ugy.felelos_user_id`).

A felhasználói követelmény alapján a Saját feladatok felületen meg kell jelennie:
1. Minden, a bejelentkezett felhasználóra (és helyettesítettjeire) szignált ügyiratnak (`ugy.felelos_user_id IN felelosIds`).
2. Minden olyan konkrét al-feladatnak (`feladat` tábla), amire a felhasználó felelősként lett kiválasztva (`feladat.felelos_user_id IN felelosIds`).

## 2. Megfontolt Alternatívák
- **1. Alternatíva (Csak nézetbeli összekapcsolás DB nézettel):** Postgres VIEW létrehozása az ügyiratok és feladatok uniójára. Bár adatbázis szinten tiszta, a jogosultsági és állapotmódosítási logika (pl. ügyirat státusz vs al-feladat státusz, audit naplózás) nehezebben paraméterezhető a meglévő Next.js Server Actionökből.
- **2. Alternatíva (Server oldali párhuzamos lekérdezés és típus-egyesítés - Kiválasztva):** A `/tasks/page.tsx` közvetlenül és típusbiztosan lekérdezi a felelősre szignált ügyiratokat (`ugyirat` + `ugy!inner`), valamint a dedikált al-feladatokat (`feladat`), mindkettőt a központi `Task` interfészre konvertálja determinisztikus azonosítókkal (`ugyirat_${id}` vs `feladat.id`), és egyesítve adja át a Kanban, Lista és Naptár nézeteknek.

## 3. Döntés
1. **Párhuzamos adatlekérés és leképezés (`page.tsx`):**
   - Lekérdezi az aktív cégben a felhasználóhoz rendelt ügyiratokat és al-feladatokat.
   - Vezetői szerepkörben támogatja az opcionális `?scope=all` paramétert az egész szervezeti áttekintéshez, míg az alapértelmezett nézet a személyes teendőkre fókuszál.
2. **Státusz leképezés:**
   - `iktatva`, `szignalt` -> `nyitott`
   - `ugyintezes_alatt`, `folyamatban` -> `folyamatban`
   - `elintezett`, `lezart`, `irattarban`, `selejtezheto`, `selejtezett` -> `kesz`
   - `elutasitott` -> `elutasitott`
3. **Állapotmódosítás és Kanban Drag-and-Drop (`task-actions.ts`):**
   - Az `updateTaskStatus` felkészítve az `ugyirat_` azonosítók kezelésére: ügyirat státusz frissítése (`iktatva` / `ugyintezes_alatt` / `elintezett`), szülő ügy státusz szinkronizálása és eseménynapló audit bejegyzés generálása.
   - Lezárási védelem: az ügyirat nem állítható `kesz` állapotba, ha van még befejezetlen al-feladata.
4. **Biztonságos dátumkezelés és NULL védelem:**
   - Minden nézetben (Kanban kártyák, lista sorok, naptár rács és részletező modálok) null-guard és érvényes dátum ellenőrzés védi a határidő nélküli ügyiratokat a dátum-konverziós hibáktól és az 1970-es fallback dátumoktól.
5. **Vizuális elkülönítés és szűrhetőség:**
   - Képernyőszintű badge-ek jelzik az `Ügyirat` (szignált főfeladat) és `Al-feladat` típusokat.
   - A `TaskList` szűrőfelületén tematikus szűrőcsoport biztosítja a típus szerinti szűrést.

## 4. Következmények és Előnyök
- A felhasználó az Iktatókönyvben látott összes szignált ügyiratát azonnal eléri és kezelheti a személyes Kanban/Lista/Naptár felületén.
- Megszűnt a határidő nélküli ügyiratok formázási anomáliája.
- Teljes integritás és audit naplózás érvényesül az ügyirat státuszváltásainál.

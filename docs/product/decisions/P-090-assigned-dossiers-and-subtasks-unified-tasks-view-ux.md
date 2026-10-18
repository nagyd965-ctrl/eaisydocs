# PRD P-090: Rám szignált ügyiratok és hozzáadott al-feladatok UX egységesítése [Docs]

- **Dátum:** 2026-10-18
- **Státusz:** `Decided`
- **Hatókör:** `[Docs]`
- **Kapcsolódó ADR:** [A-071](../../architecture/decisions/A-071-assigned-dossiers-and-subtasks-unified-tasks-view.md)
- **Érintett komponensek:** `src/app/tasks/page.tsx`, `src/app/tasks/kanban-board.tsx`, `src/app/tasks/task-list.tsx`, `src/app/tasks/task-calendar.tsx`

---

## 1. Felhasználói Igény és Célok
A felhasználó a Saját feladatok képernyőn a nevére szignált ügyiratokat és a közvetlenül hozzárendelt al-feladatokat egy helyen, átláthatóan és rendezetten kívánja megtekinteni és kezelni.
A korábbi működésben az Iktatókönyvben látható feladatok hiányoztak a feladatok oldalról, mivel az csak az al-feladat táblát listázta.

## 2. UX és Képernyő Tervezés
1. **Felső Fejléc és Nézetváltó:**
   - Cím: „Saját Feladataim” (alapértelmezés).
   - Vezetői szerepkör esetén diszkrét, flat nézetváltó kapcsoló:
     - `Saját feladataim (X)` (alapértelmezett, csak a személyes és helyettesített feladatok).
     - `Összes feladat` (szervezeti szintű áttekintés).
2. **Kártya és Táblázat Megjelenítés:**
   - **Típus jelölés:** `Ügyirat` badge (primer színnel kiemelve) a szignált főügyiratokhoz, és `Al-feladat` badge (semleges színnel) a belső feladatokhoz.
   - **Határidő megjelenítés:** Ha nincs határidő megadva, diszkrét dőlt „Nincs határidő” felirat jelenik meg, elkerülve a hibás „1970. 01. 01.” vagy NaN formázásokat.
   - **Közvetlen navigáció:** A kártyára vagy sorra duplán kattintva, illetve a felugró modálból egyetlen kattintással megnyitható az adott ügyirat adatlapja (`/dossiers/[id]`).
3. **Szűrési Lehetőségek (`TaskList`):**
   - A szabványos `TableToolbar` szűrőfelület kibővült „Feladat típusa” csoporttal (`Szignált ügyirat`, `Hozzáadott al-feladat`), így a felhasználó tetszés szerint szűrhet a teendők jellege szerint.
4. **Kanban Interakciók:**
   - A kártyák húzásakor az ügyiratok állapota valós időben frissül (`iktatva` -> `ugyintezes_alatt` -> `elintezett`).
   - Elutasítás oszlopba húzáskor a meglévő `TaskRejectDialog` nyílik meg, kötelezővé és átláthatóvá téve az indoklás megadását.

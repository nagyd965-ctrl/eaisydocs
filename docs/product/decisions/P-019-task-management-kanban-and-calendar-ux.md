# [Docs] P-019: Feladatkezelő Kanban Tábla, Lista és Naptár UX

## 1. Kontextus és Célkitűzés
Az ügyiratokhoz és bejövő iratokhoz szignált feladatok határidős teljesítésének támogatására egy dedikált feladatkezelő központ készült. A cél, hogy a munkatársak egyetlen nézetben láthassák a saját magukra szignált feladatokat, valamint a távollét miatt helyettesített kollégák teendőit is, Kanban táblán, táblázatos listában és havi naptárban.

## 2. Érintett Képernyők és Komponensek
- **Fő nézet:** `/tasks` (`src/app/tasks/page.tsx`)
- **Komponensek:**
  - `src/app/tasks/kanban-board.tsx`: Drag-and-drop és kattintásos státuszváltás 4 oszlopban: `Nyitott`, `Folyamatban`, `Kész`, `Elutasított`.
  - `src/app/tasks/task-list.tsx`: Kompakt táblázatos feladatlista határidő és felelős szerinti szűrőkkel.
  - `src/app/tasks/task-calendar.tsx`: Havi naptár, amely a feladatok határidejét jeleníti meg színkódolt eseményként.
  - `src/app/tasks/task-actions.ts`: `updateTaskStatus` (optimistic concurrency lockkal és eseménynaplóval), `createTask` (in-app értesítés küldésével a felelősnek).

## 3. Felhasználói Interakciók és Folyamatok
1. **Feladat Kiírása Ügyiratból:** Az ügyintéző vagy vezető az ügyirat adatlapon (`/dossiers/[id]`) megadja a feladat leírását, határidejét és a kijelölt kollégát. A rendszer automatikus in-app értesítést küld (`alkalmazas_ertesites`) az érintettnek.
2. **Helyettesítési Integráció:** Ha a belépett felhasználó éppen helyettesít valakit (a `helyettesites` tábla alapján), a rendszer automatikusan betölti a helyettesített személy feladatait is.
3. **Állapotváltás és Ütközésvédelem:** A státusz módosításakor a rendszer ellenőrzi, hogy más nem módosította-e a feladatot azóta, és bejegyzi a változást az `esemeny_naplo`-ba.

# PRD P-047: Ügyirat Életciklus, Szakmai Elintézés és Lezárási Architektúra UX

- **Dátum:** 2026-10-04
- **Státusz:** Elfogadva
- **Hatókör:** `[Docs]` (eaisyDocs Iratkezelési és Ügyirat Életciklus Rendszer)
- **Kapcsolódó ADR / Szabályzat:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-046](./P-046-task-rejection-and-eaisyhr-ui-unification-ux.md), `eaisyDocs_szoftverterv.md`

---

## 1. Kontextus és Problémafelvetés

Az eaisyDocs rendszerben az ügyiratokhoz (pl. bejövő számlák, szerződések, hivatalos megkeresések) feladatok rendelhetők a felelős munkatársak számára (pl. „Számla szakmai igazolása”, „Válaszlevél megfogalmazása”).

A korábbi megvalósításban két súlyos fogalmi és logikai hiba állt fenn:
1. **Fogalmi és elhelyezési zűrzavar (UX Scope Flaw):**
   - Az *„Elintézettnek jelölés”* gomb a Feladatok tabon, a feladatlista kártya fejlécében kapott helyet közvetlenül a `+ Új Feladat` gomb mellett.
   - Ez azt a látszatot keltette, mintha magát a feladatot intézné el a felhasználó, miközben az a háttérben az egész ügyiratot (és számlát / ügyet) `elintezett` globális státuszba léptette át.
   - A fő fejlécben eközben egyáltalán nem volt lehetőség az ügyirat szakmai elintézésére, csak a közvetlen *„Lezárás és Irattározás”* gomb, amit egy ügyintéző le sem futtathatott.
2. **Kritikus logikai hiba (Elutasított feladat = Kész feladat?):**
   - A korábbi számítási formula:
     ```typescript
     const allTasksDone = totalTasks > 0 && completedTasks + rejectedTasks === totalTasks;
     ```
   - Ha egy feladatot elutasítottak (pl. hibás számlaösszeg vagy téves címzés miatt: `completedTasks = 0`, `rejectedTasks = 1`), a fenti kifejezés `0 + 1 === 1` alapján `true`-ra értékelt!
   - Ennek következtében a gomb aktívvá vált, és a felhasználó elintézettnek jelölhette az ügyiratot annak ellenére, hogy a rábízott munka **el lett utasítva**, azaz érdemben nem valósult meg.

---

## 2. Termék és UX Döntés (Az Új Kétfázisú Életciklus Koncepció)

A szakmai iratkezelési szabályzatoknak és jogszabályoknak megfelelően kettéválasztjuk a szakmai ügyintézés befejezését és a hivatalos irattározást:

```
[Iktatva / Szignálva / Ügyintézés alatt]
                  │
                  ▼  (Minden feladat 100% KÉSZ, 0 elutasított feladat!)
            [Elintézett]  ◄───►  [Visszahelyezés ügyintézésbe]
                  │
                  ▼  (Vezető / Irattáros jóváhagyás, megőrzési idő indítás)
       [Lezárt / Irattárban] (Végleges archív állapot)
```

### 2.1. Fázis 1: Szakmai Elintézés („Ügyirat elintézése” / `elintezett`)
- **Ki jogosult rá?** Az ügyintéző (felelős), vezető, iktató vagy admin.
- **Szigorú üzleti validáció:**
  - Ha vannak feladatok az ügyiratban:
    - Kizárólag akkor engedélyezett, ha **minden feladat sikeresen lezárult** (`completedTasks === totalTasks`).
    - **Szigorúan tilos az elintézés, ha akárcsak 1 db elutasított feladat is található** (`rejectedTasks === 0`). Az elutasított feladatot előbb tisztázni, felülvizsgálni vagy újból kiadni szükséges!
    - Tilos az elintézés, ha nyitott vagy folyamatban lévő feladat van.
  - Ha nincsenek feladatok az ügyiratban: az ügyintéző közvetlenül elintézettre állíthatja az ügyiratot a szakmai vizsgálat lezárultával.
- **Visszanyitási lehetőség:** Ha az elintézett ügyiratban mégis új teendő merülne fel, egyetlen kattintással visszatehető `ugyintezes_alatt` státuszba (*„Visszahelyezés ügyintézésbe”*).

### 2.2. Fázis 2: Végleges Lezárás és Irattározás (`irattarban`)
- **Ki jogosult rá?** Irattáros, iktató, vezető vagy adminisztrátor (`!isUgyintezo && canEdit`).
- **Működés:**
  - Automatikusan kiszámítja a megőrzési idő végét az irattári tétel alapján (`megorzesi_ido_vege`).
  - Az ügyirat állapota `irattarban` lesz, és tartalma véglegesen zárolódik.
  - Szerver oldalon is blokkolva van, ha rendezetlen vagy elutasított feladatok maradtak benne.

---

## 3. Felhasználói Felület (UI / UX Implementáció)

### 3.1. Kanonikus Fő Fejléc Életciklus Kezelő (`DossierLifecycleActions`)
Az ügyirat oldal fejlécében (`src/app/dossiers/[id]/page.tsx`), a státusz badge mellett dinamikusan jelennek meg az állapothoz illeszkedő vezérlők:
1. **Ha az ügyirat `ugyintezes_alatt` (vagy `iktatva`, `szignalt`):**
   - Megjelenik az **„Ügyirat elintézése”** gomb (`CheckCircle2` ikonnal).
   - Rákattintva egy megerősítő párbeszédablak ellenőrzi a feladatok állapotát:
     - Ha van elutasított feladat: piros alert doboz mutatja a hibát, a megerősítő gomb tiltott.
     - Ha van függő feladat: sárga alert doboz mutatja a nyitott tételeket, a megerősítő gomb tiltott.
     - Ha minden feladat kész (vagy nincs feladat): zöld megerősítés, és aktív az „Elintézettként megerősítés” gomb.
2. **Ha az ügyirat `elintezett`:**
   - Zöld `Elintézett` státuszjelvény.
   - **„Lezárás és Irattározás”** gomb az irattározásra jogosultaknak.
   - **„Visszahelyezés ügyintézésbe”** gomb a jogosult szerkesztőknek (finom ghost stílusban).
3. **Ha az ügyirat `irattarban`, `lezart`:**
   - Olvasási archív mód, lezárási gombok nélkül.

### 3.2. A Feladatok Tab Megtisztítása (`src/components/tasks-tab.tsx`)
1. **A kártya fejlécéből eltávolítottuk** az oda nem illő és megtévesztő gombot. A fejlécben kizárólag a feladatok címe, a darabszámláló és a `+ Új Feladat` gomb szerepel.
2. **Elutasított feladat figyelmeztetés:**
   - Ha `rejectedTasks > 0`, a feladatlista tetején egy piros figyelmeztető doboz jelenik meg:
     *„⚠️ Elutasított feladat az ügyiratban (X db). Az ügyiratban elutasított feladat található, ami akadályozza az ügyirat elintézettként történő lezárását. Kérjük vizsgálja felül a feladatot (újra kiadás vagy egyeztetés a felelőssel).”*
3. **Siker és Elintézés Banner:**
   - Ha minden feladat lezárult (`completedTasks === totalTasks && rejectedTasks === 0 && totalTasks > 0`):
     - Ha még nincs elintézve: diszkrét zöld banner jelenik meg a feladatok felett a közvetlen *„Ügyirat elintézése”* műveleti gombbal.
     - Ha már elintézett: visszafogott státuszjelzés igazolja a teljesítést.

---

## 4. Szerver Oldali Védelem és Audit Naplózás

- A `src/app/dossiers/[id]/actions.ts` modulban az `updateDossierStatus` és a `closeDossier` szerver actionök közvetlenül az adatbázis lekérdezéssel ellenőrzik a `feladat` rekordokat:
  - Bármilyen kliens oldali megkerülési kísérlet esetén azonnali hibát adnak, ha elutasított vagy lezáratlan feladat található.
- Az állapotváltozáskor az `esemeny_naplo` táblába `elintezve` vagy `modositva` típusú audit rekord kerül mentésre, amely a timeline-on zöld pipával és pontos leírással jelenik meg.

---

## 5. Érintett Fájlok

- `src/components/dossier-lifecycle-actions.tsx` (Új kanonikus életciklus vezérlő komponens)
- `src/app/dossiers/[id]/page.tsx` (Fejléc integráció, timeline mapping `elintezve`-re)
- `src/components/tasks-tab.tsx` (Hibás gomb eltávolítása, validáció javítása, figyelmeztető bannerek)
- `src/app/dossiers/[id]/actions.ts` (Szerver oldali feladat-ellenőrzés `elintezett` és `irattarban` átmeneteknél)

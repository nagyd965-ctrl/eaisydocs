# PRD P-083: Értesítési Kiküldési Napló Központi Audit Fül és Beállítások Tisztítás UX

- **Státusz:** Approved
- **Dátum:** 2026-10-16
- **Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [ADR A-064](../architecture/decisions/A-064-notification-dispatch-audit-centralization-architecture.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md)

---

## 1. Felhasználói Igény és Célkitűzés

A felhasználók és adminisztrátorok számára zavaró volt, hogy az értesítési szabályok (`/settings`) alatt egy korlátozott funkcionalitású, elrejtett táblázatban jelent meg a kiküldési napló, miközben minden más rendszerszintű audit és felügyeleti tevékenység a Központi Eseménynaplóban (`/audit`) történik.

**Fő UX célok:**
1. A Központi Eseménynapló oldal két egyenrangú fülre bontása: *Rendszernapló (Audit)* és *Kiküldési Napló (Értesítések)*.
2. Teljes funkcionalitású felület biztosítása a kiküldések vizsgálatára: gyorskeresés, csatorna/státusz/kategória szűrők, dátumtartomány választás, CSV export, részletes üzenet előnézet.
3. A Beállítások oldal tehermentesítése és egyértelmű átvezetés biztosítása az új audit fülre.

## 2. Képernyő és UI Specifikáció

### 2.1. Központi Audit Oldal (`/audit`)
- **Fülek elrendezése:**
  - `Tabs` navigáció a lap tetején a fejléc alatt:
    - `Rendszernapló (Audit)`: Az iratkezelési és rendszeresemények táblázata.
    - `Kiküldési Napló (Értesítések)`: Az elküldött e-mailek és SMS-ek táblázata és statisztikái.
  - Az aktív fül kétirányúan szinkronizálódik az URL-lel: `/audit?tab=kikuldesi_naplo`.
- **Kiküldési Napló fül elemei:**
  - **KPI Kártyasor (Linear Flat):** 4 darab `KpiCard` tiszta tipográfiával (Összes kiküldés, Sikeres kézbesítés ráta, Kézbesítési hiba, Címzettek száma). Nincsenek kerekített színes ikondobozok vagy vastag bal szegélyek.
  - **`TableToolbar` vezérlősáv:**
    - Keresőmező instant gépeléses szűréssel (címzett, tárgy, iktatószám, üzenettartalom).
    - Zöld/teal `Szűrés` gomb popoverrel:
      - Csatorna (E-mail, SMS).
      - Kézbesítési állapot (Sikeres, Hibás, Folyamatban).
      - Kategória (Docs, HR, Rendszer).
      - Dátumtartomány gyorsgombokkal (Mind, Ma, 7 nap, 30 nap).
    - Oszlopok testreszabása gomb (`Columns3` ikon).
  - **Kézbesítési Táblázat:**
    - Oszlopok: Időpont, Csatorna, Címzett, Tárgy & Kategória, Üzenet (rövid kivonat), Kapcsolódó Ügyirat (kattintható iktatószám badge), Kiváltó személy, Kézbesítési Állapot (`StatusBadge`).
    - Kattintható sorok vagy részletek gomb: Megnyitja a Betekintő Dialógust.
  - **Kézbesítési Részletek Dialógus (`Dialog`):**
    - Modal ablak a teljes levél / SMS tartalom megtekintésére.
    - Technikai metaadatok: Kézbesítés ideje, csatorna, címzett, kiváltó ügyintéző, ügyiratszám.
    - Hibás státusz esetén vörös figyelmeztető doboz a pontos hibaok leírásával.

### 2.2. Beállítások Oldal (`/settings`)
- Az *Értesítések* fülről a lassú, szűretlen statikus táblázat, valamint az átvezető kártyák teljesen kivezetésre kerültek:
  - A beállítások kizárólag az értesítési szabályok (határidő, szignálás) be- és kikapcsolására, valamint csatornaválasztásra szolgálnak.
  - A kiküldési naplózás elérése kizárólag a logikus, dedikált helyén, a bal oldalsávból elérhető Központi Eseménynapló (`/audit?tab=kikuldesi_naplo`) felületén történik.

## 3. Megfelelőség a Rendszer Szabályainak

- **Linear Flat Design (.agents/AGENTS.md):** 1px finom szegélyek, árnyékmentes felépítés, standard szemantikus HSL színek.
- **Kanonikus Komponensek (ADR A-029):** Kizárólag a szabványos `KpiCard`, `TableToolbar` és `StatusBadge` komponensek használata.

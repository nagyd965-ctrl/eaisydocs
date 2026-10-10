# P-069 [Docs] eaisyDocs Központi Eseménynapló Újragondolása, Kanonikus Toolbar és Többdimenziós Szűrés UX

- **Dátum:** 2026-10-10
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kategória:** Central Audit & Compliance
- **Kapcsolódó döntések:** [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-065](P-065-canonical-audit-log-formatting-ux.md), [P-067](P-067-eaisyhr-central-audit-log-overhaul-and-unified-filtering-ux.md), [A-050](../../architecture/decisions/A-050-eaisydocs-central-audit-log-overhaul.md)

## 1. Felhasználói Igény és Problémafelvetés
Az eaisyDocs rendszerben korábban a rendszeresemények naplója a Beállítások felület legalján helyezkedett el ("Globális Audit Napló"). A megoldás több szempontból sem felelt meg az elvárásoknak:
1. **Elérhetőség:** A beállítások oldal legaljára görgetni kényelmetlen volt, az auditorok és vezetők nem találták meg.
2. **Különböző felületek a modulok között:** Míg az eaisyHR-ben már elkészült a modern, kártyás, szűrős központi eseménynapló ([P-067](P-067-eaisyhr-central-audit-log-overhaul-and-unified-filtering-ux.md)), addig az eaisyDocs-ban még a régi, kezdetleges táblázat működött.
3. **Hiányzó vizuális hierarchia és szűrés:** Nem lehetett dátumintervallumra, konkrét kollégára vagy műveleti típusra (iktatás, módosítás, törlés) szűrni.

## 2. Termék és UX Megvalósítás

### 2.1 Dedikált Navigáció az Oldalsávban
- Az oldalsávban (`app-sidebar.tsx`) a legfontosabb iratkezelési modulok között megjelent az **"Eseménynapló"** menüpont (`ShieldAlert` ikonnal).
- Az útvonal: `/audit`.

### 2.2 Fejléc és KPI Statisztikai Sáv
- **Fejléc:**
  - Cím: "Központi Eseménynapló"
  - Leírás: "Rendszerszintű, append-only hitelesített audit napló. Iratok, ügyiratok és feladatok változáskövetése."
  - Aktív Cég Jelvény: `Building2` ikonnal mutatja a jelenleg kiválasztott céget.
  - Frissítés gomb és UTF-8 BOM kódolású CSV export gomb.
- **4 db Kanonikus KpiCard (Linear Flat Stílus):**
  1. `Összes Audit Esemény`: Az aktív céghez tartozó összes naplózott esemény száma.
  2. `Irat Betekintés & Letöltés`: Biztonsági olvasási/megtekintési események száma.
  3. `Iktatások & Módosítások`: Létrehozási, iktatási és módosítási tranzakciók száma.
  4. `Közreműködő Felhasználók`: Az audit naplóban szereplő egyedi felhasználók száma.

### 2.3 Kanonikus TableToolbar és Szűrőrendszer
- **Keresőmező:** Azonnali gépelési szűrés a felhasználó nevére, az esemény típusára, az entitás azonosítójára vagy az indoklásra.
- **Dátumválasztó és Gyorsgombok:** "Mind", "Ma", "7 nap", "30 nap" gyorsválasztók, valamint naptári egyedi dátumtartomány választás.
- **Szűrés Popover:**
  - Végrehajtó felhasználók dinamikus checkbox listája.
  - Művelet kategóriák (Betekintés/Megnyitás, Iktatás/Létrehozás, Módosítás, Szignálás, Selejtezés, Lezárás).
  - Entitás típusok (Irat, Ügyirat, Irattári tétel, Helyettesítés, Rendszer).
- **Oszlopválasztó Popover:** Oszlopok ki- és bekapcsolása.

### 2.4 Audit Eseménylista és Szemantikus Jelvények
- A táblázatban megjelenő oszlopok:
  - **Időpont:** Formázott dátum és idő (óra:perc:másodperc).
  - **Munkatárs:** Felhasználó neve és szerepköre badge-ben.
  - **Művelet:** Színes szemantikus jelvény és magyar elnevezés.
  - **Érintett Entitás:** Entitás típus és azonosító/iktatószám.
  - **Részletek:** Emberileg olvasható, kontextuális leírás ([A-046](A-046-canonical-audit-log-formatting-engine.md)).
  - **Művelet gomb:** "Megnyitás" gomb a mélyreható részletekhez.

### 2.5 Részletes Audit Vizsgáló Modál
- A sorra vagy a "Megnyitás" gombra kattintva felugró modális ablak:
  - **Közreműködő és Hálózat Kártya:** Név, szerepkör, IP cím és böngésző User-Agent.
  - **Esemény Metaadatok Kártya:** Pontos időbélyeg, cégazonosító, entitás típus és ID.
  - **Értékváltozás (Diff) Tábla:** Ha az esemény tartalmazott korábbi és új értéket, a kulcs-érték párok összehasonlító táblázatban jelennek meg (régi érték áthúzva pirosan, új érték zölden kiemelve).

## 3. Üzleti Hatás és Felhasználói Előnyök
- **Bizalom és Transzparencia:** Bármilyen iratmozgás, letöltés vagy módosítás azonnal és érthetően visszakereshető.
- **Kényelem:** Az auditorok egyetlen kattintással elérhetik a naplót közvetlenül az oldalsávról.
- **Multi-tenant Védelem:** A különböző cégek adatai nem keverednek, a kiválasztott céghez tartozó napló izoláltan vizsgálható és exportálható.

# A-050 [Docs] eaisyDocs Központi Eseménynapló Architektúra és Dedikált Modul

- **Dátum:** 2026-10-10
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-008](A-008-append-only-audit-event-log-integrity.md), [A-029](A-029-global-ui-consistency-and-unified-components.md), [A-046](A-046-canonical-audit-log-formatting-engine.md), [A-048](A-048-eaisyhr-central-audit-log-overhaul-and-query-hardening.md), [P-069](../../product/decisions/P-069-eaisydocs-central-audit-log-overhaul-ux.md)

## 1. Kontextus és Problémafelvetés
Az eaisyDocs rendszerben a globális eseménynapló korábban kizárólag a Beállítások felület legalján (`/settings` - "Rendszerbeállítások" fül) volt elérhető egy statikus, 200 elemes nyers táblázat formájában:
1. **Elszigeteltség és nehézkes hozzáférés:** A vezetői és auditori felhasználók nem találták meg az audit naplót, mivel az mélyen a rendszergazdai beállítások alá volt rejtve.
2. **Kanonikus UI és szűrés hiánya:** Nem követte a rendszer standard `TableToolbar` és `KpiCard` architektúráját ([A-029](A-029-global-ui-consistency-and-unified-components.md)). Nem volt dátumszűrés, felhasználói és kategória szűrő, sem oszlopválasztó.
3. **Nyers technikai megjelenítés:** A technikai eseménykódok (`irattarba_helyezve`, `megnyitas`, `modositas`) nyers szövegként jelentek meg, hiányzott a kanonikus [A-046](A-046-canonical-audit-log-formatting-engine.md) szemantikus formázó motor integrációja.
4. **Hiányzó többcég-kezelés és részletező nézet:** A korábbi nézet nem támogatta a dinamikus cégváltást (`useCompany()`), és nem nyújtott mélyreható JSON diff megtekintési lehetőséget a változások ellenőrzésére.

## 2. Architektúra Döntés

### 2.1 Dedikált Főútvonal és Oldalsáv Navigáció (`/audit`)
- Az audit naplót kiemeltük a beállítások alól, és egy dedikált, legfelső szintű útvonalra (`src/app/audit/page.tsx`) helyeztük.
- Az oldalsáv navigációba (`app-sidebar.tsx`) bekerült az **"Eseménynapló"** menüpont (`ShieldAlert` ikonnal), amely szerepkörhöz kötötten (`admin`, `rendszergazda`, `auditor`, `vezeto`) jelenik meg.
- A korábbi beállítások oldalról (`/settings`) a redundáns kódot és a szerveroldali felesleges adatlekérést (`getGlobalisAuditNaplo()`) maradéktalanul kivezettük.

### 2.2 Szerver Művelet és Adatbázis Kapcsolat (`src/app/audit/actions.ts`)
- **Jogosultsági Ellenőrzés:** A `getDocsCentralAuditLogs` Server Action ellenőrzi a felhasználó jogosultságát (`admin`, `rendszergazda`, `auditor`, `vezeto`). Jogosulatlan kérés esetén azonnali hibát dob.
- **Append-Only Napló Lekérdezés:** A Supabase admin klienst alkalmazza a szigorú append-only `esemeny_naplo` rekordok lekérésére, szűrve az aktív `company_id`-ra (ha megadott).
- **Relációs Feloldás és Teljesítmény:** Mivel a PostgREST séma gyorsítótárában nincs közvetlen FK kapcsolat az `esemeny_naplo.user_id` és `felhasznalo_profil.id` között, a szerver művelet egyetlen optimalizált batch lekérdezéssel (`.in("id", userIds)`) oldja fel a felhasználók nevét, szerepkörét és beosztását, elkerülve a PostgREST join hibákat.
- **Kanonikus Formázás:** A naplóbejegyzések átfutnak a központi `formatAuditLogEvent` motoron ([A-046](A-046-canonical-audit-log-formatting-engine.md)), amely kifejező magyar leírást, kontextust és metaadatokat generál.

### 2.3 Szemantikus Eseményszótár és Kategóriák (`DOCS_EVENT_CONFIG`)
A felületen 6 logikai műveleti kategóriát határoztunk meg:
- `view`: Megtekintés, betekintés, letöltés (Info / Cyan stílus)
- `create`: Érkeztetés, feltöltés, iktatás, létrehozás (Success / Zöld stílus)
- `update`: Módosítás, átnevezés, verziókészítés (Warning / Sárga stílus)
- `assignment`: Szignálás, feladatkiosztás, átadás (Primary / Kék stílus)
- `disposal`: Selejtezés, levéltár, selejtezési javaslat (Destructive / Piros stílus)
- `close`: Lezárás, elintézés, irattárba helyezés (Muted / Szürke stílus)

### 2.4 Többcég-kezelés és Valós Idejű Szűrés
- A kliens komponens beemeli a `useCompany()` hookot. A felső sávban cégváltás esetén a napló azonnal újratöltődik az adott cég azonosítójával (`selectedCompany.id`).
- A fejléc dinamikusan jelzi az aktív céget (`Building2` ikon és Company Name badge).

### 2.5 Audit Részletek Modál és Diff Megjelenítés
- Bármely esemény sorára vagy a "Megnyitás" gombra kattintva megnyílik az audit részletező modál (`Dialog`).
- Külön kártyán jelenik meg a közreműködő felhasználó (név, szerepkör, IP cím, böngésző User-Agent).
- Ha az esemény tartalmaz `elozo_ertek` és `uj_ertek` JSON metaadatot, a rendszer egy összehasonlító diff táblázatban jeleníti meg a változásokat (kulcs, régi érték, új érték piros/zöld színezéssel).

### 2.6 Excel-kompatibilis UTF-8 BOM CSV Export
- A fejlécben található CSV export funkció UTF-8 BOM (`\uFEFF`) bájtsorrend-jelölővel menti a fájlt, így a magyar ékezetes karakterek közvetlenül és hibátlanul nyílnak meg a Microsoft Excelben.

## 3. Következmények és Előnyök
- **Egységes Rendszerélmény:** Az eaisyDocs és az eaisyHR központi audit naplója teljesen azonos felépítésűvé vált, azonos design tokenekkel és kanonikus komponensekkel (`KpiCard`, `TableToolbar`).
- **Biztonsági Megfelelőség:** Belső és külső vizsgálatok során az auditorok másodpercek alatt áttekinthetik az iratkezelési életciklus eseményeit, szűrhetnek dátumra, személyre és művelettípusra.
- **Karbantarthatóság:** A beállítások oldal tiszta és gyors maradt, a korábbi feleslegesen betöltött naplóadatok elhagyásával csökkent a hálózati adatforgalom.

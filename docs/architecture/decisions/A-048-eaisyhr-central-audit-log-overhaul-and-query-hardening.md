# A-048 [HR] eaisyHR Központi Eseménynapló Architektúra és Lekérdezés Keményítés

- **Dátum:** 2026-10-10
- **Státusz:** Decided
- **Hatókör:** [HR]
- **Kapcsolódó döntések:** [A-029](A-029-global-ui-consistency-and-unified-components.md), [A-047](A-047-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md), [P-067](../../product/decisions/P-067-eaisyhr-central-audit-log-overhaul-and-unified-filtering-ux.md)

## 1. Kontextus és Problémafelvetés
Az eaisyHR központi eseménynaplója (`/hr/audit`) eredetileg egy kezdetleges prototípus volt, amely közvetlen `SELECT * FROM hr_esemeny_naplo` lekérdezést futtatott. A felületen a következő súlyos hiányosságok és hibák mutatkoztak:
1. **Nem létező oszlop joinhiba:** A PostgREST join `felhasznalo_profil(nev, hr_szerepkor, email)` lekérdezése 42703-as SQL hibával elbukott (`column felhasznalo_profil_1.email does not exist`), mivel a `felhasznalo_profil` nem tartalmaz `email` mezőt (az e-mail cím az `auth.users` táblában található). A hiba a böngészőben üres objektumként jelent meg (`Hiba a napló lekérésekor: {}`), blokkolva a betöltést.
2. **Kanonikus komponensek hiánya:** Nem volt illesztve a rendszer szabványos `TableToolbar` és `KpiCard` architektúrájához ([A-029](A-029-global-ui-consistency-and-unified-components.md)).
3. **Hiányzó szűrési és lapozási architektúra:** Több ezer esemény esetén a teljesítmény leromlott, nem volt végrehajtó, művelettípus vagy modul szerinti szűrési lehetőség.

## 2. Architektúra Döntés

### 2.1 PostgREST Kapcsolati Séma Keményítése
- A `felhasznalo_profil` joinból eltávolítottuk a nem létező `email` oszlopot. Helyette a létező és üzletileg releváns mezőket kérjük le:
  ```typescript
  felhasznalo_profil:felhasznalo_id ( nev, hr_szerepkor, pozicio )
  ```
- A hibakezelést robusztussá tettük: `error.message` explicit kiolvasásával a konzol és a felhasználói felület pontos hibaüzenetet kap silent fail és `{}` helyett.

### 2.2 Szemantikus Esemény- és Entitásszótár
Az alkalmazásszinten bevezettük a `HR_ENTITY_CONFIG` és `HR_EVENT_CONFIG` motorokat:
- Az adatbázis táblaneveket (`hr_dolgozo_titkos_adat`, `hr_munkavedelmi_oktatas`, `hr_cafeteria_keret` stb.) magyar elnevezésekre és szakterületi kategóriákra képezzük le.
- Az eseménytípusokat 6 logikai kategóriára osztjuk (`read`, `create`, `update`, `approval`, `delete`, `system`), mindegyikhez szabványos HSL szemantikus stílust és ikont rendelve.

### 2.3 Kanonikus TableToolbar és Többdimenziós Szűrés
- A szűrési réteg illeszkedik a központi `TableToolbar` architektúrához:
  - Dinamikusan generált végrehajtói checkbox lista a naplóban szereplő felhasználókból.
  - Művelettípus és modulkategória szűrőcsoportok.
  - Dátumtartomány szűrő ISO normalizációval és gyorsgombokkal (Mind, Ma, 7 nap, 30 nap).
  - Oszlop-testreszabás és kliensoldali rendezett pagináció (15/25/50/100).

### 2.4 Excel-kompatibilis CSV Export Motor
- Kliensoldali CSV generátor UTF-8 BOM (`\uFEFF`) fejléccel, amely garantálja az ékezetes magyar karakterek (ő, ű, á, é) hibátlan megjelenítését a Microsoft Excelben. A CSV export fájlnévben és soraiban a cég neve is rögzítésre kerül.

### 2.5 Többcég-kezelés (Multi-Tenancy) és Szigorú GDPR Hatókör Izoláció
- **Kliensoldali Szűrés:** A felület beemeli a `useCompany()` hookot, és a `hr_esemeny_naplo` lekérdezést szigorúan az aktív cég azonosítójára szűri (`.eq("company_id", selectedCompany.id)`). Amikor a felhasználó a felső menüben átvált egy másik cégre, a napló, a statisztikai KPI kártyák és a szűrők azonnal újratöltődnek a kiválasztott cég adataival.
- **Fejléc és Részletek Cégjelzés:** A fejlécben és az esemény részletező modalban kiemelten látható az érintett cég neve és jelvénye.
- **Automatikus Adatbázis Trigger (`trg_hr_esemeny_naplo_company_id`):**
  Létrehoztunk egy PostgreSQL triggert és indexet (`idx_hr_esemeny_naplo_company_id_created_at`), amely garantálja, hogy ha egy új naplóbejegyzés `company_id` nélkül érkezik, az adatbázis automatikusan feloldja a végrehajtó felhasználóhoz tartozó tagsági cégazonosítót (`company_members`), megakadályozva a gazdátlan bejegyzések keletkezését.

## 3. Következmények és Előnyök
- **Stabilitás:** Nincs többé PostgREST schema mismatch hiba a napló lekérdezésekor.
- **Rendszeregység:** A felület 100%-ban megfelel a rendszer kanonikus irányelveinek (`TableToolbar`, `KpiCard`, Linear flat stílus).
- **Megfelelőség & GDPR:** Az események cég szerint szigorúan szeparáltak; a különböző cégek eseményei nem keverednek, a munkaügyi auditok tisztán exportálhatók cégbontásban.

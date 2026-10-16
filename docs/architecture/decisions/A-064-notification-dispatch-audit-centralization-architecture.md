# ADR A-064: Értesítési Kiküldési Napló Központosítása és Egységes Audit Architektúra

- **Státusz:** Decided
- **Dátum:** 2026-10-16
- **Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)
- **Döntéshozók:** Rendszertervező Csapat & Termékfejlesztés
- **Kapcsolódó döntések:** [ADR A-008](./A-008-append-only-audit-event-log-integrity.md), [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](../../product/decisions/P-043-global-ui-consistency-and-unified-components.md), [PRD P-083](../../product/decisions/P-083-notification-dispatch-audit-centralization-ux.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyDocs rendszerben az értesítési szabályok (`ertesitesi_szabaly`) és a tényleges kiküldési kísérletek naplója (`ertesites_naplo`) korábban a Rendszerbeállítások felületén (`/settings` -> *Értesítések* fül) kapott helyet egy egyszerűsített, statikus táblázat formájában. 

Ez a struktúra több szempontból is architekturális és felhasználói élménybeli hiányosságokat okozott:
1. **Felelősségi Körök Keveredése (Separation of Concerns):** A Beállítások oldal a konfigurációra (szabályok, csatornák ki-/bekapcsolása) szolgál. A naplók böngészése, szűrése, hibakeresése (pl. kézbesítési hiba oka, SMTP válaszok) és az auditálás nem beállítási feladat, hanem audit/biztonsági feladat.
2. **Teljesítményromlás a Beállítások oldalon:** A `/settings` oldal minden betöltéskor feleslegesen kérdezte le a teljes `ertesites_naplo` táblát a szerveren, holott az adminok többnyire csak céges/személyes adatokat vagy értesítési kapcsolókat szerettek volna módosítani.
3. **Funkcionális Inkonzisztencia és Korlátozottság:** A beállítások alatti statikus táblázat nem rendelkezett szűrési lehetőséggel, dátumtartomány-választóval, keresővel, KPI mérőszámokkal, lapozással, exportálási funkcióval vagy részletes megtekintő dialógussal, ellentétben a Központi Eseménynaplóval (`/audit`).

## 2. Döntés

Úgy döntöttünk, hogy a **Kiküldési Naplót áthelyezzük a Központi Eseménynapló (`/audit`) oldalra egy dedikált, második fülként**, és a Beállítások oldalt tehermentesítjük:

1. **Kétfülös Központi Audit Architektúra (`/audit`):**
   - **1. fül:** `Rendszernapló (Audit)` (`value="rendszernaplo"`): Az iratkezelési és jogosultsági műveletek append-only audit trailje (`esemeny_naplo`).
   - **2. fül:** `Kiküldési Napló (Értesítések)` (`value="kikuldesi_naplo"`): Az e-mail és SMS kézbesítési kísérletek audit trailje (`ertesites_naplo`).
   - **URL Query Szinkronizáció:** A fülek állapota az URL `?tab=` paraméteréhez van kötve (`useSearchParams`, `router.replace`), lehetővé téve a közvetlen linkelést (deep linking) és a böngészős navigációt.

2. **Szerveroldali Audit Lekérdező Akció (`getNotificationAuditLogs`):**
   - Helye: `src/app/audit/actions.ts`.
   - Cég-szintű biztonságos szűrés és multi-tenant izoláció (`companyId`).
   - Relációs feloldás:
     - Kapcsolódó ügyirat adatok joinja (`ugyirat:ugyirat_id (id, iktatoszam, targy, company_id)`).
     - Kiváltó felhasználó nevének feloldása a `felhasznalo_profil` táblából.
     - Kategória detektálás a tárgy alapján (`docs` / `hr` / `system`).

3. **Kanonikus Linear Flat UI/UX Implementáció (`NotificationAuditTab`):**
   - **KPI Kártyasor:** 4 db kanonikus `KpiCard` (Összes kiküldés, Sikeres kézbesítés ráta, Kézbesítési hiba, Címzettek száma) szigorúan ikonok és díszítő elemek nélkül, ADR A-029 szerint.
   - **Szabványos `TableToolbar`:**
     - Valós idejű szabadszavas keresés (címzett, tárgy, iktatószám, üzenet).
     - Strukturált szűrőcsoportok: *Csatorna* (E-mail, SMS), *Státusz* (Sikeres, Hibás, Folyamatban), *Kategória* (Docs, HR, Rendszer).
     - Dátumtartomány szűrő gyorsgombokkal (Mind, Ma, Elmúlt 7 nap, Elmúlt 30 nap).
     - Dinamikus oszlopválasztó popover.
   - **Kompakt Táblázat:** Státuszjelvények, csatorna címkék, közvetlen ügyirat linkek iktatószámmal, kiváltó személy megnevezése.
   - **Részletes Üzenet Betekintő:** Modális dialógus (`Dialog`), amely megjeleníti a teljes üzenettörzset, technikai részleteket és a kézbesítési hibát.
   - **CSV Exportálás & Lapozás:** Teljes körű kliensoldali CSV export BOM támogatással a helyes ékezetkezelésért, és reszponzív lapozó.

4. **Beállítások Felület Tisztítása (`/settings`):**
   - Eltávolítottuk a szerveroldali `ertesites_naplo` lekérdezést a `src/app/settings/page.tsx`-ből, azonnali sebességnövekedést biztosítva.
   - Az `src/app/settings/notification-settings.tsx`-ben a korábbi felesleges táblázat helyére egy letisztult információs kártya került, amely közvetlen átvezető gombot nyújt az új audit fülre (`/audit?tab=kikuldesi_naplo`).

## 3. Következmények és Eredmények

- **Tisztább felelősségi körök:** Minden auditálással és ellenőrzéssel kapcsolatos napló egyetlen dedikált menüpont alatt érhető el (`/audit`).
- **Optimalizált teljesítmény:** A Beállítások felület gyorsabban renderelődik, nem tölt be több száz naplóbejegyzést feleslegesen.
- **Tökéletes UI harmónia:** A Kiküldési Napló mostantól 100%-ban megfelel az ADR A-029 kanonikus komponens és Linear flat design irányelveinek.

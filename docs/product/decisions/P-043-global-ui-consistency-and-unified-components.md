# [Közös] P-043: Globális UI/UX Egységességi Irányelv és Egységesített Képernyőfelépítés

**Státusz:** Decided  
**Dátum:** 2026-10-02  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kategória:** `UI/UX Standards / Component Reusability`  
**Kapcsolódó ADR:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó Kód:** `src/components/table-toolbar/table-toolbar.tsx`, `src/components/document-viewer.tsx`, `src/components/partner-documents-table.tsx`

---

## 1. Felhasználói és Üzleti Cél

Az eaisyDocs és eaisyHR rendszert használó munkatársak (ügyintézők, vezetők, iktatók, HR szakemberek) számára a hatékony munkavégzés alapfeltétele a **kisimult, teljesen egységes felhasználói felület**.

Ha egy felhasználó a Partnerek oldalon megszokta, hogy:
- bal oldalon van a keresőmező,
- a jobb oldalon található a zöld/teal `Szűrés` gomb (amelyben kényelmesen, dátumra és kategóriákra szűrhet),
- a táblázat soraiban azonnal elérhető a gyors előnézet (`Eye` ikon),

akkor elvárás, hogy a partner részletes adatlapján, a dolgozói személyi dossziéban, a bejövő postafiókban és az iktatókönyvben is **ugyanez a struktúra fogadja**.

---

## 2. Termékszintű Szabályok (Minden Képernyőre Kötelező)

### 2.1. Szűrési Élmény Egységesítése
1. **Elhelyezés:** A szűrő gomb **mindig a jobb oldalon** helyezkedik el a táblázat feletti sávban.
2. **Keresőmező:** A kereső **mindig a bal oldalon** foglal helyet, azonnali, debounced gépelési szűréssel és gyors törlési lehetőséggel.
3. **Szűrési Popover Tartalom:**
   - Dátum tartomány szűrés (`tól - ig`) naptáras választóval,
   - Egyértelműen csoportosított checkboxok a releváns státuszokra és típusokra,
   - Aktív szűrők számlálója a gombon (`Szűrés (X)` jelvény),
   - Gyors "Szűrők törlése" lehetőség.

### 2.2. Gyors Betekintés (In-Place Preview)
1. Nem kényszeríthetjük a felhasználót arra, hogy minden egyes irat vagy ügyirat megtekintéséhez elnavigáljon az aktuális oldalról.
2. Minden irat- és ügyiratlistában biztosítani kell a gyors betekintő modált:
   - **Iratok:** PDF és kép csatolmányok azonnali renderelése `DocumentViewer`-rel.
   - **Ügyiratok:** Tömör ügyirat összefoglaló kártya (tárgy, iktatószám, státusz, határidő, irattári hely) közvetlen ugrási linkkel.

### 2.3. Reszponzív és Letisztult Megjelenés
- Minden elem követi a platform Linear-flat design szabályait (nincsenek lebegő árnyékok, 1px finom szegélyek, kényelmes sormagasságok, dark mode teljes támogatás).

### 2.4. Statisztikai Kártyák (Linear Flat KPI Grid & Kanonikus KpiCard)
1. **Egységes komponens:** Minden dashboard és statisztikai sáv a központi `KpiCard` (`src/components/kpi-card.tsx`) komponenst alkalmazza.
2. **Struktúra:**
   - Felső kisméretű uppercase felirat (`text-xs font-medium text-muted-foreground uppercase tracking-wider`),
   - Kiemelt számérték (`text-2xl font-semibold tabular-nums text-foreground`),
   - Kontextus felirat alatta (`text-[11px] text-muted-foreground`).
3. **SZIGORÚAN TILTOTT ELEMEK:**
   - **Tilos dekoratív ikonokat, emojikat vagy kerekített ikondobozokat elhelyezni a kártyákon.** A statisztikák kizárólag a tiszta adatokra és feliratokra koncentrálnak.
   - **Tilos a vastag színes szegély (`border-l-4`, `borderLeftWidth: 3`) és az aszimmetrikus bal csíkozás.**
   - **Tilos a lebegő hover árnyék (`hover:shadow-*`).** Kizárólag finom keretszín-átmenet (`hover:border-primary/40 transition-colors`) engedélyezett.

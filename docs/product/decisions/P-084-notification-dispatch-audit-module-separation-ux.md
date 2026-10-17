# PRD P-084: Értesítési Kiküldési Napló Moduláris Szétválasztása és eaisyHR Audit UX

- **Státusz:** Approved
- **Dátum:** 2026-10-16
- **Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)
- **Kapcsolódó döntések:** [ADR A-005](../architecture/decisions/A-005-hr-modular-independence-architecture.md), [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [ADR A-065](../architecture/decisions/A-065-notification-dispatch-audit-module-separation-architecture.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-083](./P-083-notification-dispatch-audit-centralization-ux.md)

---

## 1. Felhasználói Igény és Célkitűzés

A felhasználói visszajelzések alapján elengedhetetlen volt az értesítési kiküldési naplók szigorú moduláris elválasztása:
1. **eaisyHR Értesítések Izolációja:** A HR-es e-maileknek és SMS-eknek (pl. Kelemen Roberta állásinterjú meghívói, toborzási értesítők, szabadság jóváhagyások) kizárólag az eaisyHR felületén szabad megjelenniük, az eaisyDocs iratkezelési audit naplójában nem szerepelhetnek.
2. **Dedikált eaisyHR Kiküldési Napló:** Az eaisyHR felhasználók számára egy a Docs-szal megegyező kanonikus, kétfülös audit nézet létrehozása a `/hr/audit` alatt.
3. **Moduláris Függetlenség (.agents/AGENTS.md 5. szabály):** Mindkét modul önállóan megvásárolható és működtethető kell maradjon anélkül, hogy egymás hiánya hibát okozna.

## 2. Képernyő és UI Specifikáció

### 2.1. eaisyDocs Központi Audit (`/audit?tab=kikuldesi_naplo`)
- **Fülek navigációja:** Ikonok nélküli, tiszta fülek: *„Rendszernapló (Audit)”* és *„Kiküldési Napló”*.
- **Szűrt Adattartalom:** Kizárólag a `modul = 'docs'` típusú értesítések jelennek meg (55 db iktatási és iratkezelési rekord).
- **Adatvédelem:** A toborzási, interjú és HR folyamatokból származó értesítések (pl. Kelemen Roberta jelentkezései) nem láthatók.
- **Részletező Betekintő Modal:** Szélesített (`max-w-4xl`–`xl:max-w-6xl`), teljes magasságú modális nézet, ahol a levél alsó része (CTA gomb, lábléc) sem vágódik le, és a forráskód-váltó felesleges vizuális zaja nélkül, tiszta e-mail kártyaként renderelődik.

### 2.2. eaisyHR Központi Audit (`/hr/audit`)
- **Kétfülös Navigáció:**
  - *„HR Eseménynapló (Audit)”* (`value="esemenynaplo"`): Munkavállalói és HR törzs események auditja.
  - *„Kiküldési Napló”* (`value="kikuldesi_naplo"`): Az elküldött HR e-mailek és SMS-ek dedikált naplója ikonok nélküli, letisztult fülfelirattal.
  - URL szinkronizáció `?tab=kikuldesi_naplo` paraméterrel.
- **Kanonikus KPI Kártyák (Linear Flat Grid):**
  1. *Összes HR Értesítés* (pl. 11 db)
  2. *Sikeres Kézbesítés* (pl. 100% sikerességi ráta)
  3. *Meghiúsult / Hibás* (SMTP vagy hálózati hibák)
  4. *Érintett Címzettek* (jelöltek, munkavállalók és vezetők egyedi száma)
- **TableToolbar Vezérlés:**
  - Keresőmező: instant szűrés címzett, tárgy vagy hiba alapján.
  - Szűrők: *Csatorna* (E-mail, SMS), *Státusz* (Sikeres, Hibás, Folyamatban), *HR Kategória* (Toborzás & Interjú, Szabadság & Távollét, Egészségügy & Orvosi, Munkaviszony & Szerződés, Rendszer).
  - Dátumtartomány szűrő gyorsgombokkal (Mind, Elmúlt 7 nap, Elmúlt 30 nap).
  - Dinamikus oszlopválasztó.
  - Frissítés és CSV Export gombok.
- **Táblázat és Betekintő Modal:**
  - Státusz és kategória badge-ek szemantikus színekkel.
  - Kattintásra megnyíló, kiterjesztett szélességű (`max-w-4xl`–`xl:max-w-6xl`) modális ablak a levéltörzs levágásmentes, természetes magasságú megjelenítésével, egyetlen gördülékeny görgetősávval és kompakt, egy-soros metaadat sávval.

### 2.3. eaisyHR Értesítési Beállítások (`/hr/settings`)
- Az *Értesítések* fülről a felesleges átvezető kártya szintén kivezetésre került a maximális felületi letisztítás érdekében; az értesítési szabályok önállóan kezelhetők, a naplózás pedig a bal oldali oldalsávból elérhető `/hr/audit?tab=kikuldesi_naplo` felületen működik.

## 3. Megfelelőség a Rendszer Szabályainak

- **Linear Flat Design (.agents/AGENTS.md):** Színes díszítő szegélyek és ikonok nélküli `KpiCard` komponensek.
- **Global UI Consistency (ADR A-029 & PRD P-043):** Mindkét modulban azonos `TableToolbar` és `KpiCard` komponensek biztosítják az egységes élményt.
- **GDPR & Moduláris Függetlenség:** Szigorú szerepkör- és bérlőalapú elválasztás.

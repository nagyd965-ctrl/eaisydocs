# [HR] P-050: HR Riportok Modul Teljes Megújítása (NAV T1041, KSH, Bérszámfejtés és Archívum)

**Státusz:** Implemented  
**Dátum:** 2026-10-07  
**Hatókör:** `[HR]` (eaisyHR)  
**Kapcsolódó ADR:** [A-031](../../architecture/decisions/A-031-hr-reports-data-aggregation-and-export-architecture.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó Képernyő:** `/hr/reports` (`src/app/hr/reports/page.tsx`, `src/components/hr/reports-tabs.tsx`)

---

## 1. Felhasználói Igény és Problémafelvetés

Az eaisyHR korábbi riport felülete (`/hr/reports`) csupán néhány gombot tartalmazott, amelyek sérült, egyetlen oszlopba zsúfolt, hibás kódolású CSV fájlokat generáltak (pl. `BelĂ©pĂ©s` a belépés helyett). Nem volt semmilyen adat-visszacsatolás a képernyőn: a HR adminisztrátor nem látta, kik a tárgyhavi belépők, kiknek készült el a T1041 bejelentése, hiányzik-e a hivatalos NAV befogadási nyugta, vagy hány órányi jelenlétet zártak le a részlegvezetők.

A cél a modul **teljes körű, rendszerszintű (PRD P-043 / ADR A-029 szerinti) megújítása** volt:
1. Interaktív adatvizualizáció és táblázatos megjelenítés mind a 4 fülön.
2. Excel (.xlsx) és formázott CSV letöltési lehetőségek, valamint ÁNYK vágólap szinkronizáció.
3. Közvetlen NAV Nyugta csatolás a táblázat soraiból.
4. In-place dokumentum és nyugta előnézet (`DocumentPreviewFrame`).

---

## 2. Képernyő Felépítés és UX Logika

### 2.1. Felső Statisztikai Sáv (Kanonikus `KpiCard` Közvetlenül a Cím és Alcím Alatt)
- A korábbi különálló, helypazarló felső időszakválasztó kártyát megszüntettük.
- A statisztikai kártyák a rendszer kanonikus felépítésének (PRD P-043 / ADR A-029) megfelelően közvetlenül a `Riportok` cím és alcím alatt helyezkednek el:
  - **NAV T1041:** Összes esemény, Új bejelentés (U), Kijelentés (T), Módosítás (V), Igazolt bejelentés (kiemelve, ha van igazolatlan tétel).
  - **KSH:** Záró állományi létszám, Átlagos FTE, Havi fluktuáció (+/-), Ledolgozott munkaóra, Távolléti órák.
  - **Bérszámfejtés:** Érintett munkavállalók, Jóváhagyott zárások, Folyamatban lévő zárások (kiemelve), Ledolgozott órák, Cafeteria keretösszeg.
  - **Archívum:** Összesített dokumentumszám és hatósági kategóriabontások.
- Fülek közötti váltáskor a felső KPI sáv dinamikusan és azonnal frissül az aktív modul mutatóira.

### 2.2. Füles Navigáció és Beépített Időszakválasztó a `TableToolbar`-ban
- **Fülek elrendezése:** A 4 dedikált fül közvetlenül a felső statisztikai kártyák alatt helyezkedik el.
- **Központi `TableToolbar` Integráció:**
  - A hónapválasztó (`<input type="month" />`) és az azonnali frissítő gomb (`RefreshCw`) közvetlenül a táblázat feletti vezérlősávba, a zöld **Szűrés** gomb mellé épült be.
  - Valós idejű keresőmező instant gépeléssel és törlés (`X`) gombbal.
  - Tematikus szűrőcsoportok:
    - T1041: Bejelentés jellege (Új, Kijelentés, Módosítás), Hatósági státusz (Igazolva, Beküldve, Előkészítve, Bejelentésre vár).
    - Bérszámfejtés: Munkavállalói szűrés, Jelenlét zárás állapota (Jóváhagyva, Jóváhagyásra vár, Nyitott).
    - KSH: KSH mutatók és FEOR kódok keresése.

### 2.4. Táblázatok és Gyorsműveletek
- **NAV T1041:**
  - Dolgozó neve, részlege, bejelentési kódja (színes Badge), adóazonosítója, TAJ száma, FEOR munkaköre, határideje, heti órája és státusza.
  - **Új: „+ Egyéni T1041 Készítése” vezérlőgomb és modál:** A teljes dolgozói állományból tetszőleges munkavállaló kiválasztható egyéni ÁNYK vágólap-másoláshoz és azonnali A4-es hivatalos PDF generáláshoz/iktatáshoz.
  - Műveleti gombok minden sorban:
    - 👁️ T1041 Adatlap előnézete felugró modálban,
    - 📄 Hivatalos NAV Nyugta megtekintése,
    - ⬆️ Hivatalos NAV Nyugta feltöltése (fájlválasztó dialog),
    - 📋 ÁNYK sormásolás vágólapra.
- **KSH Riport:**
  - 1. KSH Havi Főmutatók (KSH-01 - KSH-09 kódokkal, havi értékekkel, mértékegységekkel).
  - 2. Szervezeti egységek (részlegek) szerinti létszám-, FTE- és óramegoszlás.
  - Letöltés: Két munkalapos Excel munkafüzet (`exportKshToXlsx`).
- **Bérszámfejtési Csomag:**
  - 19 oszlopos részletes tábla: munkavállaló, adatok, munkanapok (terv vs tény), órák, túlóra, fizetett szabadság, betegszabadság, táppénz, havi cafeteria és zárás státusz.
  - **Új: Dolgozói szűrő a TableToolbarban:** Egyetlen munkavállaló azonnali kiemelése és adatainak vizsgálata.
  - **Új: Egyéni Export (.xlsx) gombsor:** Minden sornál közvetlen letöltési lehetőség két munkalapos személyes bérösszesítőre (`exportSingleEmployeePayrollToXlsx`), valamint közvetlen ugrási link a dolgozó jelenléti ívére és dossziéjára.
  - Letöltés: `.xlsx` bérprogram formátumban (`exportPayrollToXlsx`) és Cafeteria részletezőben (`exportCafeteriaToXlsx`).
- **Bevallás Archívum:**
  - Bal oldalon: Új bevallási PDF/XML/CSV feltöltő űrlap ügyszám megadással.
  - Jobb oldalon: Tárolt igazolások kereshető listája letöltési és törlési funkciókkal.
- **Elavult Compliance Modul Kivezetése:**
  - A korábbi `/hr/compliance` oldal kivezetve, a menüből eltávolítva, az útvonal átirányítva a `/hr/reports`-ra.

---

## 3. Megvalósítás és Üzleti Érték

- **Végfelhasználói Élmény:** A HR osztály és a könyvelés átlátható, modern felületen dolgozik, azonnali visszajelzéssel az elmaradásokról.
- **Nulla Adatvesztés:** A T1041 bejelentések hiányosságai azonnal szembetűnnek a piros/borostyán státuszjelvényeknek és a felső KPI kártyáknak köszönhetően.
- **Tökéletes Excel Integráció:** A letöltött `.xlsx` és CSV fájlok azonnal, formázva, helyes oszlopszélességekkel és ékezetekkel nyílnak meg a magyar Microsoft Excelben.

# P-142: eaisyHR Teljes Körű „Csak Olvasás” (Auditor / Betekintő) Felhasználói Élmény és Management Hibaközpont Megoldott / Törölt Fülek & Élő AI Figyelő UX

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[HR]` `[Közös]`  
**Category:** `HR / Read-Only Auditor Mode Across All Modules & Management Dashboard Error Center UX`  
**Author:** Antigravity Agent  
**Kapcsolódó ADR:** [A-113](../../architecture/decisions/A-113-hr-end-to-end-readonly-enforcement-and-management-live-ai-watcher-architecture.md)  
**Kapcsolódó Kód:** `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/tabs/*`, `src/app/hr/admin/page.tsx`, `src/app/hr/orgunit/[id]/page.tsx`, `src/app/hr/job/[id]/page.tsx`, `src/app/hr/performance/page.tsx`, `src/app/hr/time/page.tsx`, `src/app/hr/manager/page.tsx`, `src/app/hr/payroll/page.tsx`, `src/app/hr/recruitment/*`, `src/app/hr/onboarding/page.tsx`, `src/app/hr/offboarding/page.tsx`, `src/app/hr/compliance/page.tsx`, `src/app/hr/reports/page.tsx`, `src/app/hr/settings/page.tsx`, `src/components/hr/*`, `src/app/management/management-client.tsx`, `src/app/management/management.css`

---

## 1. Question / Problémafelvetés

1. **eaisyHR „Csak olvasás” (Auditor / Betekintő) UX hiányosságok:** Amikor egy felhasználónak a jogosultsági mátrixban az `eaisyHR` modulokra csak `Olvasás` (`Eye`) jogot adtunk (`Írás` / `Pencil` kikapcsolva, pl. külső auditor, könyvelő vagy felsővezetői betekintő szerepkörben), az oldalak megnyíltak, de a felületeken továbbra is megjelentek és kattinthatóak maradtak a módosító gombok (új munkatárs felvétele, szerződésgenerálás, KPI hozzáadása, értékelési ciklus kezelése, műszak rögzítése, műszaksablon létrehozása, álláshirdetés feladása, jelölti Kanban mozgatás, be-/kiléptetés indítása, megfelelőségi értesítések kiküldése).
2. **Management Dashboard Hibaközpont UX:** A megoldott és a törölt hibák egyetlen közös fülön szerepeltek, az `Élő AI Figyelő` kapcsolónak nem volt egységes gombstílusa, és a felső visszajelző sáv összeolvadt a középső `EAISYDOCS & EAISYHR` logó-pillel.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Egységes „Csak Olvasás” (`isReadOnly` / `!canEdit`) Felületi Viselkedés Minden eaisyHR Modulban
Ha a felhasználó egy adott HR modulhoz rendelkezik `Olvasás` joggal, de nem rendelkezik `Írás` (`hr_iras_modulok`) joggal:
- **360°-os Dolgozói Profil (`/hr/employee/[id]`):**
  - Elrejtésre kerül a fejlécbeli `Adatok szerkesztése` gomb.
  - Mind a 15 profilfülön (*Személyes*, *Munkaviszony*, *Hivatalos dokumentumok*, *Szakképzettség & Oktatás*, *IDP*, *Szabadság*, *Jelenlét*, *Bér & Juttatás*, *Cafeteria*, *Tanulmányi szerződések*, *Fegyelmi & Kártérítés*, *Kitüntetések*, *Eszközök*, *Orvosi alkalmasság*, *Be-/Kiléptetés*) elrejtésre kerülnek az új rekord rögzítő, szerkesztő, törlő, szerződésgeneráló és aláírt példány feltöltő gombok, miközben a meglévő dokumentumok in-place PDF/kép előnézete (`DocumentViewer`) és letöltése teljeskörűen elérhető marad.
- **Állomány (`/hr/admin`), Szervezeti egység (`/hr/orgunit/[id]`) és Munkakör (`/hr/job/[id]`):**
  - Elrejtésre kerül az `Új munkatárs felvétele`, az `eaisyBooks import`, a szervezeti egység / munkakör szerkesztő és munkaköri leírás feltöltő gomb.
- **Teljesítményértékelés (`/hr/performance`):**
  - Elrejtésre kerül a `Ciklusok kezelése` és a `+ Új KPI cél kitűzése` gomb, a KPI kártyákon pedig a csúszkák, státuszváltók és értékelő mezők csak olvasható módban jelennek meg.
- **Munkaidő, Műszakbeosztás és Jóváhagyások (`/hr/time`, `/hr/manager`):**
  - A `Műszakbeosztás` heti tervezőrácsában (`ShiftPlannerWeeklyGrid`) a cellák nem kattinthatók, a `Másolás előző hétről`, `Törlés` és `Műszaksablonok` hozzáadó/szerkesztő/törlő gombok (`ShiftTemplatesManager`) rejtettek.
  - A `Kérelmek és Jóváhagyások` (`UnifiedApprovalsPanel`) panelen a `Jóváhagyás` és `Elutasítás` gombok rejtettek, a kérelmek részletei és csatolt PDF igazolásai megtekinthetők.
- **Bérszámfejtés (`/hr/payroll`):**
  - A `Bérjegyzékek generálása`, státuszváltó és küldő gombok rejtettek; a bérjegyzékek előnézete és letöltése elérhető.
- **Toborzás (`/hr/recruitment`) és Be-/Kiléptetés (`/hr/onboarding`, `/hr/offboarding`):**
  - Toborzásban elrejtésre kerül az `Új álláshirdetés`, az `Új jelölt rögzítése`, a Kanban drag-and-drop mozgatás és a „Cégünkről” prezentáció szerkesztő/törlő gombjai.
  - Onboarding és Offboarding nézetekben az indító gombok rejtettek, a profil-modálokban (`OnboardingProfileModal`, `OffboardingProfileModal`) a checklist pipák és dokumentumgenerálók olvasható módban jelennek meg.
- **Megfelelőség (`/hr/compliance`), Riportok (`/hr/reports`) és Beállítások (`/hr/settings`):**
  - A megfelelőségi táblákban az értesítésküldő és oktatás-rögzítő gombok rejtettek.
  - A `/hr/reports` felületen minden hatósági és vezetői riport (NAV T1041 XML/CSV, KSH, Bérfeladás CSV/XLSX/PDF) megtekinthető és exportálható olvasási joggal is, de az adatbázis-állapotot módosító gombok (`Megjelölés bejelentettként`, `Havi riport archiválása`) rejtettek.

### 2.2. Management Dashboard Hibaközpont: Külön `Megoldott hibák` és `Törölt hibák` Fülek, Valamint Élő AI Figyelő Státuszsáv
- **Három különálló nézetfül:** `Aktív hibák` (`active`), `Megoldott hibák` (`resolved`) és `Törölt hibák` (`deleted`), külön darabszám-jelvényekkel.
- **Kompakt „Megoldva” visszajelzés a részletező panelen:** Ha egy hiba `Megoldott` állapotban van (még nincs törölve), az oldalsó részletező sáv tetején egy letisztult zöld információs kártya jelenik meg a megoldás pontos időpontjával (`Megoldva — YYYY. MM. DD. HH:mm`).
- **`Élő AI Figyelő` gomb és táblázat feletti státusz-banner:** A fejlécben `.mgmt-btn` stílusú kapcsológomb (`Élő AI Figyelő: Kikapcsolva` / `Élő AI Figyelő: Aktív` zöld pulzáló ponttal) található; aktív állapotban a táblázat felett egy információs sáv tájékoztat az élő figyelésről, a műveleti visszajelzések (`actionMessage`) pedig jobb alsó lebegő toastként jelennek meg, így soha nem takarják ki a középső fejléc-logót.

---

## 3. Rationale (Indoklás)

Az olvasási és írási jogosultságok következetes vizuális szétválasztása biztosítja, hogy az auditor, könyvelő vagy betekintő felhasználók zavaró, hibára futó szerkesztőgombok nélkül, tisztán áttekinthessék a vállalat teljes HR dokumentációját és riportjait, miközben a dolgozók saját önkiszolgáló (Self-Service) funkciói érintetlenül működnek tovább.

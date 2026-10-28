# P-123: [HR] Vezetői Csapatszűrés a Teljesítményértékelésben (`/hr/performance`) és Modul-alapú Dolgozói Törzsadatbázis Láthatóság (`/hr/admin`) UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** [HR]  
**Category:** HR  
**Author:** Antigravity Agent  
**Kapcsolódó ADR:** [A-090](../../architecture/decisions/A-090-hr-rls-module-permissions-and-performance-team-scoping.md)  
**Kapcsolódó Kód:**
- `src/utils/hr/performance-access.ts`
- `src/app/hr/performance/page.tsx`
- `src/app/hr/performance/dashboard/page.tsx`
- `src/app/hr/performance/actions.ts`
- `src/app/hr/admin/page.tsx`
- `src/app/hr/employee/[id]/page.tsx`

---

## 1. Question / Problémafelvetés

1. **Teljesítményértékelés (`/hr/performance`) vezetői szerepkörrel (`2. P0`):**
   - Egy normál részlegvezető (`vezeto` alapszerepkör, HR Admin modul nélkül) a `/hr/performance` oldalon az egész vállalat összes dolgozójának KPI-jait látta, miközben a felületen lévő „Új célkitűzés” és „Értékelés” gombokra kattintva jogosultsági hibát kapott.
2. **HR Munkaasztal (`/hr/admin`) Dolgozói Törzsadatbázis hiányos lista:**
   - A `hr vezeto` felhasználó (akinek az új 3-szerepkörös modellben `vezeto` az alapszerepköre és mind a 10 HR modul engedélyezve van számára) a Dolgozói Törzsadatbázisban csak 2 dolgozót látott a 7 aktív munkavállaló helyett, miközben a felső figyelmeztető sávban más dolgozók (pl. Kis József) teendői is megjelentek.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Teljesítményértékelés (`/hr/performance` és `/hr/performance/dashboard`) szerepkör-alapú működése
- **HR / Admin (`admin` szerepkör vagy `admin` HR modul):**
  - A teljes vállalat összes dolgozóját és részlegét látja.
  - Eléri a fejlécben a **„Ciklusok kezelése”** gombot, valamint a **„KPI Katalógus”** fület a vállalati KPI sablonok karbantartásához.
- **Közvetlen Vezető (`vezeto` szerepkör HR Admin modul nélkül):**
  - A fejléc alcíme egyértelműsíti a vezetői nézetet: *„Saját közvetlen beosztottak célkitűzéseinek (KPI), egyéni fejlesztési terveinek (IDP) és értékeléseinek kezelése.”*
  - A KPI statisztikai kártyák, a dolgozói célkitűzés-mátrix és a `/hr/performance/dashboard` kalibrációs riport automatikusan **csak a vezető saját közvetlen beosztottjaira** szűrnek.
  - A vezető az **„Új célkitűzés”** dialógusban a saját beosztottjai közül választhat, és a beosztottjai KPI kártyáin teljes körűen rögzíthet előrehaladást és vezetői értékelést.
  - A csak HR Admin számára releváns **„Ciklusok kezelése”** gomb és **„KPI Katalógus”** fül elrejtésre kerül a tisztán csapatvezetői nézetben.

### 2.2. Egységes Modul-alapú Láthatóság a HR Munkaasztalon és Dolgozói Adatlapon
- A `/hr/admin` Dolgozói Törzsadatbázisban az `admin` modul-jogosultsággal rendelkező felhasználók (köztük a `hr vezeto`) a vállalat **összes aktív munkavállalóját** látják.
- A `/hr/employee/[id]` dolgozói adatlapon a fülek (`Személyes adatok`, `Munkaviszony`, `Bérpapírok`, `Bizalmas HR adatok`, `Hivatalos dokumentumok`) és az iktatási/szerkesztési műveletek egységesen tiszteletben tartják a `hr_modulok` (`admin`, `payroll`, `compliance`, `audit`, `onboarding`, `offboarding`) jogosultságokat.

### 2.3. Aktív Munkakör Dinamikus Megjelenítése és Dolgozói Portál (`/hr`) Fejléc Duplikáció Megszüntetése
- Ha egy dolgozó munkakörét „Nincs munkakör beállítva” értékre állítják vagy másik munkakörre módosítják, az Állománytáblában (`/hr/admin`), a Szervezeti Felépítésben (`/hr/organization`), a 360°-os dolgozói kartonon (`/hr/employee/[id]`) és a dolgozói **Profilom** (`/hr/self-service/profile`) oldalon egyaránt azonnal az aktuális (`ervenyes_ig IS NULL`) állapot jelenik meg, a korábbi lezárt munkakör nem ragad be.
- A Dolgozói Portál **Áttekintés** (`/hr`) oldalán az „Áttekintés” főcím alatti duplikált *„Üdvözlünk, {nev}! Ez a személyes irányítópultod.”* alcím törlésre került, így az üdvözlés kizárólag a zöld hero sávban jelenik meg.

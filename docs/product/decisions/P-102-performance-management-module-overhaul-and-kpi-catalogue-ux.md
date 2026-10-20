# PRD P-102: Teljesítményértékelés Modul Megújítása és Vállalati Sablontár UX

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Téma:** `HR / Performance Management & KPI Catalogue UX`
- **Kapcsolódó döntések:** [ADR A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [ADR A-078](../../architecture/decisions/A-078-performance-management-module-overhaul-and-kpi-catalogue.md)

---

## 1. Felhasználói Igény és Célkitűzés

A cégvezetők és HR menedzserek számára a dolgozók féléves és éves teljesítményértékelése kritikus funkció, amely közvetlen alapja a bónuszkifizetéseknek és a szakmai fejlődésnek. A korábbi felület fapados, manuális és nehezen navigálható volt.
A cél egy olyan modern, Linear-flat stílusú értékelési központ létrehozása, amely:
1. Azonnali metrikus áttekintést ad az aktív ciklus előrehaladásáról és a vezetői teendőkről.
2. Végrehajthatóvá teszi a keresést és szűrést tetszőleges számú kolléga és célkitűzés esetén.
3. Megszünteti a redundáns adatbevitelt a beépített vállalati KPI sablonok segítségével.
4. Tiszta és átlátható ciklusmenedzsmentet és bérszámfejtési javaslatot biztosít.

## 2. Részletes UX és Képernyő Specifikáció

### 2.1. Főoldali Teljesítmény Lista (`/hr/performance`)
- **Fejléc Mérőszámcsík:** 4 kanonikus `KpiCard` a cím alatt:
  1. *Aktív Értékelési Ciklus* (Ciklus megnevezése, időszaka és állapota).
  2. *Érintett Dolgozók* (Célkitűzéssel rendelkezők aránya a teljes céghez mérten).
  3. *Kitűzött Célok (KPI)* (Összes kitűzött cél és átlag / dolgozó).
  4. *Vezetői Értékelésre Vár* (Önértékelés után pontozásra és szövegezésre váró célok száma).
- **Kanonikus `TableToolbar`:**
  - Bal oldalon instant kereső (dolgozó neve, beosztása, cél megnevezése).
  - Jobb oldalon `Szűrés` Popover: Ciklusok, Értékelési fázisok (1–5) és Teljesítmény sávok szerint.
- **Dolgozói Kártyák:**
  - Avatar, név, beosztás címke.
  - Összegző metrika: Lezárt célok aránya és átlagos teljesülési mutató progress barral.
  - Prémium sáv badge (`Kiváló Prémium`, `Normál Bónusz`, `Fejlesztendő`).
  - Lenyitható célkitűzés accordion interaktív `KpiWorkflowStepper`-rel és fázis-specifikus vezetői műveletekkel.

### 2.2. Új Célkitűzés Rögzítése Párbeszédablak (`add-kpi-dialog.tsx`)
- **Vállalati KPI Sablonok Doboz:**
  - Kattintható gombok a `hr_kpi_katalogus`-ból (pl. *Ügyfél-elégedettség CSAT*, *Projektátadási arány*, *Árbevétel elvárás*, *Tréning elvégzése*).
  - Kattintásra azonnal kitölti a nevet, mérőszám típusát, javasolt célértékét és leírását.
- **Támogatott Dolgozóválasztó:**
  - Név és munkaköri megnevezés alapján.
- **Mértékegység-tudatos beviteli mezők:**
  - Megjeleníti az adott egységet (`%`, `Ft`, `db`, `skála pont`).
  - Súlyozás gyorsgombok (`1.0x`, `1.5x`, `2.0x`).

### 2.3. Ciklusok Kezelése Párbeszédablak (`manage-cycles-dialog.tsx`)
- Lenyitható / elrejthető új ciklus rögzítési űrlap dátumválasztókkal.
- Táblázat egyértelmű státuszokkal és feliratozott állapotváltó gombokkal (`Megnyitás`, `Értékelés indítása`, `Ciklus lezárása`).

### 2.4. Vezetői Dashboard (`/hr/performance/dashboard`)
- Visszalépési lehetőség a teljesítményértékelés főoldalára.
- Egységes Linear-flat 5-lépcsős folyamat rács.
- Esztétikus diagram empty state-ek feliratokkal.
- Strukturált bérszámfejtési összesítő tábla dolgozói avatarokkal és prémium sávokkal.

## 3. Minőségbiztosítás és Eredmény

- A felület megszünteti a fapados prototípus érzetet és tökéletesen illeszkedik az eaisyHR és eaisyDocs ökoszisztémájába.
- Megfelel az ADR A-029 előírásainak.

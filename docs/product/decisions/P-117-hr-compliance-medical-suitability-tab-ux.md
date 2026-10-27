# PRD P-117: [HR] Munkaügyi és Munkavédelmi Megfelelőség – Orvosi Alkalmasság Fül és Fejléc Letisztítás UX

- **Státusz:** Elfogadva / Implementálva
- **Dátum:** 2026-10-27
- **Hatókör:** `[HR]`
- **Érintett képernyők / komponensek:**
  - `src/app/hr/compliance/page.tsx`
  - `src/app/hr/compliance/compliance-actions.ts` (`getCompanyMedicalComplianceData`)
  - `src/utils/hr/medical-compliance-calculator.ts`
  - `src/components/hr/medical-compliance-table.tsx`
  - `src/app/hr/employee/[id]/actions.ts` (`addOrvosiVizsgalat`, `deleteOrvosiVizsgalat`, `fileMedicalExaminationAction`)
- **Kapcsolódó döntések:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-115](./P-115-hr-compliance-avatar-consistency-and-ui-naming-cleanup.md), [P-116](./P-116-eaisyhr-deep-analysis-ux-and-workflow-hardening.md)

---

## 1. User Problem / Goal (Felhasználói Probléma és Cél)

A munkavállalók foglalkozás-egészségügyi (orvosi alkalmassági) vizsgálatai (`hr_orvosi_vizsgalat` és `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg`) eddig kizárólag egyénileg, a dolgozók 360°-os profilnézetében (`/hr/employee/[id]`) voltak áttekinthetők, miközben a lejárt vagy hiányzó vizsgálat a műszaktervezést (`/hr/time`) és a napi munkaidő-rögzítést (`/hr`) törvényi kötelezettség alapján (Mvt. 49. § (1), 33/1998. NM rendelet) blokkolja. Hiányzott egy céges szintű, összesített áttekintő fül a **Munkaügyi és Munkavédelmi Megfelelőség** (`/hr/compliance`) oldalon, továbbá az oldal főcímében felesleges angol zárójeles kifejezés (`(Compliance Hub)`) szerepelt.

---

## 2. UX & Screen Specification (Képernyő és Működési Specifikáció)

1. **Tiszta magyar főcím a `/hr/compliance` oldalon:**
   - Az oldal főcíme **`Munkaügyi és Munkavédelmi Megfelelőség`** (a zárójeles `(Compliance Hub)` toldalék eltávolításra került).
2. **4. fül: `Orvosi alkalmasság` (`/hr/compliance`):**
   - **Felső 4 kanonikus `KpiCard`:**
     - `ORVOSI ALKALMASSÁGI LEFEDETTSÉG`: Érvényes és 30 napon belül lejáró minősítések aránya az összes aktív munkavállalóhoz képest (`X / Y fő`, `Z% céges megfelelőség`).
     - `ÉRVÉNYES ALKALMASSÁGI`: Munkavégzésre és műszakbeosztásra 30 napon túl is érvényes dolgozók száma.
     - `HAMAROSAN LEJÁRÓ (30 NAP)`: 30 napon belül lejáró vizsgálatok száma (`highlight`, ha > 0).
     - `LEJÁRT VAGY HIÁNYZIK`: Lejárt, hiányzó vagy `nem_alkalmas` minősítésű dolgozók száma (`highlight`, ha > 0).
   - **Céges Orvosi Alkalmassági Táblázat (`MedicalComplianceTable`):**
     - Kanonikus `TableToolbar` keresővel (név, munkakör, részleg, iktatószám), oszlopválasztóval, 3 szűrőcsoporttal (*Megfelelőségi státusz*, *Vizsgálat típusa*, *Szervezeti egység*) és CSV exportálással.
     - Kétlépcsős adatforrás-feloldás: elsődlegesen a legutolsó `hr_orvosi_vizsgalat` rekordot jeleníti meg; ha még nincs külön vizsgálati rekord, a beléptetéskor rögzített `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` dátumot veszi alapul (`Alapadatoknál rögzített` jelzéssel).
     - Helyi PDF előnézet (`PdfViewerDialog`), közvetlen személyi dosszié iktatás (`fileMedicalExaminationAction`) és helyben megnyíló új vizsgálat rögzítő modál (`addOrvosiVizsgalat`).
     - Szerepkör-érzékeny megjelenítés: `munkavedelmi` szerepkör esetén az érvényességi dátumok és a megfelelőségi státusz látszanak, míg az orvosi záradékok, a PDF előnézet és a rögzítés/iktatás HR és Admin szerepkörökhöz kötött.

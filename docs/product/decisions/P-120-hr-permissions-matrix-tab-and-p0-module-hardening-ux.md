# P-120: [HR] Jogosultságkezelő Mátrix a Szervezeti Felépítésben és P0 Modul-Konzisztencia UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]`  
**Category:** `HR / Organization, Permissions Matrix, Attendance, Payroll & Statutory PDFs UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-087](../../architecture/decisions/A-087-hr-simplified-roles-module-permission-matrix-and-p0-calculation-hardening.md)  
**Kapcsolódó Kód:** `src/components/hr/permissions-matrix-view.tsx`, `src/components/hr/organization-tabs-view.tsx`, `src/app/hr/organization/page.tsx`, `src/components/hr/add-employee-dialog.tsx`, `src/components/hr/employee-edit-dialog.tsx`, `src/components/hr/leave-request-dialog.tsx`, `src/components/hr/my-payslips-view.tsx`, `src/components/hr/reports-tabs.tsx`, `src/components/hr/t1041-panel.tsx`

---

## 1. Question / Problémafelvetés

1. Hogyan tudjuk megszüntetni a dolgozó felvételekor és szerkesztésekor megjelenő, nehezen átlátható 10-féle HR szerepkört úgy, hogy az Admin mégis pontosan, modulonként tudja szabályozni, melyik munkatárs milyen HR munkaasztal funkciókhoz férhet hozzá?
2. Hogyan tehetjük vizuálisan és funkcionálisan konzisztenssé a szabadságigénylő ablakot (valós munkanap- és keretkijelzéssel), a dolgozói bérjegyzék részletezőt (pontos HUF összegekkel az `"Elszámolva"` szöveg helyett) és a KSH riport szűrősávját?

---

## 2. Decision (A Meghozott Döntés)

### 2.1. 3 Tiszta Alapszerepkör a Dolgozói Űrlapokon (`Munkavállaló`, `Vezető`, `Admin`)
- Az új munkatárs felvétele (`AddEmployeeDialog`) és a dolgozói alapadatok szerkesztése (`EmployeeEditDialog`) során a szerepkör-választó legördülő menü kizárólag a három tiszta megnevezést tartalmazza zárójeles toldalékok nélkül:
  - **Munkavállaló**
  - **Vezető**
  - **Admin**

### 2.2. Admin-exkluzív „Jogosultságkezelő” 4. Fül a Szervezeti Felépítésben (`/hr/organization?tab=permissions`)
- A **Szervezeti felépítés** (`/hr/organization`) oldal egy 4. füllel (**`Jogosultságkezelő`**) bővült, amely **kizárólag `admin` szerepkörű felhasználók számára látható és érhető el** (más szerepkörrel sem a fül, sem a tartalom nem jelenik meg).
- A [`PermissionsMatrixView`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/permissions-matrix-view.tsx) felépítése:
  - **4 Kanonikus `KpiCard`:** *Összes munkavállaló*, *Adminisztrátorok*, *Egyedi modul-hozzáféréssel rendelkezők*, *Vezetők*.
  - **Kanonikus `TableToolbar`:** Instant név/e-mail/pozíció kereső és szerepkör/részleg/modul-hozzáférés szűrő.
  - **Interaktív Mátrix Táblázat:** Minden dolgozó sorában közvetlenül váltható az alapszerepkör (`Munkavállaló` / `Vezető` / `Admin`), mellette 1 kattintásos pill-kapcsolók (toggle gombok) állítják a 10 HR modul hozzáférését (`Állomány`, `Szervezet`, `Műszak`, `Bérszámfejtés`, `Megfelelőség`, `Riportok`, `Toborzás`, `Beléptetés`, `Kiléptetés`, `Audit`), kiegészítve egy **„Összes modul”** gyorskapcsolóval a sor végén.

### 2.3. Önkiszolgáló Szabadságigénylés, Bérpapír és KSH Riport UX Javítások
- **Szabadságigénylő ablak (`LeaveRequestDialog`):** Fizetett szabadság igénylésekor valós időben megjeleníti az éves keretet, az eddig felhasznált/függő napokat, a kiválasztott időszakra eső tényleges munkanapok számát (ünnepnapokkal és áthelyezett szombatokkal korrigálva), valamint az igénylés után maradó egyenleget; kerettúllépés vagy 0 munkanap esetén hibaüzenettel blokkolja a beküldést.
- **Dolgozói Bérpapír Részletező (`MyPayslipsView`):** A bruttó bér összetevőinél (`Időarányos alapbér`, `Szabadságra járó távolléti díj`, `Betegszabadság díjazása`, `Túlóra alapdíj és pótlék`) az általános `"Elszámolva"` felirat helyett a pontos HUF részösszegek jelennek meg `tabular-nums` formázással.
- **KSH Riport (`ReportsTabs`):** Eltávolításra került a KSH táblázat feletti másodlagos, duplikált `"Szűrés részlegre..."` keresőmező, így kizárólag a felső kanonikus keresősáv szűri a részlegeket.

---

## 3. Rationale (Indoklás)

A 3 alapszerepkör és a Szervezeti Felépítésbe integrált, csak Admin által látható Jogosultságkezelő Mátrix egyszerre biztosít egyszerű napi használatot (dolgozó felvételekor nem kell 10 szerepkör között vacillálni) és vállalati szintű, modulonkénti hozzáférés-szabályozást.

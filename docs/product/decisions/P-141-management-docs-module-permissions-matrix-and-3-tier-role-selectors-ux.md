# P-141: Management Dashboard és Vállalati Modul-Hozzáférési Mátrix (`Olvasás` / `Írás` Kapcsolók `eaisyBill` Mintára), Dinamikus Oldalsáv és 3-Szintű Szerepkör-Választók UX

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Category:** `Management Dashboard / Read-Write Permissions Matrix, Dynamic Sidebar & Settings Role Selectors UX`  
**Author:** Antigravity Agent  
**Kapcsolódó ADR:** [A-112](../../architecture/decisions/A-112-docs-3-tier-role-model-and-module-permission-matrix-architecture.md)  
**Kapcsolódó Kód:** `src/app/management/management-client.tsx`, `src/app/management/actions.ts`, `src/components/hr/permissions-matrix-view.tsx`, `src/app/hr/organization/page.tsx`, `src/app/hr/permissions/actions.ts`, `src/components/app-sidebar.tsx`, `src/components/layout-wrapper.tsx`, `src/components/settings/team-tab.tsx`, `src/components/settings/invite-user-dialog.tsx`, `src/components/settings/edit-member-role-dialog.tsx`, `src/components/settings/company-settings-tab.tsx`, `src/components/settings/departments-tab.tsx`, `src/components/settings/eaisybill-member-import-dialog.tsx`, `src/components/assign-dossier-dialog.tsx`, `src/components/archive-client.tsx`

---

## 1. Question / Problémafelvetés

Az `eaisyDocs` jogosultságkezelése korábban 7 szerepkört kínált a legördülő menükben (`Admin`, `Rendszergazda`, `Vezető / Szignáló`, `Iratkezelő / Iktató`, `Ügyintéző`, `Betekintő`, `Auditor`), miközben a `/management` Control Center *Jogosultságok -> eaisyDocs* fülén csak egy statikus, nem szerkeszthető táblázat jelent meg. A cél az volt, hogy az `eaisyHR`-ben már bevált **3 alapszerepkör (`Munkavállaló`, `Vezető`, `Admin`) + cégenkénti interaktív modul-hozzáférési mátrix** UX-et vezessük be az `eaisyDocs`-ra is.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Interaktív `Olvasás` (`Eye`) és `Írás` (`Pencil`) Modul-Hozzáférési Mátrix `eaisyBill` Mintára (`/management` és `/hr/organization?tab=permissions`)
- A `/management` *Control Center -> Jogosultságok* nézetben (mind az **`eaisyDocs`**, mind az **`eaisyHR`** fülön), valamint a belső HR jogosultságkezelőben (`/hr/organization?tab=permissions`) az `eaisyBill` jogosultsági mátrixával megegyező **Olvasás / Írás** oszlopos vezérlés működik:
  - **Cégválasztó legördülő:** megmutatja a felhasználó cégeit és az adott cégben érvényes szerepkört (`Cégnév (Munkavállaló / Vezető / Admin)`).
  - **Fejléc vezérlők:**
    - `Alapszerepkör` legördülő (`Munkavállaló` | `Vezető` | `Admin`) — váltáskor a modul-kapcsolók automatikusan felveszik az adott szerepkör alapértelmezett modul-készletét.
    - `Csak olvasás (R+)`, `Teljes (W+)` és `Tilt` gyorsgombok (nem-admin szerepkörnél aktívak) — egyetlen kattintással beállítható például egy **Auditor / Betekintő** (minden modulon `Olvasás` bekapcsolva, `Írás` kikapcsolva).
    - `Modul szűrése...` azonnali keresőmező.
  - **Modulonkénti `Olvasás` (`Eye` ikon) és `Írás` (`Pencil` ikon) gombok:**
    - Az `Írás` bekapcsolása automatikusan bekapcsolja az `Olvasás` jogot is az adott modulon.
    - Az `Olvasás` kikapcsolása automatikusan visszavonja az `Írás` jogot is az adott modulon.
    - Minden szekció fejlécében elérhető az `R+ | W+ | Tilt | Alaphelyzet` csoportos műveletsor.
  - **2 szekcióba rendezett 7 szakmai `eaisyDocs` modul (`DOCS_PERMISSION_MODULES`):**
    1. **IRATKEZELÉSI MUNKAASZTAL:** *Bejövő sor & Érkeztetés* (`inbox`), *Iktatókönyv & Ügyiratok* (`dossiers`), *Irattár & Selejtezés* (`archive`), *Partnerek & Szerződések* (`partners`).
    2. **VEZÉRLÉS ÉS MEGFELELŐSÉG:** *Eseménynapló & Audit* (`audit`), *Iktatási és Értesítési Szabályok* (`rules`), *Céges Beállítások & Csapat* (`settings`).

### 2.2. Dinamikus `eaisyDocs` Oldalsáv (`AppSidebar`)
- A bal oldali navigáció (`src/components/app-sidebar.tsx`) a felhasználó aktív cégbeli `docsRole` és `docsModules` jogosultságai alapján dinamikusan csak azokat a menüpontokat jeleníti meg, amelyekhez a felhasználónak hozzáférése van (az *Áttekintés* és *Feladatok* alapmenüpontok mindig láthatók).

### 2.3. 3-Szintű Szerepkör-Választók és Magyar Megnevezések Minden Felületen
- Minden szerepkör-választóban (`InviteUserDialog`, `EditMemberRoleDialog`, `TeamTab`, `EaisyBillMemberImportDialog`, `/management` modálok) kizárólag a 3 szerepkör választható:
  - **Munkavállaló** (`munkavallalo`)
  - **Vezető** (`vezeto`)
  - **Admin** (`admin`)
- A csapatlistákban, szervezeti egységekben, helyettesítési és ügyirat-hozzáférési dialógusokban egységesen a `Munkavállaló`, `Vezető`, `Admin` címkék jelennek meg.

---

## 3. Rationale (Indoklás)

A 3 alapszerepkör és a `/management` felületen lévő cégenkénti modul-mátrix megszünteti a szerepkör-duplikációt, teljes vizuális és működési szimmetriát teremt az `eaisyHR` és az `eaisyDocs` között, és lehetővé teszi, hogy egy adott munkavállalónak vagy vezetőnek cégenként egyedileg lehessen be- vagy kikapcsolni az egyes szakmai modulokat (pl. *Eseménynapló*, *Szabályok*, *Beállítások*).

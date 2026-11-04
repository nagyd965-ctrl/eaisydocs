# A-113: eaisyHR Teljes Körű „Csak Olvasás” (`hr_iras_modulok` / `requireHrWriteServer`) Jogosultsági Kényszerítés és Management Dashboard Kapcsolható Élő AI Hiba-Figyelő Architektúra

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[HR]` `[Közös]`  
**Author:** Antigravity Agent  
**Kapcsolódó PRD:** [P-142](../../product/decisions/P-142-hr-readonly-auditor-experience-and-management-resolved-deleted-error-tabs-ux.md)  
**Kapcsolódó Kód:** `src/utils/hr/hr-auth-guard.ts`, `src/utils/hr/company-role-resolver.ts`, `src/utils/hr/performance-access.ts`, `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/actions.ts`, `src/app/hr/employee/[id]/tabs/*`, `src/app/hr/actions/*`, `src/app/hr/admin/*`, `src/app/hr/organization/page.tsx`, `src/app/hr/orgunit/[id]/*`, `src/app/hr/job/[id]/*`, `src/app/hr/performance/*`, `src/app/hr/time/*`, `src/app/hr/manager/*`, `src/app/hr/payroll/*`, `src/app/hr/recruitment/*`, `src/app/hr/onboarding/*`, `src/app/hr/offboarding/*`, `src/app/hr/compliance/*`, `src/app/hr/reports/*`, `src/app/hr/permissions/actions.ts`, `src/app/hr/settings/*`, `src/components/hr/*`, `src/app/management/actions.ts`, `src/app/management/management-client.tsx`, `src/app/management/management.css`, `scripts/watch-ai-analysis.ts`

---

## 1. Context (Kontextus)

Az [A-112](./A-112-docs-3-tier-role-model-and-module-permission-matrix-architecture.md) migráció (`20261104000005`) bevezette az adatbázisban a `hr_iras_modulok text[]` oszlopot és a `hasHrWriteAccess` függvényt, azonban az `eaisyHR` alkalmazásrétegében 6 rendszerszintű rés maradt:
1. A `hasHrWriteAccess` függvénynek 0 meghívása volt a kódbázisban; a `hrWriteModules` tömböt pedig a 20+ HR oldal közül kizárólag a `/hr/organization` oldal használta tényleges gomb- és művelet-elrejtésre.
2. Az `isUserAuthorizedForHrView` függvényben lévő olvasási fallback ág (`if (moduleSet.size > 0) return true`) miatt bármely, legalább 1 olvasási modullal rendelkező felhasználó átjutott az összes paraméter nélküli vagy legacy szerepkör-listás `requireHrAuthServer` híváson, beleértve az adatbázis-módosító (`INSERT` / `UPDATE` / `DELETE`) Server Actionöket is.
3. A `resolveUserCompanyRoles` (`src/utils/hr/company-role-resolver.ts`) függvényben a `rawHrModules` és `rawHrWriteModules` külön-külön fallbackelt a `company_members` és `felhasznalo_profil` táblák között. Mivel a `company_members.hr_iras_modulok` PostgreSQL `DEFAULT` értéke `'{}'::text[]` (nem `NULL`, hanem üres tömb), egy olyan tagnál, akinek a `company_members.hr_modulok` mezője üres volt és a profilból örökölte a moduljait, a `rawHrWriteModules` üres tömbnek (`[]`) értékelődött ki.
4. A `performance-access.ts` fájlban a `hasFullCompanyPerformanceAccess` az `"auditor"` szerepkörnek és a csak-olvasási `"admin"` / `"performance"` modulnak is teljes vállalati írási jogot adott a KPI-ok és értékelési ciklusok felett.
5. A toborzási (`/hr/recruitment`), beléptetési (`/hr/onboarding`), kiléptetési (`/hr/offboarding`), munkaidő (`/hr/time`), bérszámfejtési (`/hr/payroll`), megfelelőségi (`/hr/compliance`) és 360°-os dolgozói profil (`/hr/employee/[id]`) felületek csak a legacy `hrRole === "auditor"` feltételt vizsgálták, így egy `munkavallalo` alapszerepkörű, de `hr_iras_modulok = []` (Csak olvasás) jogosultságú felhasználó minden módosító gombot látott és meghívhatott.
6. A `/management` Hibaközpontban igény merült fel a megoldott (`resolved`) és törölt (`deleted`) hibák külön fülre választására, valamint egy alapértelmezetten kikapcsolt (0% CPU háttérterhelésű), gombbal kapcsolható Élő AI Hiba-Figyelő (`watch-ai-analysis.ts`) kialakítására.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Dedikált Szerveroldali Írási Őrblokk (`requireHrWriteServer`) és Olvasási Szétválasztás (`src/utils/hr/hr-auth-guard.ts`)
- **Olvasási vs. írási guard szétválasztása:**
  - Az `isUserAuthorizedForHrView` függvényben lévő `if (moduleSet.size > 0) return true` ág érintetlen maradt, így a ~109 olvasási szintű `requireHrAuthServer` hívás (oldalbetöltők, PDF/CSV/XML riport-generálások, T1041/KSH lekérdezések, audit- és kölcsönzési előzmények) továbbra is kiszolgálja a Csak olvasás jogú felhasználókat.
  - Minden adatbázis-módosító (`INSERT` / `UPDATE` / `DELETE`) HR Server Action átállt az új **`requireHrWriteServer(requiredWriteModules, targetCompanyId?)`** őrblokkra, amely a `hasHrWriteAccess(hrRole, requiredWriteModules, hrModules, hrWriteModules)` függvénnyel ellenőrzi, hogy az adott modul szerepel-e a felhasználó `hr_iras_modulok` tömbjében (vagy `admin` alapszerepkörű-e).
- **Segédfüggvények (`checkHrWriteAccess`, `isStrictHrReadOnlyUser`):**
  - A `checkHrWriteAccess(ctx, requiredWriteModules)` dobásmentes (`boolean`) ellenőrzést biztosít a szerveroldali `page.tsx` komponenseknek (`canEdit`, `isReadOnly`, `canManage` propok kiszámításához) és a vegyes (önkiszolgáló + HR admin) Server Actionöknek.
  - Az `isStrictHrReadOnlyUser(ctx)` (`hrRole !== "admin" && hrModules.length > 0 && hrWriteModules.length === 0`) azonosítja a tisztán olvasási jogú auditor/betekintő felhasználókat.

### 2.2. `resolveUserCompanyRoles` Fallback-Szinkronizáció (`src/utils/hr/company-role-resolver.ts`)
- Bevezetésre került a `useMemberHrModules = Array.isArray(membership.hr_modulok) && membership.hr_modulok.length > 0` feltétel:
  - Ha a `company_members.hr_modulok` nem üres, akkor mind a `rawHrModules`, mind a `rawHrWriteModules` a `company_members` sorból töltődik be.
  - Ha a `company_members.hr_modulok` üres (`[]` vagy `NULL`), és a rendszer a `felhasznalo_profil.hr_modulok` értékére fallbackel, akkor a `rawHrWriteModules` is szinkronban a `felhasznalo_profil.hr_iras_modulok` értékét veszi át.

### 2.3. Teljesítményértékelési Olvasási és Írási Jog Szétválasztása (`src/utils/hr/performance-access.ts`)
- A `hasFullCompanyPerformanceAccess` (olvasási láthatóság a teljes vállalati állományra) különvált az új **`hasFullCompanyPerformanceWriteAccess(hrRole, hrModules, hrWriteModules)`** függvénytől, amely megköveteli a `hasHrWriteAccess(..., ["performance", "admin"], ...)` jogosultságot.
- A `canManageEmployeePerformance` közvetlen felettesi (`isDirectManager`) ága is megtagadja az írási jogot, ha a felhasználó tisztán olvasási jogú (`isStrictReadOnly`).

### 2.4. Teljes Körű 6-Fázisú Server Action és UI Kényszerítés (80 Érintett Fájl)
- **Fázis 2 — 360°-os Dolgozói Profil (`/hr/employee/[id]`):** A `canEdit = checkHrWriteAccess(authCtx, ["employees", "admin"])` prop vezérli a fejléc gombjait és mind a 15 profilfület (`QualificationTab`, `IDPTab`, `LeaveTab`, `AttendanceTab`, `EmploymentTab`, `OfficialDocumentsTab`, `PayrollTab`, `CafeteriaTab`, `StudyContractTab`, `DisciplinaryTab`, `AwardsTab`, `AssetsTab`, `MedicalTab`, `OnboardingTab`, `OffboardingTab`). A dolgozói saját önkiszolgáló műveletek (`isSelf === true`, pl. saját IDP tanúsítvány-feltöltés vagy saját cafeteria nyilatkozat) továbbra is engedélyezettek maradtak, míg más dolgozó profilján minden módosítás `requireHrWriteServer` védelem alatt áll.
- **Fázis 3–4 — Állomány, Szervezet, Munkakörök, Teljesítmény, Munkaidő, Vezetői Jóváhagyások és Bérszámfejtés:** Minden módosító akció és UI gomb (`AddEmployeeDialog`, `EaisyBooksEmployeeImportDialog`, `OrgUnitEditDialog`, `JobEditDialog`, `JobDescriptionUpload`, `AddKpiDialog`, `ManageCyclesDialog`, `ShiftPlannerWeeklyGrid`, `ShiftTemplatesManager`, `UnifiedApprovalsPanel`, `PayrollTable`) modul-szintű írási joghoz (`employees`, `organization`, `performance`, `time`, `approvals`, `payroll`) kötött.
- **Fázis 5–6 — Toborzás, Be-/Kiléptetés, Megfelelőség, Riportok, Jogosultságok és Beállítások:** A toborzási `KanbanBoard` drag-and-drop és gyorsgombjai, a `JobPostingsList`, `CandidateProfileSheet`, `CompanyPresentationEditor`, az `OnboardingProfileModal` és `OffboardingProfileModal`, a `/hr/compliance` táblák értesítésküldő és rögzítő gombjai, valamint a `/hr/reports` állapotmódosító gombjai (`markT1041ReportedAction`, `saveMonthlyReportArchiveAction`) `isReadOnly` / `requireHrWriteServer` védelmet kaptak, miközben a hatósági XML/CSV/PDF/XLSX riport-letöltések olvasási joggal is működnek.

### 2.5. Management Dashboard Kapcsolható Élő AI Figyelő (`watch-ai-analysis.ts`) és Megoldott / Törölt Hibák Szétválasztása
- A `rendszer_beallitas` tábla `mgmt_live_ai_watcher_enabled` kulcsa (alapértelmezetten `'false'`) tárolja az Élő AI Figyelő állapotát.
- Bekapcsolt állapotban új alkalmazáshiba (`logAppErrorAction`) vagy a kapcsoló aktiválásakor a szerver egy pehelysúlyú jelzőfájlt ír a projektmappán kívüli `os.tmpdir()/eaisydocs-ai-watcher/trigger.json` útvonalra, amelyet a `scripts/watch-ai-analysis.ts` natív `fs.watch` eseménnyel (0% CPU terheléssel, polling nélkül) figyel.
- A `markErrorLogsResolvedAction` (`[MEGOLDVA | timestamp]` jelöléssel a `user_agent` mezőben) és a `softDeleteErrorLogsAction` külön életciklus-állapotot képez, így a Hibaközpontban külön fülön kérdezhetők le az `active`, `resolved` és `deleted` hibák.

---

## 3. Consequences (Következmények)

- **Pozitív:** Az `eaisyHR` jogosultsági mátrixában beállított „Csak olvasás” (`Olvasás` bekapcsolva, `Írás` kikapcsolva) jogosultság mostantól 100%-ban end-to-end érvényesül a menütől a gombokon és modálokon át a Server Actionökig, többcéges környezetben és dolgozói önkiszolgáló (Self-Service) módban is törésmentesen.
- **Kompromisszum:** Az olvasási (`requireHrAuthServer`) és írási (`requireHrWriteServer`) őrblokkok szigorú szétválasztása miatt minden új HR Server Action létrehozásakor explicit döntést kell hozni arról, hogy az adott művelet olvasási vagy írási jogosultságot igényel-e.

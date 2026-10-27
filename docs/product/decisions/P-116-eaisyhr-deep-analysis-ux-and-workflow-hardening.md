# P-116: [HR] eaisyHR Deep Analysis UX, Folyamat-integritás és Nézet-konzisztencia Megerősítés

**Status:** Decided  
**Date:** 2026-10-27  
**Scope:** [HR]  
**Category:** HR / Lifecycle, Compliance, Reports, Self-Service & Approvals UX  
**Author:** Antigravity AI  
**Kapcsolódó ADR:** [A-085](../../architecture/decisions/A-085-eaisyhr-multi-company-persistence-and-schema-hardening.md)  
**Kapcsolódó Kód:** `src/components/hr/unified-approvals-panel.tsx`, `src/components/hr/talent-pool-list.tsx`, `src/components/hr/leave-request-dialog.tsx`, `src/components/hr/employee-kpi-widget.tsx`, `src/components/hr/reports-tabs.tsx`, `src/app/hr/employee/[id]/tabs/LeaveTab.tsx`, `src/app/hr/self-service/profile/page.tsx`, `src/app/hr/orgunit/[id]/page.tsx`, `src/app/hr/job/[id]/page.tsx`  

---

## 1. Question / Problémafelvetés

Az eaisyHR modul 22 pontos mélyelemzése ([docs/eaisyhr-deep-analysis-javitasi-terv.md](../../eaisyhr-deep-analysis-javitasi-terv.md)) során több olyan felhasználói felületi és munkafolyamatbeli inkonzisztencia került felszínre, amelyek rontották a napi HR munkavégzés és a dolgozói önkiszolgáló (ESS) felület élményét:

1. **Vezetői elutasítás indoklásának elvesztése (`/hr/manager`):** Szabadság és túlóra elutasításakor a vezető által beírt indoklás (`rejectReason`) nem jutott el a szerver akcióhoz, így a dolgozó értesítéséből és az audit naplóból is hiányzott.
2. **Talent Pool (`/hr/recruitment`) lista-szinkron és pozíciónév:** A Talent Pool oldalsávban végzett jelölt-törlés vagy jegyzetfrissítés nem frissítette az alap táblázatot, és a megpályázott pozíció oszlop mindig `Általános jelentkező`-t mutatott.
3. **360° Dolgozói Profil (`/hr/employee/[id]`) szabadságnap-számítás és dosszié-linkek:** A `LeaveTab.tsx` a szabadságkérelmek darabszámát (`.length`) vonta le az éves keretből a tényleges munkanapok összege helyett; a Kitüntetések, Fegyelmi és Tanulmányi szerződések füleken pedig az iktatószám jelvény `/dossiers?open=...`-ra mutatott `/dossiers/[id]` helyett.
4. **Szervezeti egység (`/hr/orgunit/[id]`) és Munkakör (`/hr/job/[id]`) dolgozó-hozzárendelés:** A részletoldalak dolgozó-hozzárendelő legördülő menüje más cégek dolgozóit is betöltötte.
5. **Önkiszolgáló (ESS) apróbb UX súrlódások:** A `LeaveRequestDialog` nem rendelkezett alapértelmezett szabadságtípussal; az `EmployeeKpiWidget` az önértékelés leadása után is `"2. Te jössz!"` jelvényt mutatott; a `Profilom` (`/hr/self-service/profile`) pedig nem vette figyelembe az Onboarding során rögzített `orvosi_alkalmassag_ervenyesseg` dátumot, ha még nem volt külön sor a `hr_orvosi_vizsgalat` táblában.

---

## 2. Decision (A Meghozott Döntés)

1. **Elutasítási indoklások teljes körű továbbítása:**
   - A `UnifiedApprovalsPanel` (`handleConfirmReject`) átadja a `rejectReason` szöveget a `rejectLeaveRequest` és `handleOvertimeApproval` akcióknak, amelyek megjelenítik azt a dolgozónak küldött `alkalmazas_ertesites` üzenetben és rögzítik a `hr_esemeny_naplo` táblában.
2. **Talent Pool reaktivitás és pozíció-megjelenítés:**
   - A `TalentPoolList` bekötésre került a `deleteCandidate` szerver akcióra és `router.refresh()` hívásra, a `/hr/recruitment` lekérdezés pedig betölti a kapcsolódó `hr_allashirdetes(cim)` és `hr_munkakor(megnevezes)` adatokat.
3. **360° Dolgozói Profil pontosítások:**
   - A `LeaveTab.tsx` a `calculateWorkingDays(kezdet_datuma, veg_datuma)` függvénnyel összegzi a tárgyévi jóváhagyott és függőben lévő munkanapokat, teljes összhangban a `/hr` főoldallal és a Megfelelőségi Hubbal.
   - Az `AwardsTab.tsx`, `DisciplinaryTab.tsx` és `StudyContractTab.tsx` iktatószám-jelvényei közvetlenül a `/dossiers/${item.ugyirat_id}` útvonalra navigálnak.
4. **Cég-szűrt Szervezeti egység és Munkakör részletoldalak:**
   - A `/hr/orgunit/[id]` és `/hr/job/[id]` részletoldalak csak az adott szervezeti egység / munkakör `company_id`-jához tartozó dolgozókat és szervezeti egységeket kínálják fel hozzárendelésre.
5. **ESS kényelmi és konzisztencia javítások:**
   - A `LeaveRequestDialog` alapértelmezett típusa `"szabadsag"` (Rendes szabadság).
   - Az `EmployeeKpiWidget` az önértékelés szövegének meglétekor `"2. Önértékelés leadva"` jelvényt jelenít meg.
   - A `/hr/self-service/profile` oldalon az orvosi alkalmasság érvényessége `orvosi?.ervenyesseg_datuma || adatlap?.orvosi_alkalmassag_ervenyesseg || null` fallbackkel töltődik be.
6. **Cégszintű Orvosi alkalmasság fül a Munkaügyi Megfelelőség (`/hr/compliance`) oldalon:**
   - A `/hr/compliance` oldal kiegészült egy 4. füllel (**`Orvosi alkalmasság`**, Mvt. 49. § (1) és 33/1998. NM rendelet), amely céges szinten összesíti az összes aktív munkavállaló foglalkozás-egészségügyi alkalmassági állapotát (4 kanonikus `KpiCard`, `TableToolbar` szűrőkkel és CSV exporttal, `PdfViewerDialog` előnézettel, közvetlen eaisyDocs személyi dosszié iktatással és helyi vizsgálat-rögzítő modállal).

---

## 3. Rationale (Indoklás)

A javítások biztosítják, hogy a HR vezetők és a munkavállalók minden nézetben (ESS főoldal, Profilom, 360° Dolgozói adatlap, Megfelelőségi Hub, Riportok, Szervezeti felépítés) pontosan ugyanazokat a számított munkanapokat, érvényességi dátumokat és cégre szűrt adatokat lássák, felesleges hibaüzenetek vagy oldal-újratöltési kényszer nélkül.

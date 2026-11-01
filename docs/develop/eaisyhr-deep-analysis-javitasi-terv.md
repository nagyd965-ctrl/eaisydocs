# [HR] eaisyHR Deep Analysis – Hibajavítási Feladatlista (Task List)

> **Dokumentum státusz:** Aktív javítási terv (20 / 22 feladat elvégezve, 2 nyitott)
> **Létrehozva:** 2026. október 27.
> **Hatókör:** `[HR]` és `[Közös]` (eaisyHR modul és eaisyDocs integrációs pontok)
> **Módszertan:** Pontról pontra történő javítás. Amint egy feladat elkészül és típusellenőrzéssel (`npx tsc --noEmit`) igazolt, a nyitott listából átkerül a dokumentum tetején lévő **Elkészült és Lezárt Javítások** blokkba `[x]` jelöléssel és áthúzással (`~~...~~`).

---

## ELKÉSZÜLT ÉS LEZÁRT JAVÍTÁSOK (20 / 22)

- [x] ~~**1. Szabadság PDF (`/api/hr/leave-pdf`) és Megfelelőségi Hub (`/hr/compliance`) `hr_tavollet.indoklas` oszlophiány javítása**~~
  - **Érintett fájl:** [`src/app/hr/compliance/compliance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/compliance/compliance-actions.ts#L74-L80)
  - **Megvalósítás:** A `hr_tavollet` táblában nem létező `indoklas` mező eltávolítva a `.select(...)` lekérdezésből, így a 14 napos egybefüggő pihenőidő (`Teljesítve` / `Betervezve`) és a kivett/tervezett szabadságnapok kalkulációja helyreállt.

- [x] ~~**3. Manuális beléptetés indítása (`createManualOnboarding`) `company_id` és `email` mentési hiba + fiókaktiválási hiba javítása**~~
  - **Érintett fájl:** [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts#L640-L725)
  - **Megvalósítás:** A `createManualOnboarding` mostantól elmenti az aktív `company_id`-t, és ha megadtak e-mail címet, létrehoz egy háttér `hr_toborzas` rekordot (`statusz: "elfogadva"`), amelyhez hozzáköti a `hr_onboarding.toborzas_id`-t. Így bármelyik cégnél indított manuális beléptetés megjelenik a listában, és a `Fiók aktiválása` gomb is hibamentesen működik.

- [x] ~~**4. Publikus karrieroldali jelentkezés (`submitApplication`) és új álláshirdetés (`ManagePostingDialog`) `company_id` hiányának javítása**~~
  - **Érintett fájlok:**
    - [`src/app/karrier/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/karrier/%5Bid%5D/actions.ts#L72-L120)
    - [`src/components/hr/manage-posting-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/manage-posting-dialog.tsx#L134-L142)
  - **Megvalósítás:** A `submitApplication` feloldja az álláshirdetéshez/munkakörhöz tartozó `company_id`-t és átadja a `hr_toborzas` valamint `hr_esemeny_naplo` beszúrásnak; a `ManagePostingDialog` pedig átadja a kiválasztott cég `selectedCompany.id` értékét, így nem csak az alapértelmezett `Think AI Kft.`-nél, hanem bármely más cégnél is működik.

- [x] ~~**5. Saját fiók véletlen kizárásának (Self-Ban) megakadályozása Offboarding lezárásakor (`closeOffboarding`)**~~
  - **Érintett fájl:** [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts#L458-L520)
  - **Megvalósítás:** A `closeOffboarding` ellenőrzi, hogy a kiléptetett dolgozó azonos-e a műveletet végző bejelentkezett felhasználóval (`offboarding.dolgozo_id === user.id`). Saját fiók esetén az eaisyHR szerepkör inaktiválása (`hr_szerepkor: "inaktiv"`) és a 100 éves Supabase Auth tiltás (`ban_duration: '876000h'`) kimarad, miközben a kiléptetés összes többi lépése (dokumentumok iktatása, státusz lezárása, audit naplózás) rendben lefut.

- [x] ~~**6. NAV T1041 és Onboarding munkakör lekérdezésben nem létező `felhasznalo_profil` oszlopok (`munkakor`, `reszleg`) javítása**~~
  - **Érintett fájlok:**
    - [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L147-L315)
    - [`src/app/hr/actions/onboarding-job-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/onboarding-job-actions.ts#L55-L84)
  - **Megvalósítás:** A nem létező `felhasznalo_profil(nev, munkakor, reszleg)` lekérdezések átírva a valós `id, nev, pozicio, hr_szervezeti_egyseg:hr_szervezeti_egyseg_id(nev)` oszlopokra, kiegészítve az aktív `hr_jogviszony -> hr_beosztas -> hr_munkakor` (`megnevezes`, `feor_kod`) feloldással.

- [x] ~~**7. Születési dátum oszlop-eltérés (`szuletesi_datum` vs `szuletesi_ido`) egységesítése a PDF generátorokban és T1041-ben**~~
  - **Érintett fájlok:**
    - [`src/utils/hr/medical-sheet-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/medical-sheet-pdf-generator.ts#L94-L155)
    - [`src/utils/hr/disciplinary-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/disciplinary-pdf-generator.ts#L103-L185)
    - [`src/utils/hr/study-contract-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/study-contract-pdf-generator.ts#L82-L160)
    - [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L170-L295)
    - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts#L1428-L1437)
    - [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts#L360-L370)
  - **Megvalósítás:** Minden PDF generátor lekérdezi mind a `szuletesi_datum`, mind a `szuletesi_ido` oszlopot (`szuletesi_datum || szuletesi_ido` fallbackkel), mentéskor pedig mindkét oszlop szinkronban frissül.

- [x] ~~**8. Bérszámfejtés (`/hr/payroll`) és Riportok (`/hr/reports`) szervezeti egység tábla (`hr_szervezeti_egyseg`) és részlegnév feloldás javítása**~~
  - **Érintett fájlok:**
    - [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts#L168-L176)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L68-L78)
  - **Megvalósítás:** Mind a `hr_szervezeti_egyseg`, mind a `szervezeti_egyseg` tábla betöltésre kerül az `orgMap`-be, a `downloadPayslipPdfAction` pedig a fix `"Munkatárs"` / `"Központi Osztály"` helyett dinamikusan feloldja a dolgozó valós munkakörét, FEOR kódját és részlegét.

- [x] ~~**9. Bérszámfejtés (`/hr/payroll`) és Riportok (`/hr/reports`) duplikált `hr_jogviszony` sorok szűrése (deduplikáció `dolgozo_id` alapján) és bérjegyzék PDF aktív jogviszony lekérdezés**~~
  - **Érintett fájlok:**
    - [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts#L198-L207)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L125-L135)
  - **Megvalósítás:** A `hr_jogviszony` lekérdezések `.order("kilepes_datuma", { ascending: false, nullsFirst: true }).order("belepes_datuma", { ascending: false })` rendezést kaptak, és a KSH/bérszámfejtési összesítések `dolgozo_id` alapján deduplikálnak, így az aktív jogviszony kerül előtérbe és egy dolgozó sosem duplázódik.

- [x] ~~**10. Napi becsekkolás (`toggleCheckIn`), jelenlét-korrekció és szabadság-rögzítés `company_id` mentése + `/hr` revalidáció**~~
  - **Érintett fájlok:**
    - [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts#L568-L584) (`toggleCheckIn`)
    - [`src/app/hr/attendance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/attendance-actions.ts#L683-L695) (`handleAttendanceCorrectionApproval`)
    - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts#L1628-L1650) (`hrSubmitLeaveRequest`)
  - **Megvalósítás:** Első becsekkoláskor és jelenlét-korrekció jóváhagyásakor mentésre kerül az aktív `company_id` a `hr_jelenlet` táblába (és lefut a `revalidatePath("/hr")`), a HR által rögzített szabadságnál (`hrSubmitLeaveRequest`) pedig bekerül a `company_id` a `hr_tavollet` táblába.

- [x] ~~**11. Riportok (`/hr/reports`) T1041, Cafeteria, KSH túlóra és Bevallás Archívum KPI hibák javítása**~~
  - **Érintett fájlok:**
    - [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L403-L426) (`saveT1041Record`)
    - [`src/app/hr/cafeteria-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/cafeteria-actions.ts#L83-L95) (`submitCafeteriaDeclaration`)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L465-L485) (`getKshReportData`)
    - [`src/components/hr/reports-tabs.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/reports-tabs.tsx#L636-L663) (`Bevallás Archívum` KPI kártyák)
  - **Megvalósítás:** `company_id` mentése a `hr_t1041_bejelentes` és `hr_cafeteria_valasztas` táblákba; a KSH túlóra lekérdezés átállítva a valós `hr_tulora_felhasznalás` táblára és a cég dolgozóira (`dolgozo_id IN (...)`); a `reports-tabs.tsx` Bevallás Archívum KPI kártyái pedig `(r.tipus || r.type || "")` alapján számolnak.

- [x] ~~**12. Kilépő igazolás (`Mt. 80. §`) betegszabadság lekérdezés és személyi dosszié archiválás javítása (`offboarding/actions.ts`)**~~
  - **Érintett fájl:** [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts#L506-L518)
  - **Megvalósítás:** A betegszabadság lekérdezés a valós `kezdet_datuma`, `veg_datuma` és `tipus IN ('beteg', 'betegszabadsag')` oszlopokat és munkanap-számítást (`countWorkdaysInYear`) használja; a személyi dosszié archiválása (`closeOffboarding`) és újranyitása (`reopenOffboarding`) pedig a `findEmployeeDossier` (`irat_kapcsolat`) segédfüggvényen keresztül történik.

- [x] ~~**13. Egyéni Fejlesztési Terv (`IDP`) tanúsítvány-jóváhagyás (`hr_dokumentum` oszlopnevek) és mentor-lekérdezés javítása**~~
  - **Érintett fájl:** [`src/app/hr/actions/idp-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/idp-actions.ts#L441-L654)
  - **Megvalósítás:** Az `approveDevelopmentGoal` mostantól a `hr_dokumentum` valós oszlopaival (`dolgozo_id, nev, kategoria, url, company_id`) és a `hr_kepzettseg.dokumentum_url` mezővel menti a jóváhagyott tanúsítványt; a `getCompanyMentorsAction` pedig a `hr_jogviszony -> hr_beosztas -> hr_munkakor` és `felhasznalo_profil.pozicio` alapján tölti be a mentorok munkakörét.

- [x] ~~**16. 360° Dolgozói Profil (`/hr/employee/[id]`) hibás ügyirat-linkjeinek (`/dossiers?open=...` -> `/dossiers/[id]`) javítása**~~
  - **Érintett fájlok:**
    - [`src/app/hr/employee/[id]/tabs/AwardsTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/AwardsTab.tsx#L373)
    - [`src/app/hr/employee/[id]/tabs/DisciplinaryTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/DisciplinaryTab.tsx#L389)
    - [`src/app/hr/employee/[id]/tabs/StudyContractTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/StudyContractTab.tsx#L335)
  - **Megvalósítás:** Az iktatott iratok jelvényei mostantól közvetlenül a `/dossiers/${item.ugyirat_id}` adatlapra navigálnak.

- [x] ~~**17. 360° Dolgozói Profil Szabadságok fül (`LeaveTab.tsx`) és ESS Főoldal (`/hr`) szabadságnap-számításának pontosítása**~~
  - **Érintett fájlok:**
    - [`src/app/hr/employee/[id]/tabs/LeaveTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/LeaveTab.tsx#L72-L103)
    - [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx#L61-L94)
  - **Megvalósítás:** A `LeaveTab.tsx` a kérelmek darabszáma (`.length`) helyett a tárgyévi munkanapok összegét (`calculateWorkingDays`) számolja mind a kártyákon, mind a táblázatban, a `/hr` főoldallal egységesen.

- [x] ~~**18. Talent Pool (`/hr/recruitment` -> Talent Pool fül) oldalsáv törlés/frissítés callbackek és pozíciónév bekötése**~~
  - **Érintett fájlok:**
    - [`src/components/hr/talent-pool-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/talent-pool-list.tsx#L21-L50)
    - [`src/app/hr/recruitment/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/page.tsx#L29-L33)
  - **Megvalósítás:** A `TalentPoolList` megkapta a `handleUpdateCandidate` és `handleDeleteCandidate` (`deleteCandidate` + `router.refresh()`) callbackeket, a `/hr/recruitment` lekérdezés pedig betölti a `hr_allashirdetes(cim)` és `hr_munkakor(megnevezes)` mezőket is.

- [x] ~~**15. Vezetői elutasítás indoklásának (`rejectReason`) átadása szabadság és túlóra elutasításakor (`/hr/manager`)**~~
  - **Érintett fájlok:**
    - [`src/components/hr/unified-approvals-panel.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/unified-approvals-panel.tsx#L265-L286)
    - [`src/app/hr/manager/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/actions.ts#L74-L153)
    - [`src/app/hr/attendance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/attendance-actions.ts#L572-L639)
  - **Megvalósítás:** A `handleConfirmReject` átadja a `rejectReason` szöveget a `rejectLeaveRequest` és `handleOvertimeApproval` akcióknak, amelyek rögzítik azt az audit naplóban (`hr_esemeny_naplo`) és a dolgozónak küldött értesítésben (`alkalmazas_ertesites`).

- [x] ~~**19. Szervezeti egység (`/hr/orgunit/[id]`) és Munkakör (`/hr/job/[id]`) részletoldalak aktív cégre (`company_id`) szűrése és `/login` redirect javítása**~~
  - **Érintett fájlok:**
    - [`src/app/hr/orgunit/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/orgunit/%5Bid%5D/page.tsx#L40-L125)
    - [`src/app/hr/job/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/job/%5Bid%5D/page.tsx#L27-L108)
  - **Megvalósítás:** Mindkét oldalon a `/auth/login` redirect `/login`-ra javítva, a hozzárendelhető dolgozók (`hr_dolgozo_adatlap`) és szervezeti egységek (`hr_szervezeti_egyseg`) lekérdezése pedig az adott egység / munkakör `company_id`-jára szűr.

- [x] ~~**20. Központi HR Audit Napló (`/hr/audit`) `company_id` mentések pótlása a HR szerver akciókban**~~
  - **Érintett fájlok:**
    - [`src/app/hr/recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts)
    - [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts)
    - [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts)
  - **Megvalósítás:** Minden `hr_esemeny_naplo` beszúrás megkapta az aktív `company_id`-t, így a `/hr/audit` oldal cégre szűrt táblázatában minden új toborzási, beléptetési, kiléptetési és riport esemény megjelenik.

- [x] ~~**21. Szabadság igénylő ablak (`LeaveRequestDialog`) alapértelmezett típusválasztás és ESS KPI Widget státuszfelirat javítása**~~
  - **Érintett fájlok:**
    - [`src/components/hr/leave-request-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-request-dialog.tsx#L35)
    - [`src/components/hr/employee-kpi-widget.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-widget.tsx#L25)
  - **Megvalósítás:** A `LeaveRequestDialog` alapértelmezett típusa `"szabadsag"` (Rendes szabadság) lett, az `EmployeeKpiWidget` pedig megkülönbözteti a `"2. Te jössz!"` és a `"2. Önértékelés leadva"` állapotot.

- [x] ~~**22. Orvosi alkalmassági érvényesség szinkronja a Profil oldal (`/hr/self-service/profile`) és a `hr_dolgozo_adatlap` között**~~
  - **Érintett fájl:** [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx#L65)
  - **Megvalósítás:** A `Profilom` oldalon az `orvosiErvenyesseg` a `hr_orvosi_vizsgalat` mellett fallbackként a `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` mezőt is figyelembe veszi (`orvosi?.ervenyesseg_datuma || adatlap?.orvosi_alkalmassag_ervenyesseg || null`).

---

## FENNÁLLÓ NYITOTT HIBÁK (2 / 22)

### I. KRITIKUS PRIORITÁS (P0 – Demó Blokkolók és Futásidejű Hibák)

- [ ] **2. Iktatott HR dokumentumok (`DocumentViewer` / `/api/pdf/[id]`) `403 Forbidden` hiba elhárítása HR szerepköröknél**
  - **Érintett fájl:**
    - [`src/app/api/pdf/[id]/route.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/pdf/%5Bid%5D/route.ts#L48-L106)
  - **Hiba leírása:** Amikor egy HR dokumentum beiktatásra kerül az eaisyDocs-ba (`minosites = 'bizalmas'`), a `/api/pdf/[id]` végpont csak a `profile.docs_szerepkor === 'admin'`, a saját dokumentum (`dolgozo_id === user.id`), illetve a `max_minosites` + Docs-os `szervezeti_egyseg_id` egyezést vizsgálja, a `hr_szerepkor`-t és a céges `company_members.hr_szerepkor`-t nem. Emiatt egy HR vezető (`hr_vezeto` / `hr_munkatars`) `403 Forbidden` hibát kap a dolgozók iktatott HR dokumentumainak megtekintésekor.
  - **Javítás:** A `/api/pdf/[id]/route.ts` jogosultság-ellenőrzésének kiegészítése: ha az irathoz `hr_dokumentum` tartozik (vagy a felhasználó az aktív cégben `admin`, `hr_vezeto`, `hr_munkatars`, `berugyi` jogosultsággal rendelkezik), a megtekintés engedélyezése.

---

### II. MAGAS PRIORITÁS (P1 – Adatbázis Konzisztencia, Multi-Company és Üzleti Logikai Hibák)

- [ ] **14. Cég-szintű HR jogosultság (`company_members.hr_szerepkor`) egységes ellenőrzése a Server Action-ökben**
  - **Érintett fájlok:**
    - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts)
    - [`src/app/hr/employee/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/page.tsx#L466)
    - [`src/app/hr/cafeteria-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/cafeteria-actions.ts)
    - [`src/app/hr/performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts)
    - [`src/app/hr/job/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/job/%5Bid%5D/page.tsx#L39)
  - **Hiba leírása:** Számos akció csak a globális `felhasznalo_profil.hr_szerepkor` mezőt ellenőrzi, figyelmen kívül hagyva a `getActiveCompanyMemberRolesServer()` cégszintű szerepkörét, a `/hr/employee/[id]/page.tsx` 466. sora pedig `currentHrRole` helyett `currentUserProfile?.hr_szerepkor`-t ad át az `EmploymentTab`-nak.
  - **Javítás:** A `getActiveCompanyMemberRolesServer` fallbackes ellenőrzésének bekötése és a `currentHrRole` átadása.

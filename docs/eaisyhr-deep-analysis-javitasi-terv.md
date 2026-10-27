# [HR] eaisyHR Deep Analysis – Hibajavítási Feladatlista (Task List)

> **Dokumentum státusz:** Aktív javítási terv (1 / 22 feladat elvégezve)
> **Létrehozva:** 2026. október 27.
> **Hatókör:** `[HR]` és `[Közös]` (eaisyHR modul és eaisyDocs integrációs pontok)
> **Módszertan:** Pontról pontra történő javítás. Amint egy feladat elkészül és típusellenőrzéssel (`npx tsc --noEmit`) igazolt, a listában `[x]` jelölést és áthúzást (`~~...~~`) kap.

---

## I. KRITIKUS PRIORITÁS (P0 – Demó Blokkolók és Futásidejű Hibák)

- [x] ~~**1. Szabadság PDF (`/api/hr/leave-pdf`) és Megfelelőségi Hub (`/hr/compliance`) `hr_tavollet.indoklas` oszlophiány javítása**~~ *(Kész – `compliance-actions.ts` 76. sorából a nem létező `indoklas` mező eltávolítva, a 14 napos szabály és a kivett napok kalkulációja helyreállt)*
  - **Érintett fájlok:**
    - [`src/app/api/hr/leave-pdf/route.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/hr/leave-pdf/route.ts#L33)
    - [`src/app/hr/compliance/compliance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/compliance/compliance-actions.ts#L76)
  - **Hiba leírása:** Az élő `public.hr_tavollet` táblában nem létezik `indoklas` oszlop. A `.select("..., indoklas")` lekérdezés PostgREST hibát dob, emiatt minden szabadságkérelem PDF letöltés `404 Szabadságkérelem nem található` hibával elhasal, a `/hr/compliance` első fülén (`Szabadságkiadás`) pedig minden dolgozónál `0 kivett nap` és `"14 napos szabály: Nem teljesült"` jelenik meg.
  - **Javítás:** Az `indoklas` mező eltávolítása a `hr_tavollet` `.select(...)` mezőlistájából mindkét fájlban (és a típus/objektum hivatkozások biztonságos fallbackelése).

- [ ] **2. Iktatott HR dokumentumok (`DocumentViewer` / `/api/pdf/[id]`) `403 Forbidden` hiba elhárítása HR szerepköröknél**
  - **Érintett fájl:**
    - [`src/app/api/pdf/[id]/route.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/pdf/%5Bid%5D/route.ts#L48-L106)
  - **Hiba leírása:** Amikor egy HR dokumentum beiktatásra kerül az eaisyDocs-ba (`minosites = 'bizalmas'`), a `/api/pdf/[id]` végpont csak a `profile.docs_szerepkor === 'admin'`, a saját dokumentum (`dolgozo_id === user.id`), illetve a `max_minosites` + Docs-os `szervezeti_egyseg_id` egyezést vizsgálja, a `hr_szerepkor`-t és a céges `company_members.hr_szerepkor`-t nem. Emiatt egy HR vezető (`hr_vezeto` / `hr_munkatars`) `403 Forbidden` hibát kap a dolgozók iktatott HR dokumentumainak megtekintésekor.
  - **Javítás:** A `/api/pdf/[id]/route.ts` jogosultság-ellenőrzésének kiegészítése: ha az irathoz `hr_dokumentum` tartozik (vagy a felhasználó az aktív cégben `admin`, `hr_vezeto`, `hr_munkatars`, `berugyi` jogosultsággal rendelkezik), a megtekintés engedélyezése.

- [ ] **3. Manuális beléptetés indítása (`createManualOnboarding`) `company_id` és `email` mentési hiba + fiókaktiválási hiba javítása**
  - **Érintett fájl:**
    - [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts#L198-L242) (`activateOnboardingAccount` és `createManualOnboarding` a 637–675. sorban)
  - **Hiba leírása:** A `createManualOnboarding` nem menti el a `company_id`-t (így a kártya nem jelenik meg a `/hr/onboarding` és `/hr/admin` oldalakon) és nem menti el az `email` címet (így a `Fiók aktiválása` gomb hibával leáll, ha nincs `toborzas_id`).
  - **Javítás:** A `getActiveCompanyIdServer()` által visszaadott `company_id` mentése a `hr_onboarding` rekordba, az `email` mentése (vagy `hr_toborzas` / onboarding mezőből történő feloldása az `activateOnboardingAccount`-ban), valamint a cég-szintű szerepkör ellenőrzés (`getActiveCompanyMemberRolesServer`) bekötése.

- [ ] **4. Publikus karrieroldali jelentkezés (`submitApplication`) és új álláshirdetés (`ManagePostingDialog`) `company_id` hiányának javítása**
  - **Érintett fájlok:**
    - [`src/app/karrier/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/karrier/%5Bid%5D/actions.ts#L73-L84)
    - [`src/components/hr/manage-posting-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/manage-posting-dialog.tsx#L134-L166)
    - [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx#L41-L43)
  - **Hiba leírása:**
    1. A `submitApplication` nem örökíti át a meghirdetett állás (`hr_allashirdetes.company_id`) cégazonosítóját az új `hr_toborzas` rekordba, így a jelentkező nem látszik a `/hr/recruitment` Kanban táblán.
    2. A `ManagePostingDialog` új álláshirdetés beszúrásakor nem adja át az aktív `company_id`-t, így oldalfrissítés után a hirdetés eltűnik.
  - **Javítás:** A `submitApplication`-ben a `hr_allashirdetes` táblából lekérdezni a `company_id`-t és beállítani a `hr_toborzas` insert-nél; a `ManagePostingDialog`-ban pedig az `useCompany()` contextből (`selectedCompany?.id`) átadni a `company_id`-t.

- [ ] **5. Saját fiók véletlen kizárásának (Self-Ban) megakadályozása Offboarding lezárásakor (`closeOffboarding`)**
  - **Érintett fájl:**
    - [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts#L466-L480)
  - **Hiba leírása:** A `closeOffboarding` ellenőrzés nélkül `inaktiv`-ra állítja a `hr_szerepkor`-t és 100 évre letiltja (`ban_duration: '876000h'`) a dolgozó Supabase Auth fiókját, még akkor is, ha a műveletet végző felhasználó saját magán teszteli a kiléptetést.
  - **Javítás:** Védelmi ellenőrzés beépítése: ha `offboarding.dolgozo_id === user.id`, a rendszer ne tiltsa ki a jelenleg bejelentkezett felhasználót az Auth-ból (vagy adjon egyértelmű figyelmeztetést/védelmet).

- [ ] **6. NAV T1041 és Onboarding munkakör lekérdezésben nem létező `felhasznalo_profil` oszlopok (`munkakor`, `reszleg`) javítása**
  - **Érintett fájlok:**
    - [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L150) (150. és 240. sor)
    - [`src/app/hr/actions/onboarding-job-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/onboarding-job-actions.ts#L58) (58. sor)
  - **Hiba leírása:** Mindkét fájl `.select("nev, munkakor, reszleg")` lekérdezést futtat a `felhasznalo_profil` táblán, ahol azonban nincs `munkakor` és `reszleg` oszlop (hanem `pozicio` és `hr_szervezeti_egyseg_id`). Emiatt a lekérdezés `null`-t ad vissza, és a dolgozó neve `"Munkavállaló"`-ra esik vissza.
  - **Javítás:** A `felhasznalo_profil` lekérdezések átírása létező oszlopokra (`id, nev, pozicio, hr_szervezeti_egyseg:hr_szervezeti_egyseg_id(nev)`).

---

## II. MAGAS PRIORITÁS (P1 – Adatbázis Konzisztencia, Multi-Company és Üzleti Logikai Hibák)

- [ ] **7. Születési dátum oszlop-eltérés (`szuletesi_datum` vs `szuletesi_ido`) egységesítése a PDF generátorokban és T1041-ben**
  - **Érintett fájlok:**
    - [`src/utils/hr/disciplinary-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/disciplinary-pdf-generator.ts#L106)
    - [`src/utils/hr/medical-sheet-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/medical-sheet-pdf-generator.ts#L96)
    - [`src/utils/hr/study-contract-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/study-contract-pdf-generator.ts#L85)
    - [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L162) (162. és 250. sor)
    - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts#L1429)
  - **Hiba leírása:** A `hr_dolgozo_adatlap` táblán a mentés `szuletesi_datum` oszlopba ír, míg a fenti generátorok csak a `szuletesi_ido` oszlopot olvassák, így Nagy Dániel és Kelemen Roberta születési ideje `"Nem rögzített"` lesz a PDF-eken.
  - **Javítás:** Mindkét oszlop lekérdezése (`szuletesi_datum, szuletesi_ido`) és `adatlap.szuletesi_datum || adatlap.szuletesi_ido` fallback használata, valamint mentéskor mindkét oszlop szinkronban tartása.

- [ ] **8. Bérszámfejtés (`/hr/payroll`) és Riportok (`/hr/reports`) szervezeti egység tábla (`hr_szervezeti_egyseg`) és részlegnév feloldás javítása**
  - **Érintett fájlok:**
    - [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts#L162-L167) (valamint 858–859. sor `downloadPayslipPdfAction`)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L69)
  - **Hiba leírása:** A lekérdezések az eaisyDocs-os `szervezeti_egyseg` táblát olvassák a `hr_szervezeti_egyseg` helyett, így az UUID-k nem egyeznek, és minden dolgozó részlege `"Központi Osztály"`-ként jelenik meg.
  - **Javítás:** Mind a `hr_szervezeti_egyseg`, mind a `szervezeti_egyseg` betöltése az `orgMap`-be, és a `downloadPayslipPdfAction`-ben a valós munkakör/részleg feloldása a fix `"Munkatárs"` / `"Központi Osztály"` helyett.

- [ ] **9. Bérszámfejtés (`/hr/payroll`) duplikált `hr_jogviszony` sorok szűrése (deduplikáció `dolgozo_id` alapján) és bérjegyzék PDF aktív jogviszony lekérdezés**
  - **Érintett fájlok:**
    - [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts#L183-L210)
    - [`src/utils/hr/payslip-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/payslip-pdf-generator.ts#L88-L96)
  - **Hiba leírása:** Ha egy dolgozónak több (korábban lezárt és egy aktív) `hr_jogviszony` rekordja van, a korábbi hónapokban többször jelenik meg a bérszámfejtési táblázatban, a `payslip-pdf-generator.ts` pedig nem az aktív (`kilepes_datuma IS NULL`) jogviszonyt preferálja.
  - **Javítás:** Dolgozónként (`dolgozo_id`) az aktív (vagy legutolsó releváns) jogviszony kiválasztása deduplikációval, a `payslip-pdf-generator.ts`-ben pedig `.order("kilepes_datuma", { ascending: false, nullsFirst: true })` alkalmazása.

- [ ] **10. Napi becsekkolás (`toggleCheckIn`), jelenlét-korrekció, túlóra-igénylés és szabadság-rögzítés `company_id` mentése + `/hr` revalidáció**
  - **Érintett fájlok:**
    - [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts#L548-L588) (`toggleCheckIn`)
    - [`src/app/hr/attendance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/attendance-actions.ts#L580-L695) (`requestOvertimeUsage` és jelenlét-korrekció jóváhagyás)
    - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts#L1626-L1635) (`hrSubmitLeaveRequest`)
  - **Hiba leírása:**
    1. A `toggleCheckIn` első becsekkoláskor nem hív `revalidatePath("/hr")`-t, és nem ment `company_id`-t a `hr_jelenlet` táblába (ezért a `/hr/payroll` és `/hr/reports` `.eq("company_id", activeCompanyId)` szűrése nem találja a jelenléteket).
    2. A `hrSubmitLeaveRequest` nem ment `company_id`-t és `munkanapok_szama`-t, így a HR profilon rögzített szabadság nem jelenik meg a `/hr/manager` oldalon.
  - **Javítás:** A `company_id` konsekvens mentése a `hr_jelenlet` és `hr_tavollet` táblákba, a `/hr/payroll` és `/hr/reports` jelenlét-lekérdezéseiben a dolgozó-lista (`dolgozo_id IN (...)`) alapú szűrés biztosítása, valamint `revalidatePath("/hr")` hozzáadása a `toggleCheckIn`-hez.

- [ ] **11. Riportok (`/hr/reports`) T1041, Cafeteria és KSH túlóra lekérdezési hibák javítása**
  - **Érintett fájlok:**
    - [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L342-L360) (`saveT1041Record`)
    - [`src/app/hr/cafeteria-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/cafeteria-actions.ts#L84-L90) (`submitCafeteriaDeclaration`)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L463-L466) (`getKshReportData`)
    - [`src/components/hr/reports-tabs.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/reports-tabs.tsx#L645-L655) (`Bevallás Archívum` KPI kártyák)
  - **Hiba leírása:**
    1. A `saveT1041Record` és a `submitCafeteriaDeclaration` nem ment `company_id`-t, így az újonnan generált T1041 és cafeteria nyilatkozatok nem jelennek meg a `/hr/reports` oldalon.
    2. A `reports-tabs.tsx` Bevallás Archívum fülén a KPI kártyák `r.type`-ra szűrnek `r.tipus` helyett, így mindig `0`-t mutatnak.
  - **Javítás:** `company_id` mentése a `hr_t1041_bejelentes` és `hr_cafeteria_valasztas` táblákba, a KSH túlóra lekérdezés javítása, valamint a `reports-tabs.tsx`-ben `r.tipus || r.type` használata.

- [ ] **12. Kilépő igazolás (`Mt. 80. §`) betegszabadság lekérdezés és személyi dosszié archiválás javítása (`offboarding/actions.ts`)**
  - **Érintett fájl:**
    - [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts#L483-L488) (valamint 564–569., 770–778. és 1391–1399. sor)
  - **Hiba leírása:**
    1. A betegszabadság lekérdezés nem létező `napok_szama` és `kezdet` oszlopokat használ a `kezdet_datuma`, `veg_datuma` és `tipus IN ('beteg', 'betegszabadsag')` helyett.
    2. Az ügyirat lezárás/újranyitás nem létező `ugyirat.munkavallalo_id` oszlopot kérdez le az `irat_kapcsolat` (`entitas_tipus = 'munkavallalo'`) helyett.
  - **Javítás:** A `hr_tavollet` oszlopneveinek és munkanap-számításának javítása, valamint a személyi dosszié feloldása az `irat_kapcsolat` táblán keresztül.

- [ ] **13. Egyéni Fejlesztési Terv (`IDP`) tanúsítvány-jóváhagyás (`hr_dokumentum` oszlopnevek) és mentor-lekérdezés javítása**
  - **Érintett fájl:**
    - [`src/app/hr/actions/idp-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/idp-actions.ts#L466-L476) (és 599–606. sor)
  - **Hiba leírása:**
    1. Az `approveDevelopmentGoal` nem létező `dokumentum_tipus`, `fajl_nev`, `feltoltes_ideje` oszlopokkal próbál beszúrni a `hr_dokumentum` táblába (`tipus`, `dokumentum_nev`, `url`, `company_id` helyett).
    2. A `getCompanyMentorsAction` közvetlenül a `hr_dolgozo_adatlap`-ból próbálja joinolni a `hr_beosztas`-t, ami a `hr_jogviszony`-hoz tartozik.
  - **Javítás:** A `hr_dokumentum` insert oszlopneveinek javítása, és a mentorok pozíciójának helyes lekérdezése (`felhasznalo_profil.pozicio` / `hr_jogviszony`).

- [ ] **14. Cég-szintű HR jogosultság (`company_members.hr_szerepkor`) egységes ellenőrzése a Server Action-ökben**
  - **Érintett fájlok:**
    - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts)
    - [`src/app/hr/employee/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/page.tsx#L466)
    - [`src/app/hr/cafeteria-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/cafeteria-actions.ts)
    - [`src/app/hr/performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts)
    - [`src/app/hr/job/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/job/%5Bid%5D/page.tsx#L39)
  - **Hiba leírása:** Számos akció csak a globális `felhasznalo_profil.hr_szerepkor` mezőt ellenőrzi, figyelmen kívül hagyva a `getActiveCompanyMemberRolesServer()` cégszintű szerepkörét, a `/hr/employee/[id]/page.tsx` 466. sora pedig `currentHrRole` helyett `currentUserProfile?.hr_szerepkor`-t ad át az `EmploymentTab`-nak.
  - **Javítás:** A `getActiveCompanyMemberRolesServer` fallbackes ellenőrzésének bekötése és a `currentHrRole` átadása.

---

## III. KÖZEPES PRIORITÁS (P2 – UI/UX, Navigációs és Nézet Konzisztencia Hibák)

- [ ] **15. Vezetői elutasítás indoklásának (`rejectReason`) átadása szabadság és túlóra elutasításakor (`/hr/manager`)**
  - **Érintett fájlok:**
    - [`src/components/hr/unified-approvals-panel.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/unified-approvals-panel.tsx#L258-L302)
    - [`src/app/hr/manager/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/actions.ts#L74-L134)
  - **Hiba leírása:** A `handleConfirmReject` bekéri az elutasítás indoklását (`rejectReason`), de a `rejectLeaveRequest(item.id)` és `handleOvertimeApproval` hívásoknak nem adja át.
  - **Javítás:** A `rejectReason` paraméter átadása a szerver akciónak és rögzítése az audit naplóban / értesítésben.

- [ ] **16. 360° Dolgozói Profil (`/hr/employee/[id]`) hibás ügyirat-linkjeinek (`/dossiers?open=...` -> `/dossiers/[id]`) javítása**
  - **Érintett fájlok:**
    - [`src/app/hr/employee/[id]/tabs/AwardsTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/AwardsTab.tsx#L373)
    - [`src/app/hr/employee/[id]/tabs/DisciplinaryTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/DisciplinaryTab.tsx#L389)
    - [`src/app/hr/employee/[id]/tabs/StudyContractTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/StudyContractTab.tsx#L337)
  - **Hiba leírása:** Az iktatott irat jelvényre kattintva `/dossiers?open=<uuid>` URL-re navigál, amit a `/dossiers` oldal nem kezel.
  - **Javítás:** A linkek átírása közvetlen `/dossiers/${ugyirat_id}` útvonalra (ahogy a `DocumentsTab.tsx`-ben szerepel).

- [ ] **17. 360° Dolgozói Profil Szabadságok fül (`LeaveTab.tsx`) és ESS Főoldal (`/hr`) szabadságnap-számításának pontosítása**
  - **Érintett fájlok:**
    - [`src/app/hr/employee/[id]/tabs/LeaveTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/LeaveTab.tsx#L78-L80) (és 417–420. sor)
    - [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx#L45-L86)
  - **Hiba leírása:** A `LeaveTab.tsx` a szabadságkérelmek darabszámát (`.length`) számolja a munkanapok összege helyett (így egy 17 napos szabadság `"Felhasznált: 1 nap"`-nak látszik). A `/hr` főoldal pedig nem szűr az aktuális évre.
  - **Javítás:** A tárgyévi munkanapok (`munkanapok_szama` vagy munkanap-kalkuláció) összegzése mindkét helyen.

- [ ] **18. Talent Pool (`/hr/recruitment` -> Talent Pool fül) oldalsáv törlés/frissítés callbackek és pozíciónév bekötése**
  - **Érintett fájlok:**
    - [`src/components/hr/talent-pool-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/talent-pool-list.tsx#L166-L219)
    - [`src/app/hr/recruitment/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/page.tsx#L29-L35)
  - **Hiba leírása:** A `TalentPoolList`-ben megnyitott `CandidateProfileSheet` nem kap `onDelete` propot és az `onUpdate` üres függvény, a pozíció oszlop pedig mindig `"Általános jelentkezés"`-t ír.
  - **Javítás:** Valós `onUpdate` (state frissítés + `router.refresh()`) és `onDelete` (`deleteCandidate`) bekötése a `TalentPoolList`-be, valamint a `hr_allashirdetes(cim)` megjelenítése.

- [ ] **19. Szervezeti egység (`/hr/orgunit/[id]`) és Munkakör (`/hr/job/[id]`) részletoldalak aktív cégre (`company_id`) szűrése és `/login` redirect javítása**
  - **Érintett fájlok:**
    - [`src/app/hr/orgunit/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/orgunit/%5Bid%5D/page.tsx#L40-L125)
    - [`src/app/hr/job/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/job/%5Bid%5D/page.tsx#L27-L100)
  - **Hiba leírása:** Mindkét oldal `/auth/login`-ra irányít át `/login` helyett, és a hozzárendelhető dolgozók / szervezeti egységek lekérdezése nem szűr az aktív cégre (`activeCompanyId`).
  - **Javítás:** A redirect javítása `/login`-ra, és `.eq("company_id", activeCompanyId)` szűrés alkalmazása.

- [ ] **20. Központi HR Audit Napló (`/hr/audit`) `company_id` mentések pótlása a HR szerver akciókban**
  - **Érintett fájlok:**
    - [`src/app/hr/recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts)
    - [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts)
    - [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts)
    - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts)
  - **Hiba leírása:** A `hr_esemeny_naplo` beszúrások több helyen nem adják át a `company_id`-t, ezért a `/hr/audit` oldal cégre szűrt táblázatában nem jelennek meg az új események.
  - **Javítás:** Az aktív `company_id` átadása a `hr_esemeny_naplo` insert hívásoknál.

- [ ] **21. Szabadság igénylő ablak (`LeaveRequestDialog`) alapértelmezett típusválasztás és ESS KPI Widget státuszfelirat javítása**
  - **Érintett fájlok:**
    - [`src/components/hr/leave-request-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-request-dialog.tsx#L35)
    - [`src/components/hr/employee-kpi-widget.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-widget.tsx#L25)
  - **Hiba leírása:**
    1. A `LeaveRequestDialog`-ban a `type` alapértelmezett értéke `""`, így ha a felhasználó nem nyúl a legördülőhöz, beküldéskor `"Minden mező kötelező"` hibát kap.
    2. Az `EmployeeKpiWidget` az önértékelés leadása után (`statusz === "onertekeles"`) is `"2. Te jössz!"` feliratot mutat a `"2. Önértékelés leadva"` helyett.
  - **Javítás:** A `LeaveRequestDialog`-ban `"alapszabadsag"` alapértelmezett típus beállítása, az `EmployeeKpiWidget`-ben pedig a pontos fázisfelirat megjelenítése.

- [ ] **22. Orvosi alkalmassági érvényesség szinkronja a Profil oldal (`/hr/self-service/profile`) és a `hr_dolgozo_adatlap` között**
  - **Érintett fájl:**
    - [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx#L40-L65)
  - **Hiba leírása:** A profil oldal csak a `hr_orvosi_vizsgalat` táblát olvassa, míg a becsekkolás és műszaktervező a `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` mezőt is figyeli.
  - **Javítás:** Fallback beépítése a profil oldalon (`orvosiVizsgalat?.ervenyesseg_vege || adatlap?.orvosi_alkalmassag_ervenyesseg`), hogy a megjelenített dátum mindig 100%-ban konzisztens legyen a megfelelőségi blokkolóval.

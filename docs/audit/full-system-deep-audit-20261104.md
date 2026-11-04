# eaisyDocs & eaisyHR — Teljes Körű Rendszeraudit és Készültségi Elemzés (Deep Analysis)

**Dátum:** 2026-11-04  
**Vizsgált ág:** `eaisyhr` (`0f5a301`)  
**TypeScript fordítás (`npx tsc --noEmit`):** 0 hiba  
**Vizsgálat hatóköre:**
1. **Közös Platform, Auth, Többcég-kezelés (`company_id`), Modul-izoláció (`docs` vs. `hr`), Management Dashboard (`/management`) és PostgreSQL RLS (`202611*` migrációk)**
2. **eaisyDocs** (mind a 9 funkcionális modul, Server Actionök, API végpontok, UI komponensek, `docs_modulok` / `docs_iras_modulok`)
3. **eaisyHR** (mind a 10 funkcionális modul, 36 `"use server"` fájl, 11 API végpont, 15 dolgozói profilfül, Self-Service, `hr_modulok` / `hr_iras_modulok`)

---

## 1. Vezetői Összefoglaló és Készültségi Százalékok (%)

| Rendszerrész / Program | Jelenlegi Készültség (%) | Célállapot a P0–P1 javítások után | Rövid értékelés |
| :--- | :---: | :---: | :--- |
| **eaisyHR Alkalmazás** | **86.8%** | **98%+** | Funkcionálisan rendkívül gazdag (10 modul, 15 fülös 360° profil, bérszámfejtés, jelenlét, műszak, ATS, megfelelőség, T1041/KSH riportok) és a 6 fázisú `requireHrWriteServer` védelem a legtöbb modulban él. Maradt azonban 4 helyen `isStrictAdmin` (`hrRole === "admin"`) frontend read-only megkerülés, 1 Self-Service jogosultság-kiterjesztés (`updateGeneralPersonalInfo`), 1 hibás oszlopnév (`helyettesitett_id`), 1 helyettesítés-lejárati bug és néhány `company_id` / munkaszüneti nap kalkulációs rés. |
| **eaisyDocs Alkalmazás** | **82.0%** | **98%+** | Az iratkezelési mag (érkeztetés, iktatás, 4-szem elvű selejtezés, SHA-256 audit, FTS kereső, AI kivonatolás) kiforrott. Ugyanakkor a `requireDocsAuthServer` szerepkör-alapú hívásaiban modulok közötti írási átszivárgás van, a `/inbox` oldalon a csak-olvasás felhasználó nem tudja megnyitni az iratokat, a `generateFromTemplate` PDF generátor összeomlik `ő`/`ű` betűknél, és néhány `partners`/`rules`/`tasks` actionből hiányzik a `requireDocsAuthServer` vagy a `company_id` szűrés. |
| **Közös Platform, Auth, `/management` & DB/RLS** | **74.5%** | **98%+** | A 3-szintű szerepkör modell és az Olvasás/Írás mátrix adatstruktúrája kiépült, de **4 kritikus (P0) biztonsági és adatbázis-hiba** található benne: (1) a `verifySuperadminUser` bármely ügyfélcég-admint beenged a `/management` felületre, (2) a `has_hr_write_access` SQL függvény egyetlen HR RLS policy-ba sincs bekötve, (3) a `handle_new_user()` triggerben enum-típuselírás van (`docs_szerepkor_enum` vs. `user_szerepkor`), és (4) a `company_members.role = 'admin'/'owner'` keresztbe ad jogosultságot a `docs` és `hr` modulok között. |
| **TELJES PLATFORM ÁTLAG** | **81.1%** | **98%+** | **A funkcionális építkezés ~95%-ban kész; a fennmaradó ~17%-nyi rés kizárólag célzott jogosultsági, RLS, `company_id` szűrési és kalkulációs hibajavításokból áll.** |

---

## 2. Modulonkénti Készültségi Mátrix

### 2.1. eaisyHR Modulok (Átlag: 86.8%)

| # | eaisyHR Modul | Készültség (%) | Fő erősségek | Fennmaradó javítandó pontok |
| :--- | :--- | :---: | :--- | :--- |
| 1 | **Állomány & 360° Dolgozói Profil** (`/hr/admin`, `/hr/employee/[id]`) | **86%** | 15 fülös profil, titkosított PII tároló, eaisyDocs dosszié-híd | `isStrictAdmin` felülírja a `hr_iras_modulok = []`-t (`src/app/hr/employee/[id]/page.tsx:86-92`, `src/app/hr/admin/page.tsx:201`); `updateGeneralPersonalInfo` `allowSelf: true` (`src/app/hr/employee/[id]/actions.ts:1687`); `PersonalDataTab` megtekintés/szerkesztés összemosás (`src/app/hr/employee/[id]/tabs/PersonalDataTab.tsx:87-155`) |
| 2 | **Szervezeti Felépítés & Munkakörök** (`/hr/organization`, `/hr/orgunit/[id]`, `/hr/job/[id]`) | **90%** | Interaktív organigram, munkaköri katalógus, verziózott leírások | `src/app/hr/organization/page.tsx:33-38` `isStrictAdmin = hrRole === "admin"` miatt a csak-olvasás HR admin látja a szerkesztőgombokat és a Jogosultságkezelés fület |
| 3 | **Munkaidő, Műszakbeosztás & Jóváhagyások** (`/hr/time`, `/hr/manager`) | **88%** | Heti műszaktervező, sablonok, havi zárás, Mt. szabadságmotor | `reassignPendingLeaves` írási ellenőrzés hiánya (`src/app/hr/dashboard-actions.ts:23-25`); helyettesítés-lejárati visszaadás felülírja a helyettes saját csapatát (`src/utils/hr/substitute-sync.ts:36-57`); `LeaveTab.tsx` ünnepnap-átadás hiánya |
| 4 | **Bérszámfejtés & Cafeteria** (`/hr/payroll`, `/hr/self-service/payroll`) | **82%** | Mt. 140–155. § pótlékok, SZJA/TB/SZOCHO, zárolás, PDF bérjegyzék | `hr_cafeteria_valasztas` és `hr_beosztas` `company_id` szűrés hiánya (`src/app/hr/payroll/actions.ts:191-299`); `downloadPayslipPdfAction` cég-ellenőrzés hiánya (`#L854-L883`); 0 jelenlét esetén 100%-os munkaidő fallback (`#L365-L368`) |
| 5 | **Teljesítményértékelés & IDP** (`/hr/performance`, `/hr/self-service/goals`) | **84%** | 5-lépéses KPI workflow, súlyozás, IDP tanúsítvány-iktatás | Nem létező `helyettesitett_id` oszlop (`src/utils/hr/performance-access.ts:57`); lezárt KPI módosítható (`src/app/hr/performance/actions.ts:105-180`); `performance/dashboard/page.tsx` a Docs `szervezeti_egyseg` táblát kérdezi le (`#L85`) |
| 6 | **Toborzás & Karrierportál** (`/hr/recruitment`, `/karrier`) | **91%** | ATS Kanban, AI hirdetés- és „Cégünkről” varázsló, belső ajánlás | `/api/hr/parse-cv` POST végponton hiányzik a `checkHrWriteAccess` (`src/app/api/hr/parse-cv/route.ts:10-15`) |
| 7 | **Be- és Kiléptetés (Onboarding / Offboarding & T1041)** | **85%** | Automatizált feladatok, Mt. kilépőigazolások, NAV T1041 XML/PDF | `fileExistingJobDescriptionDocument` `requireWrite: true` hiánya (`src/app/hr/actions/onboarding-job-actions.ts:672`); `getT1041Data` és `offboarding/actions.ts` `company_id` szűrés nélküli `adminClient` lekérdezések |
| 8 | **Munkaügyi Megfelelőség & EHS** (`/hr/compliance`) | **87%** | Mt. 48h/túlóra figyelés, munkavédelmi és orvosi mátrix | Az áthelyezett szombati munkanapokat (`athelye_munkanap = true`) munkaszüneti napnak tekinti (`src/app/hr/compliance/compliance-actions.ts:84-91`) |
| 9 | **Riportok & Hatósági Exportok** (`/hr/reports`) | **88%** | NAV T1041, KSH, bérfeladás CSV/XLSX/PDF, archívum | `getArchiveRecords` kihagyja a `"reports"` modult (`src/app/hr/reports/actions.ts:1108`); `getPayrollReportData` naptári napot számol munkanap helyett a szabadságoknál (`#L760-L762`) |
| 10 | **Dolgozói Önkiszolgáló (ESS) & Vezetői Hub** (`/hr/self-service/**`) | **87%** | Egységes önkiszolgáló portál, munkaidő-terminál, dokumentumok | `/api/hr/download-document` nem engedi letölteni a `hr_ceges_dokumentum` szabályzatokat és nem naplóz (`src/app/api/hr/download-document/route.ts:57-83`) |

---

### 2.2. eaisyDocs Modulok (Átlag: 82.0%)

| # | eaisyDocs Modul | Készültség (%) | Fő erősségek | Fennmaradó javítandó pontok |
| :--- | :--- | :---: | :--- | :--- |
| 1 | **Bejövő Sor & Iktatás** (`/inbox`, `/inbox/[id]`) | **86%** | AI metaadat-kinyerés, előzmény-párosítás, csatolmány-szétválasztás | Read-only felhasználó nem tudja megnyitni/előnézni a bejövő iratokat (`src/components/inbox-table-client.tsx:411-495`, `src/app/inbox/[id]/page.tsx:51-53`); `splitAttachmentToNewIrat` `"varakozik"` státuszt ír `"fuggoben"` helyett (`src/app/inbox/filing-actions.ts:1455`) |
| 2 | **Iktatókönyv & Ügyiratok** (`/dossiers`, `/dossiers/[id]`) | **84%** | Teljes életciklus, verziózás, kölcsönzés, válaszlevél-varázsló | `generateFromTemplate` WinAnsi `ő`/`ű` összeomlás (`src/app/dossiers/[id]/template-actions.ts:451-549`); `checkDossierWritePermission` `"inbox"`/`"archive"` kereszt-írási bypass (`src/app/dossiers/[id]/actions.ts:22-25`); hiányzó `company_id` több `esemeny_naplo` beszúrásnál |
| 3 | **Irattár & Selejtezés** (`/archive`) | **90%** | 4-szem elv, SHA-256 jegyzőkönyv, megőrzési idő validáció | `approveDisposal` a `pdfa_path` fájlt nem törli a Storage-ból (`src/app/archive/disposal-actions.ts:362-372`); read-only módban a kijelölő checkboxok aktívak (`src/components/archive-client.tsx:519-552`) |
| 4 | **Partnerek & Szerződések** (`/partners`, `/partners/[id]`) | **76%** | Kettős besorolás, AI szerződésgenerátor, eaisyBill szinkron | `src/app/partners/[id]/page.tsx:61-114` nem szűr `company_id`-ra; `syncEaisyBillPartnerInvoicesAction` (`#L506`) és `generateContractPdfPreviewAction` (`#L1091`) `requireDocsAuthServer` hiánya; `generate_erkeztetoszam` `p_company_id` hiánya (`src/app/partners/eaisybill-partner-actions.ts:696`) |
| 5 | **Részletes Kereső & Mentett Szűrők** (`/search`) | **91%** | Magyar FTS + hibrid keresés, XSS-biztos találati kivonat | `saveSearch`, `toggleSavedSearchAlert`, `deleteSavedSearch` nem végez írási ellenőrzést (`src/app/search/actions.ts:184-246`) |
| 6 | **Feladatok & Helyettesítés** (`/tasks`, `TasksTab`) | **72%** | Kanban, lista, naptár, 3-lépcsős feladatvarázsló | `TasksTab` sor-menü és checkbox nem nézi a `canEdit` propot (`src/components/tasks-tab.tsx:584-648`); `deleteTask`, `updateTaskStatus` és a sablon-actionök nem végeznek írási ellenőrzést (`src/app/tasks/task-actions.ts:44-349`); `helyettesites` `company_id` szűrés hiánya |
| 7 | **Központi Eseménynapló** (`/audit`) | **83%** | 3-oszlopos diff modál, vektor-zaj szűrés, értesítési napló | `src/app/audit/notification-audit-tab.tsx:707` `dangerouslySetInnerHTML` szanitizálás nélkül; read-only `audit` modulos `vezeto`/`munkavallalo` kizárva (`src/app/audit/actions.ts:114-117`) |
| 8 | **Szabályok & Beállítások** (`/rules`, `/settings`) | **74%** | Iktatási szabálymotor, 3-csatornás értesítések, szervezeti fa | `src/app/rules/filing-rules-actions.ts:91-286` nem szűr `company_id`-ra módosításkor/törléskor; `src/app/settings/settings-actions.ts:374-930` globálisan felülírja a `felhasznalo_profil` osztály/szerepkör mezőit többcéges tagnál; `substitution-actions.ts` guard hiánya |
| 9 | **API / Cron / IMAP / PDF** (`/api/*`, `src/utils/*`) | **85%** | Vízjelezés, UTF-8 levélgenerátor, cron időzítők, IMAP daemon | `src/app/api/pdf/convert/route.ts:14-45` jogosultság- és `company_id` ellenőrzés hiánya; `src/app/api/pdf/[id]/route.ts:463` minden megnyitáskor szinkron Gemini hívást futtat fotó-jellegű fájlneveknél |

---

### 2.3. Közös Platform, Auth, `/management` és Adatbázis/RLS (Átlag: 74.5%)

| # | Platform Terület | Készültség (%) | Fő erősségek | Fennmaradó javítandó pontok |
| :--- | :--- | :---: | :--- | :--- |
| 1 | **Autentikáció & Login** (`/login`, `/auth`) | **88%** | Kétmodulos munkaterület-választó, süti-ütközésmentes előellenőrzés, 2FA | `src/app/auth/set-password/page.tsx:97` mindig `"/"`-re irányít HR-only felhasználónál is |
| 2 | **Többcég-kezelés & Keresztmodul (`docs` vs. `hr`) Izoláció** | **68%** | Cégválasztó, céges számlálók, külön `docs_*` és `hr_*` oszlopok | `company_members.role = 'admin'/'owner'` keresztbe ad Docs Admin jogot HR-only usernek és HR Admin jogot Docs-only usernek (`src/utils/company-server.ts:144-157`, `src/utils/hr/company-role-resolver.ts:457-493`); `inviteCompanyMemberAction` felülírja meglévő user `elerheto_modulok` tömbjét (`src/app/actions/company-actions.ts:1271-1277`) |
| 3 | **Management Dashboard** (`/management`) | **72%** | Szuperadmin Control Center, tömeges eaisyBill import, R/W mátrix, Élő AI Figyelő | **P0:** `verifySuperadminUser` beengedi a normál ügyfélcég-adminokat (`docs_szerepkor === 'admin'` / `hr_szerepkor === 'admin'`) a `/management` felületre (`src/app/management/actions.ts:156-169`); `updateManagementUserAction` szerepkörváltáskor nem frissíti a `docs_modulok` tömböt (`#L1138-L1143`) |
| 4 | **Adatbázis & RLS Biztonság** (`202611*` migrációk) | **70%** | Cég-scoped RLS, 3-értékű `docs_szerepkor_enum`, `has_docs_write_access` | **P0:** `has_hr_write_access` egyetlen HR RLS policy-ba sincs bekötve (`supabase/migrations/20261104000005_docs_and_hr_read_write_permissions_matrix.sql:97-168`); `handle_new_user()` triggerben `szerepkor` (`user_szerepkor`) `docs_szerepkor_enum`-ként van castolva (`#L708`); `rendszer_beallitas` RLS policy `NULL` `company_id`-t ad át (`#L645`); `ugy_write_company` és `attach_irat_to_dossier_atomic` nem hív `has_docs_write_access`-t |

---

## 3. Részletes, Fájlszintű Hibajegyzék (P0 Kritikus és P1 Magas Prioritású Elemzés)

### 3.1. Közös Platform, `/management` és Adatbázis / RLS Hibák

1. **P0-1 — `/management` Szuperadmin megkerülhetőség (`src/app/management/actions.ts:136-184`):**
   - A `verifySuperadminUser` függvény az alábbi feltételt vizsgálja:
     ```ts
     const isRoleAdmin =
       profile?.szerepkor === "admin" ||
       profile?.szerepkor === "rendszergazda" ||
       profile?.docs_szerepkor === "admin" ||
       profile?.hr_szerepkor === "admin"
     ```
   - Mivel minden egycéges ügyfél-adminisztrátor `felhasznalo_profil` rekordjában `docs_szerepkor = 'admin'`, `hr_szerepkor = 'admin'` vagy `szerepkor = 'admin'` szerepel, bármely ügyfélcég adminja megnyithatja a `/management` felületet, és ott láthatja, szerkesztheti vagy törölheti az összes többi céget és felhasználót.
   - **Javítás:** A `profile?.szerepkor === "admin"`, `profile?.docs_szerepkor === "admin"` és `profile?.hr_szerepkor === "admin"` ágakat el kell távolítani a `verifySuperadminUser` függvényből (kizárólag `isAllowedEmail || hasManagementModule || profile?.szerepkor === "rendszergazda"` engedélyezhető).

2. **P0-2 — `handle_new_user()` trigger PostgreSQL enum típus-inkompatibilitás (`supabase/migrations/20261104000005_docs_and_hr_read_write_permissions_matrix.sql:682-718`):**
   - A `felhasznalo_profil.szerepkor` oszlop típusa `public.user_szerepkor`, míg a `felhasznalo_profil.docs_szerepkor` típusa `public.docs_szerepkor_enum`.
   - A `20261104000005` migrációban a `handle_new_user()` trigger mindkét oszlopba `::public.docs_szerepkor_enum` típust próbál beszúrni, ami PostgreSQL-ben típus-hibát (`column "szerepkor" is of type user_szerepkor but expression is of type docs_szerepkor_enum`) okoz új felhasználó regisztrációjakor.

3. **P0-3 — `public.has_hr_write_access` hiányzó RLS bekötése és SQL függvény-finomítások (`supabase/migrations/20261104000005_docs_and_hr_read_write_permissions_matrix.sql`):**
   - A `public.has_hr_write_access` függvény elkészült (`97–168. sor`), de egyetlen HR tábla `INSERT`/`UPDATE`/`DELETE`/`FOR ALL` RLS szabálya sem hívja meg (mind a `has_hr_module_access` olvasási függvényt hívja).
   - A `has_hr_write_access` (`146. sor`) előbb ellenőrzi a `v_cm_role IN ('owner', 'admin')` feltételt, mint a `v_has_hr_app` (`'hr' = ANY(elerheto_modulok)`) meglétét, és a `has_hr_module_access` (`20261101000001:9-64`) egyáltalán nem ellenőrzi az `elerheto_modulok` tömböt.
   - Az eaisyDocs táblák közül a `public.ugy` (`ugy_write_company`), `public.partner`, `public.selejtezes_csomag`, `public.ai_feladat_sor`, az allokációs táblák és a `public.attach_irat_to_dossier_atomic` RPC még nem használja a `has_docs_write_access` függvényt.
   - A `public.rendszer_beallitas` RLS policy (`20261104000005:644-657`) `NULL` `company_id`-t ad át a `get_effective_docs_role(NULL, auth.uid())` és `has_docs_write_access(ARRAY['settings'], NULL, auth.uid())` függvényeknek, felülírva a `20261104000003` migrációban bevezetett `:<company_uuid>` kulcs-alapú cégellenőrzést.
   - A `has_docs_write_access` (`81–82. sor`) és `has_hr_write_access` (`154. sor`) függvényekben külön-külön fut a `(read_modules && p_modules)` és `(write_modules && p_modules)` ellenőrzés, ahelyett, hogy egyazon modulra ellenőrizné a metszetet (`EXISTS (SELECT 1 FROM unnest(p_modules) m WHERE m = ANY(v_read) AND m = ANY(v_write))`).

4. **P0-4 — Keresztmodul (`docs` <-> `hr`) jogosultság-átszivárgás és `company-actions.ts` hiányosságok:**
   - `src/utils/company-server.ts:144-157` és `src/utils/hr/company-role-resolver.ts:450-515`: A `getActiveCompanyMemberRolesServer` maszkolja ugyan a `felhasznalo_profil` mezőit, ha `!hasDocsModule` vagy `!hasHrModule`, de a `company_members.role` (`"owner"` / `"admin"`), `docs_szerepkor`, `docs_modulok`, `docs_iras_modulok` mezőket maszkolatlanul adja át a `resolveUserCompanyRoles` függvénynek. Emiatt egy csak-HR-es cégadmin (`role = 'admin'`) teljes Docs Admin jogot kap, egy csak-Docs-os cégadmin pedig teljes HR Admin jogot kap.
   - `src/utils/docs-auth-guard.ts:71`: A `(!companyRoles.docsRole || companyRoles.docsRole === "none")` feltétel soha nem teljesül cégtagoknál, mert a `resolveUserCompanyRoles` alapértelmezetten `"munkavallalo"`-t ad vissza.
   - `src/app/actions/company-actions.ts:1271-1277` (`inviteCompanyMemberAction`): Meglévő felhasználó meghívásakor `isSelf === false` esetén felülírja a `felhasznalo_profil.elerheto_modulok` tömböt `[data.module]`-ra, törölve a felhasználó másik modulhoz (`hr` vagy `docs`) tartozó hozzáférését. Emellett nem állítja be explicit módon a `docs_iras_modulok` és `hr_iras_modulok` mezőket (ahogy az `updateCompanyMemberRoleAction` sem a `748–788. sorban`).
   - `src/app/management/actions.ts:1105-1106, 1138-1143` (`updateManagementUserAction`): Felhasználó szerkesztésekor a `normalizeDocsRoleAndModules(m.docs_szerepkor, prev?.docs_modulok, prev?.docs_iras_modulok)` megtartja a régi szerepkörhöz tartozó `prev.docs_modulok` tömböt akkor is, ha a szerepkör megváltozott (pl. `munkavallalo` -> `vezeto`), és HR-only felhasználónál is feltölti a `docs_modulok` oszlopot.

---

### 3.2. eaisyHR Részletes Megállapítások

1. **Frontend `isStrictAdmin` Read-Only megkerülés 3 oldalon + `PersonalDataTab`:**
   - `src/app/hr/employee/[id]/page.tsx:86-92`: Az `isStrictAdmin = scopedRoles.isCompanyAdmin || currentHrRole === "admin" || currentHrRole === "rendszergazda"` mindig `true`, ha a felhasználó `hr_szerepkor` értéke `admin`, `hr_vezeto` vagy `hr_munkatars` — még akkor is, ha `hr_iras_modulok = []` (Csak olvasás). Ugyanezen a helyen a `87. sorban` a `hasHrWriteAccess(currentHrRole, currentHrModules, currentHrWriteModules, "admin")` hívásból hiányzik az `"employees"` modul-kulcs.
   - `src/app/hr/organization/page.tsx:33-38, 155, 222-223`: Az `isStrictAdmin = hrRole === "admin"` miatt a csak-olvasás (`hr_iras_modulok = []`) HR adminnál a `canWriteOrg` és `isAdmin` is `true` marad.
   - `src/app/hr/admin/page.tsx:201, 599-600`: A `canManage = hrRole === "admin"` nem ellenőrzi a `canEdit` (`hasHrWriteAccess`) értéket, így a táblázatban aktív marad a szerepkör-módosítás és törlés.
   - `src/app/hr/employee/[id]/tabs/PersonalDataTab.tsx:87-155`: Egyetlen `isHrOrAdmin` prop vezérli a különleges adatok megtekintését („Felfedés”) és szerkesztését („Különleges Adatok Szerkesztése”), külön `canView` és `canEdit` prop helyett.

2. **Server Action és API végpont jogosultsági rések az eaisyHR-ben:**
   - `src/app/hr/employee/[id]/actions.ts:1686-1745` (`updateGeneralPersonalInfo`): `allowSelf: true` paraméterrel fut, így egy normál munkavállaló közvetlenül meghívva átírhatja a saját `szuletesi_datum`, `gyermekek_szama`, `megvaltozott_munkakepessegu` (akár +22 nap pótszabadság) és `orvosi_alkalmassag_ervenyesseg` mezőit.
   - `src/app/hr/dashboard-actions.ts:9-29` (`reassignPendingLeaves`): Csak olvasási jogosultságot (`isUserAuthorizedForHrView`) ellenőriz `hasHrWriteAccess` helyett.
   - `src/app/hr/actions/onboarding-job-actions.ts:672` (`fileExistingJobDescriptionDocument`): Hiányzik a `{ requireWrite: true }` opció a `verifyOnboardingJobAccess` hívásból.
   - `src/app/api/hr/parse-cv/route.ts:10-15`: A `POST` végpont csak `requireHrAuthServer`-t hív, `checkHrWriteAccess(auth, ["admin", "recruitment"])` nélkül.
   - `src/app/hr/employee/[id]/actions.ts:1598-1638` (`revealEmployeeSecretData`): Hiányzik a `requireHrAuthServer` + cég-ellenőrzés, valamint a `company_id` a `hr_esemeny_naplo` beszúrásból.
   - `src/app/hr/employee/[id]/actions.ts:24` (`hasHrOrDocsAdminProfile`) & `src/app/api/hr/download-document/route.ts:43`: A `docsRole === "admin"` feltétel HR jogosultságot ad egy csak-Docs adminnak.
   - `src/app/hr/reports/actions.ts:1108-1113` (`getArchiveRecords`): A `requireHrAuthServer(["payroll", "admin", "auditor"], null)` listából hiányzik a `"reports"` modul.

3. **Üzleti logikai, kalkulációs és multi-company hibák az eaisyHR-ben:**
   - `src/utils/hr/performance-access.ts:57` (`getManageableEmployeeIds`): A `hr_helyettesites` táblából a nem létező `helyettesitett_id` oszlopot kérdezi le `vezeto_id` helyett, így a helyettes vezetők nem látják a helyettesített csapat KPI-jait és IDP-it.
   - `src/utils/hr/substitute-sync.ts:36-57` & `src/app/hr/self-service/actions.ts:1182-1202`: A helyettesítés lejáratakor/kikapcsolásakor a `.update({ aktualis_jovahagyo_id: sub.vezeto_id }).eq("aktualis_jovahagyo_id", sub.helyettes_id)` nem szűr a `sub.vezeto_id` beosztottjaira, így a helyettes saját csapatának függő kérelmeit is átírja a másik vezetőre.
   - `src/app/hr/performance/actions.ts:105-180, 367-438`: Az `updateKpiProgress` és `addKpiSelfEvaluation` nem ellenőrzi, hogy a KPI (`workflow_fazis === "lezart"`) vagy az értékelési ciklus (`statusz === "lezart"`) le van-e már zárva.
   - `src/app/hr/performance/dashboard/page.tsx:68, 85`: A Docs-os `szervezeti_egyseg` táblát és `szervezeti_egyseg_id` mezőt kérdezi le a `hr_szervezeti_egyseg` és `hr_szervezeti_egyseg_id` helyett.
   - `src/app/hr/compliance/compliance-actions.ts:84-91, 169-191` (`runWorkTimeComplianceCheck`): Nem szűri ki az `athelye_munkanap = true` (ledolgozós szombati munkanap) rekordokat az ünnepnapok közül, így tévesen Mt. 101. § munkaszüneti napi szabálysértésnek jelöli a szombati munkanapokat.
   - `src/app/hr/payroll/actions.ts:191-368, 854-922`: Hiányzó `.eq("company_id", activeCompanyId)` a `hr_beosztas` (`191. sor`), `hr_cafeteria_valasztas` (`295. sor`) és `downloadPayslipPdfAction` (`854., 909. sor`) lekérdezésekben; továbbá `0` rögzített jelenlét esetén (`365–368. sor`) 100%-os ledolgozott munkaidőt feltételez.
   - `src/app/hr/reports/actions.ts:684-691, 760-762` (`getPayrollReportData`): A szabadságos napok számításánál naptári napokat (hétvégékkel együtt) számol a `munkanapok_szama` / `calculateWorkingDays` helyett.
   - `src/app/hr/actions/t1041-actions.ts:154, 264-318, 382-438`, `src/app/hr/offboarding/actions.ts:530-653, 996-1035, 1392-1401, 1728-1748`, `src/app/hr/employee/[id]/actions.ts:444-1564`: Hiányzó `company_id` szűrések több `adminClient` lekérdezésben és `executeHrDocumentFiling` hívásban.
   - `src/app/api/hr/download-document/route.ts:57-83`: Nem engedi letölteni a `hr_ceges_dokumentum` (vállalati szabályzatok) fájlokat munkavállalói jogosultsággal, és nem naplózza a letöltést a `hr_esemeny_naplo` táblába.

---

### 3.3. eaisyDocs Részletes Megállapítások

1. **`requireDocsAuthServer` modulok közötti írási átszivárgás (`src/utils/docs-auth-guard.ts:144-190`, `src/utils/hr/company-role-resolver.ts:566-629`):**
   - Amikor egy Server Action szerepkör-tömböt ad át a `requireDocsAuthServer`-nek explicit `DocsModuleKey` (`inbox`, `dossiers`, `archive`, `partners`, `tasks`, `rules`, `settings`) nélkül, az `explicitModuleKeys` üres marad, és az `isUserAuthorizedForDocsView` a felhasználó alapszerepköre (`munkavallalo`, `vezeto`) alapján engedélyezi az írást, ha a felhasználónak bármely más modulon van legalább 1 írási joga.
   - A `checkDossierWritePermission` (`src/app/dossiers/[id]/actions.ts:22-25`) és `checkVersionWritePermission` (`src/app/dossiers/[id]/version-actions.ts:23-26`) egyszerre sorolja fel a `["dossiers", "inbox", "archive"]` modulokat, így egy csak `inbox` írási joggal rendelkező (de `dossiers`-ben csak-olvasás) felhasználó módosíthatja az ügyiratokat.

2. **Hiányzó vagy csak-olvasási guardok az eaisyDocs Server Actionökben és API-kban:**
   - `src/app/partners/eaisybill-partner-actions.ts:113-335, 506-805`: A `getEaisyBillPartnersAction` és `syncEaisyBillPartnerInvoicesAction` nem hív `requireDocsAuthServer`-t, a `696. sorban` pedig a `generate_erkeztetoszam` RPC-ből hiányzik a `p_company_id: activeCompany.id` paraméter.
   - `src/app/tasks/task-actions.ts:44, 180, 319, 533-734`: Az `updateTaskStatus`, `rejectTask` és `deleteTask` `requireDocsAuthServer(undefined, ...)` (`isWriteCheck = false`) hívást használ, a feladatsablon-kezelő actionökből (`getTaskTemplates`, `createCustomTaskTemplate`, `updateCustomTaskTemplate`, `deleteCustomTaskTemplate`) pedig teljesen hiányzik a `requireDocsAuthServer`.
   - `src/app/settings/substitution-actions.ts:7-85`: A `createSubstitution` és `deleteSubstitution` nem hív `requireDocsAuthServer`-t.
   - `src/app/search/actions.ts:184, 203, 246`: A `saveSearch`, `toggleSavedSearchAlert`, `deleteSavedSearch` `requireDocsAuthServer(undefined, ...)` hívást használ írási ellenőrzés nélkül.
   - `src/app/partners/contract-actions.ts:47, 1091`: A `getContractTemplatesAction` és `generateContractPdfPreviewAction` nem hív `requireDocsAuthServer`-t.
   - `src/app/api/pdf/convert/route.ts:14-45`: Nem ellenőrzi a Docs hozzáférést, az írási jogot és az `irat.company_id`-t.

3. **Frontend Read-Only (`docsWriteModules = []`) és `company_id` hibák az eaisyDocs-ban:**
   - `/inbox` (`src/components/inbox-table-client.tsx:411, 435, 471`, `src/app/inbox/[id]/page.tsx:51-53`): Az `Eye` gyorsnézet gomb a `{canEdit && ...}` blokkban van, a sor-link pedig `/inbox/${item.id}`-ra visz, ahonnan a `/inbox/[id]/page.tsx` visszairányítja a read-only felhasználót a `/inbox`-ra (`/inbox/view/${item.id}` helyett).
   - `/audit` (`src/app/audit/actions.ts:114-117, 388-391`) és `/rules` (`src/app/rules/rules-guard.ts:10`): Írási ellenőrzést (`isWriteCheck = true`) követelnek meg az oldal betöltéséhez is, kizárva a csak-olvasás jogú `audit` és `rules` felhasználókat.
   - `TasksTab` (`src/components/tasks-tab.tsx:584-648, 809-830`) és `/tasks` (`src/app/tasks/page.tsx:261-292`): A feladat-státuszváltó checkbox és a sorvégi menü (beleértve a törlést) nem ellenőrzi a `canEdit` propot.
   - `src/app/rules/filing-rules-actions.ts:91, 193, 244, 278`: A `createCompanyFilingRule`, `updateCompanyFilingRule`, `toggleCompanyFilingRuleActive` és `deleteCompanyFilingRule` nem szűr `company_id`-ra.
   - `src/app/partners/[id]/page.tsx:61-114`: A partner és a hozzá tartozó iratok lekérdezéséből hiányzik a `.eq("company_id", activeCompanyId)`.
   - `src/app/dossiers/[id]/template-actions.ts:427-573` (`generateFromTemplate`): `StandardFonts.Helvetica` (WinAnsi) betűtípust használ, amely `ő`, `ű`, `Ő`, `Ű` karaktereknél futásidejű kivétellel összeomlik (átállítandó a `generateLetterPdfBuffer` UTF-8 generátorra).
   - `src/app/inbox/filing-actions.ts:1455` (`splitAttachmentToNewIrat`): `"varakozik"` státuszt ír az `ai_feladat_sor` táblába `"fuggoben"` helyett.
   - `src/app/audit/notification-audit-tab.tsx:707`: A `dangerouslySetInnerHTML` szanitizálás nélkül rendereli a `selectedLog.uzenet` HTML-t.

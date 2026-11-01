# eaisyHR Rendszerszintű Mélyelemzés — 2026. november 1. (2. kör, 33 javítás UTÁN)

> **Típus:** Deep Analysis audit (csak olvasó kódelemzés — a 2026.10.29-i audit 33 javítása UTÁNI állapot + Docs↔HR integrációs réteg teljes vizsgálata)
> **Hatókör:** a teljes eaisyHR modul + a Docs↔HR integrációs pontok (hr-filing-bridge, /api/pdf HR ága, T1041 ↔ irat, cégkezelés, szerepkör-feloldás, RLS-migrációk)
> **Módszer:** 4 párhuzamos, fájl:sor-pontosságú kódbukta­tás (portál/performance/műszak; admin/settings/karton; payroll/riport/compliance/toborzás/onboarding/offboarding; RLS/szerepkör/cégkezelés). **Élő teszt nem történt** — a P0-jelölteket javítás előtt érdemes manuálisan megerősíteni. A megrendelő korábbi elvetéseit tiszteletben tartva (l. 9. fejezet).
> **Előzmény:** `eaisyhr-deep-analysis-20261029.md` — **33 javított + 4 elvetett** találat. Ez a dokumentum NEM helyettesíti, hanem kiegészíti.

---

## 0. Vezetői összefoglaló — hol állunk most?

A 2026.10.29-i audit óta **33 javítás landott** — a settings-guard-sweep, a BUG-0 (toborzás/beléptetés szerepkör-törés), a teljes „szepe" bezárása (47 legacy lista), a multi-tenant adatbeszúrások javítása (önkiszolgáló oldalak cégesítése), a GDPR-csomag, az Mt. 126 § pontosság, a TAJ/adószám CDV-validáció és a Docs↔HR integrációs cég-ellenőrzések. Mindez visszaigazolva a kódban.

Ennek eredményeként:
- A **funkcionális törések** (BUG-0) megszűntek; a Jogosultsági Mátrix moduljai **valóban a saját modulra korlátoznak** a fő action-rétegben.
- Az **önkiszolgáló oldalak** cégesítve; a cégváltás valódi idejű; az Áttekintés oldal párhuzamosan tölt.
- A **GDPR toborzási lánc** (consent + tájékoztató + anonimizáló cron + CV-takarítás) kiépült.

Ugyanakkor a mélyebb 2. kör **új, korábban nem látott rétegeket** tárt fel:

1. **A `has_hr_module_access()` SQL-függvény NEM cég-scoped** — a moduljog bármelyik cégben szerzett tagságból/auth-ból globálisan érvényesül. Ez az összes RLS-védett tábla tényleges kockázatát meghatározza (a restrictive policy csak a tagságot szűri, a **jogot nem**).
2. **~30-40 „use server" action fut guard nélkül vagy csak login-checkkel** service-role klienssel — főleg a 360° karton fül-műveletei (orvosi, fegyelmi, kitüntetések, tanulmányi szerződések, IDP), a T1041-actionök, az onboarding-feladatok és az offboarding PDF-generátorok.
3. **A hr-filing-bridge egyetlen insertje sem ír company_id-t** — a HR-dossziék, iratok, iktatások NULL company_id-val keletkeznek (a Docs saját iktatása viszont írja).
4. **3 db tábla RLS-e `USING (true)`** — `hr_kituntetes` (mindenki ír!), `hr_berpapir` (kereszt-céges béradat!), `hr_elozo_munkahely` — a cég-dimenzió ezekről teljesen hiányzik.
5. **A globális profil-fallback lánc** (`felhasznalo_profil.hr_szerepkor`) miatt a globálisan admin/HR-es user minden cégnél, ahová csak tagként bekerült, teljes jogokat kap.

**Mért össz-érettség: ~72%** (a 2026.10.29-i ~84%-ról csökkent a mélyebb rétegek feltárása miatt). **Új találatok: ~8 P0, ~35 P1, ~30 P2.**

---

## 1. A 2026.10.29 ÓTA JAVÍTOTT 33 TALÁLAT VISSZAIGAZOLÁSA

Minden javítás a helyén van — l. a `eaisyhr-deep-analysis-20261029.md` ⭐ JAVÍTOTT táblázatát (#1-#33). Kiemelt visszaigazolások:
- BUG-0 (toborzás + beléptetés): ✔ `["recruitment"]` / `["onboarding"]` modulkulcsok működnek
- Szepe-lezárás (47 lista): ✔ a 6 fájlban nincs legacy elem
- Önkiszolgáló cégesítés: ✔ goals, IDP, payslips, time, /hr főoldal mind `.eq("company_id")`
- Állomány modul modell: ✔ UI (canChangeRole/canDelete) + szerveroldali őrblokkok
- GDPR csomag: ✔ consent napló + tájékoztató + cron + CV-takarítás
- Mt. 126 §: ✔ `countWorkdaysWithHolidays` + csak `betegszabadsag`
- TAJ/adószám CDV: ✔ `updateSecretData` validáció

---

## 2. ÚJ RENDSZERSZINTŰ GYÖKÉROKOK

### 2.1. [P0] `has_hr_module_access()` SQL — NEM cég-scoped

**Hol:** `20261028000005_sync_hr_rls_and_rpcs_with_module_permissions.sql:8-36`

A függvény **bármelyik cégben** szerzett tagságot/jogot elfogadja:
- `company_members` **bármely** cégben `role IN ('admin','owner')` → minden cég module-táblájához jog
- Globális `felhasznalo_profil.hr_modulok && p_modules` → cég-függő modulok globálisan érvényesülnek
- **Nincs korreláció a sor `company_id`-jával** — a restrictive policy AND- kapcsolatban csak a tagságot szűri, nem a jogot

**Következmény:** aki egy magáncégben owner lesz, **minden cég** HR-adataihoz hozzáfér az RLS-szinten. Ez az összes „RLS-védett" alábbi tétel tényleges kockázatát meghatározza.

### 2.2. [P0] 3 db tábla RLS-e nyitva

| Tábla | Policy | Következmény |
|---|---|---|
| `hr_kituntetes` | `USING (true)` FOR ALL | Bármely authenticated user minden cég kitüntetését írja/törli |
| `hr_berpapir` | Van company_id, de NINCS restrictive | Kereszt-céges béradat-kiolvasás (TAJ-közeli érzékenység) |
| `hr_elozo_munkahely` | Globális hr-szerepkör | Munkaviszony-előzmények kereszt-céges olvasása |

### 2.3. [P0] hr-filing-bridge — company_id nélküli insertek

**Hol:** `src/utils/hr-filing-bridge.ts` — **egyetlen insert sem ír company_id-t**

Az `ugy`, `ugyirat`, `irat`, `irat_kapcsolat`, `irat_fajl`, `esemeny_naplo`, `ai_feladat_sor` insertek NULL company_id-val keletkeznek → a HR-dossziék rossz RLS-hatókörbe kerülnek, a cég-listákban **elvesznek**, a Docs-oldali iktatások company_id-ja pedig nem egyezik a HR-oldalival.

### 2.4. [P0] Eszkalációs lánc: cégkezelés + globális profil-írás

- `updateCompanyMemberRoleAction`: `role` **futásidőben nem whitelist-elt** (`"owner"` is beírható), és a **globális** `felhasznalo_profil`-t is felülírja
- `inviteCompanyMemberAction`: meglévő más-céges user globális `hr_szerepkor`-át `'admin'`-ra írhatja
- `admin_update_user_profile` RPC: **cég-korlát nélkül** átírja bármely user globális szerepkörét
- A globális profil-fallback lánc miatt ezek a jogok **minden cégben** érvényesülnek

### 2.5. [P1] Globális profil-fallback a resolverben

`company-role-resolver.ts:267-274`: ha a `company_members` sorban nincs `hr_szerepkor`, a **globális** `felhasznalo_profil.hr_szerepkor` érvényesül → globálisan `admin` user minden cégnél, ahová sima tagként bekerült, teljes HR-admin lesz.

---

## 3. MODULONKÉNTI ÚJ TALÁLATOK (kivonat)

### 3.1. Dolgozói Portál + Performance + Műszak

**P1:** Korrekció-insert company_id nélkül (`submitAttendanceCorrection`); túlóra-visszavonás törött (`hr_tulora_felhasznalás`-on nincs company_id oszlop); HR-eszkaláció cross-tenant (jóváhagyó-keresés cég nélkül); referral CV-signed-URL kliens által diktált path-ra.

**P2:** Cafeteria widget `useState(initial)` anti-pattern (cégváltásnál beragad); TimeTrackingCard `internalCheckIn/Out` prop-szinkron hiányzik; UTC-dátum a becsekkolásnál (00:00-02:00 közötti becsekkolás előző napra ír); profile page jogviszony/orvosi/oktatás cég-szűrés nélkül; jelenlét-törlés RLS-blokkolta (DELETE policy hiányzik); hónapzárás-önjóváhagyás; műszak-actionök guard nélküliek; vezetői helyettesítő-választó cég-szűrés nélkül service-role-on.

### 3.2. Admin + Settings + Karton (360°)

**P0:** `getSignedCertificateUrl` — auth nélkül, tetszőleges path-ra signed URL; `addWorkplace`/`deleteWorkplace`/`addQualification`/`addStudyContract` stb. — **egyetlen auth-hívás sincs**, mögöttes RLS `USING (true)`.

**P1:** `createMunkakor`/`updateMunkakor`/`deleteMunkakor` guard nélküliek; `updateEmployeeInfo` cég-ellenőrzés nélkül a dolgozóra; `getCegesDokumentumokAdmin` guard + cég-szűrés nélkül (minden cég PII-leak); `updateEmployeePermissionsAction` cég-tagság-ellenőrzés nélkül; karton `isHrOrAdmin` globális legacy lista; `hasHrOrDocsAdminProfile` legacy lista (Docs↔HR iktatás); cafeteria admin-access legacy; `getCafeteriaExportData` guard + cég-szűrés nélkül (bérérzékeny); `assignEmployeeToOrgUnit` cég-ellenőrzés nélkül.

**P2:** `getQualificationFileUrl` path-kliensdiktálta; orvosi/fegyelmi/kitüntetés CRUD guard nélküli; `updateGeneralPersonalInfo` (születési adat, anyja neve!) csak login; Jogviszony-fül munkakör-lista cég-szűrés nélkül; Audit-fül a dolgozónak is látszik; `uploadJobDescription` guard nélkül; IDP CRUD guard nélkül; `downloadPayslipPdfAction` owner-ágon státusz-ellenőrzés nélkül (tervezet letölthető); `auth.admin.listUsers()` lapozás nélkül.

### 3.3. Payroll + Riportok + Compliance + Audit + Toborzás + Onboarding + Offboarding

**P0:** `getOnboardingJobData` teljesen auth nélkül (dolgozói nevek, pozíciók, belépési dátumok); `getT1041Data` cég/modul-ellenőrzés nélkül (TAJ, adójel, anyja neve); T1041 riport guard-ellenőrzés nélkül fut le (sima dolgozó is lekérheti).

**P1:** `generateCvSignedUrl` kliens által adott path-ra; `deleteCandidate`/`updateCandidateNote`/`updateJobPostingFlagsAction`/`saveJobPostingAction`(update)/`assignCandidateToPostingAction` cég-ellenőrzés nélkül; `checkApplicationStatusAction` e-mail-enumeráció (GDPR); 4 compliance getter guard nélkül (orvosi adat!); `closeOffboarding`/`reopenOffboarding`/`createOffboarding`/`getOffboardingDetailData` cég-ellenőrzés nélkül; `resetOffboardingTasks`/`fileSingleOffboardingDocument` admin-kliens + csak login; onboarding 4+4 action cég-ellenőrzés nélkül; T1041 actionök (save/generate/upload/file) cég/modul-ellenőrzés nélkül; `/api/pdf/[id]` HR ág cég-szűrés nélkül + fileId fallback IDOR.

### 3.4. RLS + Szerepkör + Cégkezelés

**P0:** 3 nyitva lévő tábla (kitüntetés, bérpapír, előző munkahely); `has_hr_module_access` nem cég-scoped; eszkalációs lánc (updateMemberRole + invite + RPC).

**P1:** `felhasznalo_profil` SELECT `USING (true)` (mindenki minden PII-ját látja); 5+ tábla company_id nélkül (tulora_felhasznalás, munkakor_leiras_verzio, onboarding_munkakor, elozo_munkahely, cafeteria_katalogus); `ertesites_naplo` cég-szűrés nélkül; resolver globális fallback; **maradtak legacy guard-listák** (a „minden cserélve" állítás nem teljes — l. P1-7).

**P2:** deleteCompanyAction audit-napló nélkül (naplók is törölődnek!); cookie nem httpOnly; `share_token` minden tagnak látszik; `/api/cron/imap` nincs ütemezve; reggeli SMS időzóna + hardcode; `hr_esemeny_naplo` insert `company_id` nélkül a cronokban; KPI-katalógus globális; `ertesitesi_szabaly` globális.

---

## 4. Docs↔HR INTEGRÁCIÓS AUDIT

### 4.1. A híd állapotta

**A funkcionális híd működik**: iktatás, dosszié-életciklus, aláírt-példány verziózás, pre-onboarding lánc, duplikáció-védelem, modul-elkülönítés ✔.

### 4.2. Találatok

| # | Súly | Hiba |
|---|---|---|
| 1 | **P0** | hr-filing-bridge: **egyetlen insert sem ír company_id-t** — minden HR-dosszié NULL céggel keletkezik |
| 2 | **P1** | /api/pdf/[id] HR ág: cég-szűrés sehol; a híd globálisan feloldott „HR" szervezeti egységhez bármely cég iktatója/auditorja hozzáfér |
| 3 | **P1** | /api/pdf/[id] fileId fallback: `.or(irat_id.eq.X, id.eq.Y)` — a fileId ág megkerüli az irat-kapcsolatot (IDOR) |
| 4 | **P1** | T1041-bejelentés iktatásakor a hr_esemeny_naplo-ba company_id nélkül íródik |
| 5 | P2 | Multi-company dolgozó: közös személyi dosszié (cég-dimenzió nélküli irat_kapcsolat) |
| 6 | P2 | hr_dokumentum company_id: sok insert nem írja |

---

## 5. RLS / TÁBLASZINTŰ ÖSSZEFOGLALÓ

| Tábla csoport | Cég-védett? | Megjegyzés |
|---|:---:|---|
| 35+ fő hr_* tábla (adatlap, jogviszony, jelenlet, távollét, túlóra_egyenleg, onboarding, offboarding, toborzás, teljesítmény, cafeteria, orvosi, fegyelmi, T1041, eseménynapló, stb.) | ✅ | restrictive + modul-policy — de a moduljog **nem cég-scoped** (2.1) |
| **hr_kituntetes** | ❌ | `USING (true)` — mindenki mindent |
| **hr_berpapir** | ❌ | Van company_id, de nincs restrictive |
| **hr_elozo_munkahely** | ❌ | Globális hr-szerepkör |
| hr_tulora_felhasznalás, hr_onboarding_munkakor, hr_munkakor_leiras_verzio, hr_munkakor_nyugtazas, hr_cafeteria_katalogus, hr_munkaszuneti_nap | ❌ | Nincs company_id oszlop |
| felhasznalo_profil (SELECT), ertesites_naplo, ertesitesi_szabaly, hr_kpi_katalogus | ❌ | Globális / cég-dimenzió nélkül |

---

## 6. ÖSSZESÍTŐ ÉRETTSÉGI MÁTRIX (2026.10.29 → 2026.11.01)

| Modul | 10.29 | **11.01** | Változás oka |
|---|:---:|:---:|---|
| Dolgozói Portál (/hr) | 84% | **86%** | párhuzamos + cégesítve + kérések 3 típus ✔; korrekció-időzóna ✔ |
| Profilom | 75% | **76%** | TAJ CDV ✔; jogviszony cég-szűrés hiányzik |
| Jelenlét (ESS) | 87% | **88%** | cégesítve ✔; korrekció-insert company_id hiányzik |
| Célkitűzések | 82% | **88%** | cégesítve ✔ + tulajdonos-védelem ✔ |
| Fejlődési Tervem | 79% | **86%** | cégesítve ✔ + státuszváltó védve ✔ |
| Bérpapírjaim | 87% | **90%** | cégesítve ✔ + cégváltás-realtime ✔ |
| Vezetői nézet | 74% | **78%** | cég-szűrés ✔; túlóra-tábla company_id nélkül |
| Teljesítményértékelés | 85% | **87%** | szepe-csere ✔ + ciklus-cég ✔ + tulajdonos ✔ |
| HR Munkaasztal | 87% | **84%** | őrblokkok ✔; createMunkakor/updateMunkakor guard nélkül |
| Szervezeti Felépítés | 86% | **84%** | Docs-osztály védelem ✔; orgunit cég-ellenőrzés hiányzik |
| Jogosultsági Mátrix | — | **80%** | admin-guard ✔; cég-tagság ellenőrzés hiányzik |
| 360° Karton | 79% | **75%** | cég-ellenőrzés ✔; 10+ fül-action guard nélkül |
| Műszakbeosztás | 80% | **80%** | action-guardok hiányoznak |
| Bérszámfejtés | 82% | **85%** | payroll-modul ✔ + cég ✔; on-the-fly ág legacy |
| Riportok | 80% | **78%** | őrblokkok ✔; T1041 action-ök nyitva |
| Compliance | 84% | **78%** | toggle ✔; 4 getter teljesen nyitva |
| Eseménynapló | 93% | **93%** | szűkítés ✔ |
| Toborzás | 89% | **85%** | modul ✔ + GDPR ✔; 6 action cég-ellenőrzés nélkül |
| Onboarding | 84% | **80%** | modul ✔; cég-ellenőrzések hiányoznak |
| Offboarding | 84% | **78%** | modul ✔ + Mt.126 ✔ + multi-company ✔; cég-ellenőrzések hiányoznak |
| Docs↔HR integráció | — | **65%** | bridge company_id nélkül; pdf-route HR ág nyitva |
| RLS/Szerepkör/Cégkezelés | — | **45%** | 3 nyitott tábla; has_hr_module_access nem cég-scoped; eszkalációs lánc |

**Átfogó: ~72%** — **Új találatok: ~8 P0, ~35 P1, ~30 P2.**

---

## 7. JAVÍTÁSI PRIORITÁSI SORREND (javaslat)

1. **`has_hr_module_access()` cég-scoped újraírása** (MIGRÁCIÓ) — ez a legnagyobb hozamú egyetlen lépés: az összes RLS-védett tábla tényleges cég-izolációját adja.
2. **Eszkalációs lánc elvágása** (KÓD): updateMemberRole + invite + RPC → whitelist + globális profil-írás tiltása.
3. **3 nyitott tábla RLS-migrációja** (MIGRÁCIÓ): hr_kituntetes, hr_berpapir, hr_elozo_munkahely.
4. **hr-filing-bridge company_id propagálása** (KÓD): minden insert kapja meg a hívó cégét.
5. **Karton fül-actionök guard-csomagja** (KÓD): ~15 action-re requireHrAuthServer.
6. **T1041 action-csomag** (KÓD): guard + cég-ellenőrzés.
7. **Offboarding cég-ellenőrzés-csomag** (KÓD): minden action-re company_id vs aktív cég.
8. **Toborzás cég-ellenőrzés-csomag** (KÓD): 6 action.
9. **Resolver globális fallback szűkítése** (KÓD).
10. **Compliance getterek + onboarding actionök guard-csomagja** (KÓD).
11. **Maradék legacy guard-listák cseréje** (KÓD).
12. **P2-csomag**: cafeteria widget szinkron, UTC-dátum, cookie httpOnly, cron ütemezések.

---

## 8. MEGJEGYZÉSEK

- Az elemzés nem módosított semmit a kódban.
- A megrendelő korábbi elvetéseit tiszteletben tartottuk: Lejárt generálás, sync gomb, realtime, belső-publikus, pótszabadság, túlóra-újrabirálat, orvosi/fegyelmi PDF-láthatóság, „admin" modulkulcs-ütközés (Roberta eset).
- A P0-jelölteket javítás előtt érdemes gyors manuális teszttel is megerősíteni.
- **A fő tanulság:** a cég-dimenzió (restrictive policy) és a moduljog (`has_hr_module_access`) **párhuzamosan él**, de utóbbi **globális** — a valódi cég-scoped jogosultságkezeléshez a DB-függvénynek is a sor cég-kontextusához kell kötődnie.
